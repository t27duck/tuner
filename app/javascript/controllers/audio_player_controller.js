import { Controller } from "@hotwired/stimulus"

// Persist audio state on window so it survives Turbo navigations
// (the Stimulus controller on <body> disconnects/reconnects each navigation)
function getPersistedState() {
  if (!window._tunerAudio) {
    window._tunerAudio = {
      audio: new Audio(),
      queue: [],
      currentIndex: -1,
      isExplicitQueue: false,
      shuffle: false,
      repeatMode: "off",
      shuffleOrder: [],
      shufflePosition: -1
    }
  }
  return window._tunerAudio
}

export default class extends Controller {
  static targets = ["mainContent", "playerBar", "playerSpacer", "playPauseBtn", "playPauseIcon",
                     "progressFill", "progressSlider", "currentTime", "durationDisplay",
                     "songTitle", "songArtist", "albumArt", "volumeSlider", "muteBtn",
                     "shuffleBtn", "repeatBtn"]

  connect() {
    const state = getPersistedState()
    this.audio = state.audio
    this.queue = state.queue
    this.currentIndex = state.currentIndex
    this.isExplicitQueue = state.isExplicitQueue || false
    this.isPlaying = !this.audio.paused && !!this.audio.src

    // Restore shuffle/repeat from persisted state, falling back to localStorage
    if (state.shuffle === undefined) {
      state.shuffle = localStorage.getItem("tuner-shuffle") === "true"
      state.repeatMode = localStorage.getItem("tuner-repeat") || "off"
      state.shuffleOrder = []
      state.shufflePosition = -1
    }
    this.shuffle = state.shuffle
    this.repeatMode = state.repeatMode
    this.shuffleOrder = state.shuffleOrder
    this.shufflePosition = state.shufflePosition

    // Bind audio events (remove old ones first to avoid duplicates)
    this._timeUpdate = () => this._onTimeUpdate()
    this._loadedMetadata = () => this._onLoadedMetadata()
    this._ended = () => this._onEnded()
    this._play = () => this._onPlay()
    this._pause = () => this._onPause()

    this.audio.removeEventListener("timeupdate", this.audio._tunerTimeUpdate)
    this.audio.removeEventListener("loadedmetadata", this.audio._tunerLoadedMetadata)
    this.audio.removeEventListener("ended", this.audio._tunerEnded)
    this.audio.removeEventListener("play", this.audio._tunerPlay)
    this.audio.removeEventListener("pause", this.audio._tunerPause)

    this.audio.addEventListener("timeupdate", this._timeUpdate)
    this.audio.addEventListener("loadedmetadata", this._loadedMetadata)
    this.audio.addEventListener("ended", this._ended)
    this.audio.addEventListener("play", this._play)
    this.audio.addEventListener("pause", this._pause)

    this.audio._tunerTimeUpdate = this._timeUpdate
    this.audio._tunerLoadedMetadata = this._loadedMetadata
    this.audio._tunerEnded = this._ended
    this.audio._tunerPlay = this._play
    this.audio._tunerPause = this._pause

    this._boundKeydown = this._onKeydown.bind(this)
    document.addEventListener("keydown", this._boundKeydown)

    // Restore volume from localStorage
    const savedVolume = localStorage.getItem("tuner-volume")
    if (savedVolume !== null) {
      this.audio.volume = parseFloat(savedVolume)
    }
    if (this.hasVolumeSliderTarget) this.volumeSliderTarget.value = this.audio.volume * 100

    // Restore player UI if audio is active
    if (this.audio.src) {
      this._showPlayer()
      this._updatePlayPauseIcon()
      if (this.audio.duration) this._onLoadedMetadata()
    }

    // Restore shuffle/repeat button styling
    this._updateShuffleBtn()
    this._updateRepeatBtn()
  }

  disconnect() {
    document.removeEventListener("keydown", this._boundKeydown)
    // Do NOT pause or clear audio — it must survive navigation
  }

  mainContentTargetConnected() {
    if (!this.audio) return
    if (this.audio.src) {
      this._addPlayerPadding()
      this._updateNowPlayingRow()
    }
  }

  playFromRow(event) {
    const row = event.currentTarget.closest("tr[data-song-id]")
    if (!row) return

    const song = {
      id: row.dataset.songId,
      title: row.dataset.songTitle,
      artist: row.dataset.songArtist,
      streamUrl: row.dataset.songStreamUrl,
      albumArtUrl: row.dataset.songAlbumArtUrl
    }

    if (this.isExplicitQueue) {
      // If there's an explicit queue, insert after current and play it
      this.currentIndex++
      this.queue.splice(this.currentIndex, 0, song)
    } else {
      // No explicit queue — just play this single song
      this.queue = [song]
      this.currentIndex = 0
    }
    this._syncState()
    this._loadAndPlay(song)
    if (this.isExplicitQueue) this._dispatchQueueChanged()
  }

  playNext(event) {
    const songs = this._parseSongData(event)
    if (!songs.length) return

    this.isExplicitQueue = true
    if (this.queue.length === 0) {
      this.queue = songs
      this.currentIndex = 0
      this._regenerateShuffleOrder()
      this._syncState()
      this._loadAndPlay(this.queue[0])
    } else {
      this.queue.splice(this.currentIndex + 1, 0, ...songs)
      this._regenerateShuffleOrder()
      this._syncState()
    }
    this._dispatchQueueChanged()
    this._showToast(`${songs.length === 1 ? `"${songs[0].title}"` : `${songs.length} songs`} added to play next`)
  }

  addToQueue(event) {
    const songs = this._parseSongData(event)
    if (!songs.length) return

    this.isExplicitQueue = true
    if (this.queue.length === 0) {
      this.queue = songs
      this.currentIndex = 0
      this._regenerateShuffleOrder()
      this._syncState()
      this._loadAndPlay(this.queue[0])
    } else {
      this.queue.push(...songs)
      this._regenerateShuffleOrder()
      this._syncState()
    }
    this._dispatchQueueChanged()
    this._showToast(`${songs.length === 1 ? `"${songs[0].title}"` : `${songs.length} songs`} added to queue`)
  }

  removeFromQueue(event) {
    const index = event.detail.index
    if (index === undefined || index === this.currentIndex) return
    this.queue.splice(index, 1)
    if (index < this.currentIndex) {
      this.currentIndex--
    }
    this._regenerateShuffleOrder()
    this._syncState()
    this._dispatchQueueChanged()
  }

  reorderQueue(event) {
    const { oldIndex, newIndex } = event.detail
    if (oldIndex === undefined || newIndex === undefined) return
    const [moved] = this.queue.splice(oldIndex, 1)
    this.queue.splice(newIndex, 0, moved)

    if (this.currentIndex === oldIndex) {
      this.currentIndex = newIndex
    } else if (oldIndex < this.currentIndex && newIndex >= this.currentIndex) {
      this.currentIndex--
    } else if (oldIndex > this.currentIndex && newIndex <= this.currentIndex) {
      this.currentIndex++
    }
    this._regenerateShuffleOrder()
    this._syncState()
    this._dispatchQueueChanged()
  }

  clearQueue() {
    this.queue = []
    this.currentIndex = -1
    this.isExplicitQueue = false
    this.shuffleOrder = []
    this.shufflePosition = -1
    this.audio.pause()
    this.audio.src = ""
    this._syncState()
    if (this.hasPlayerBarTarget) {
      this.playerBarTarget.classList.add("translate-y-full")
    }
    if (this.hasPlayerSpacerTarget) {
      this.playerSpacerTarget.classList.add("hidden")
    }
    this._dispatchQueueChanged()
    this._announce("Queue cleared")
  }

  playAll() {
    const rows = document.querySelectorAll("tr[data-song-id], div[data-song-id]")
    const songs = Array.from(rows).filter(row => row.offsetParent !== null).map(row => ({
      id: row.dataset.songId,
      title: row.dataset.songTitle,
      artist: row.dataset.songArtist,
      streamUrl: row.dataset.songStreamUrl,
      albumArtUrl: row.dataset.songAlbumArtUrl
    }))
    if (!songs.length) return

    this.isExplicitQueue = true
    this.queue = songs
    this.currentIndex = 0
    this._regenerateShuffleOrder()
    this._syncState()
    this._loadAndPlay(this.queue[0])
    this._dispatchQueueChanged()
    this._announce("Playing all songs")
  }

  addPlaylistToQueue() {
    const rows = document.querySelectorAll("tr[data-song-id], div[data-song-id]")
    const songs = Array.from(rows).filter(row => row.offsetParent !== null).map(row => ({
      id: row.dataset.songId,
      title: row.dataset.songTitle,
      artist: row.dataset.songArtist,
      streamUrl: row.dataset.songStreamUrl,
      albumArtUrl: row.dataset.songAlbumArtUrl
    }))
    if (!songs.length) return

    this.isExplicitQueue = true
    if (this.queue.length === 0) {
      this.queue = songs
      this.currentIndex = 0
      this._regenerateShuffleOrder()
      this._syncState()
      this._loadAndPlay(this.queue[0])
    } else {
      this.queue.push(...songs)
      this._regenerateShuffleOrder()
      this._syncState()
    }
    this._dispatchQueueChanged()
    this._showToast(`${songs.length} songs added to queue`)
  }

  togglePlay() {
    if (!this.audio.src) return
    if (this.audio.paused) {
      this.audio.play()
    } else {
      this.audio.pause()
    }
  }

  next() {
    if (this.queue.length === 0) return

    if (this.shuffle) {
      if (this.shufflePosition < this.shuffleOrder.length - 1) {
        this.shufflePosition++
        this.currentIndex = this.shuffleOrder[this.shufflePosition]
      } else if (this.repeatMode === "all") {
        this._generateShuffleOrder()
        this.shufflePosition = 0
        this.currentIndex = this.shuffleOrder[0]
      } else {
        return // end of shuffled queue, no repeat
      }
    } else {
      if (this.currentIndex < this.queue.length - 1) {
        this.currentIndex++
      } else if (this.repeatMode === "all") {
        this.currentIndex = 0
      } else {
        return // end of queue, no repeat
      }
    }

    this._syncState()
    this._loadAndPlay(this.queue[this.currentIndex])
    if (this.isExplicitQueue) this._dispatchQueueChanged()
  }

  previous() {
    if (this.queue.length === 0) return
    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0
      return
    }

    if (this.shuffle) {
      if (this.shufflePosition > 0) {
        this.shufflePosition--
        this.currentIndex = this.shuffleOrder[this.shufflePosition]
      } else {
        this.audio.currentTime = 0
        return
      }
    } else {
      if (this.currentIndex > 0) {
        this.currentIndex--
      } else {
        this.audio.currentTime = 0
        return
      }
    }

    this._syncState()
    this._loadAndPlay(this.queue[this.currentIndex])
    if (this.isExplicitQueue) this._dispatchQueueChanged()
  }

  seek(event) {
    if (!this.audio.duration) return
    event.stopPropagation()
    const rect = this.progressSliderTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    this.audio.currentTime = ratio * this.audio.duration
  }

  progressKeydown(event) {
    if (!this.audio.duration) return
    const step = 5
    if (event.key === "ArrowRight") {
      event.preventDefault()
      this.audio.currentTime = Math.min(this.audio.duration, this.audio.currentTime + step)
    } else if (event.key === "ArrowLeft") {
      event.preventDefault()
      this.audio.currentTime = Math.max(0, this.audio.currentTime - step)
    }
  }

  setVolume(event) {
    const vol = parseFloat(event.currentTarget.value) / 100
    this.audio.volume = vol
    this.audio.muted = false
    localStorage.setItem("tuner-volume", vol)
    this._updateMuteIcon()
  }

  toggleMute() {
    this.audio.muted = !this.audio.muted
    this._updateMuteIcon()
  }

  toggleShuffle() {
    this.shuffle = !this.shuffle
    if (this.shuffle) {
      this._generateShuffleOrder()
      // Place current song at position 0 of shuffle order
      if (this.currentIndex >= 0) {
        const idx = this.shuffleOrder.indexOf(this.currentIndex)
        if (idx > 0) {
          this.shuffleOrder.splice(idx, 1)
          this.shuffleOrder.unshift(this.currentIndex)
        }
        this.shufflePosition = 0
      }
    } else {
      this.shuffleOrder = []
      this.shufflePosition = -1
    }
    localStorage.setItem("tuner-shuffle", this.shuffle)
    this._syncState()
    this._updateShuffleBtn()
    this._announce(`Shuffle ${this.shuffle ? "on" : "off"}`)
  }

  cycleRepeat() {
    const modes = ["off", "all", "one"]
    const nextIndex = (modes.indexOf(this.repeatMode) + 1) % modes.length
    this.repeatMode = modes[nextIndex]
    localStorage.setItem("tuner-repeat", this.repeatMode)
    this._syncState()
    this._updateRepeatBtn()
    const labels = { off: "off", all: "all", one: "one" }
    this._announce(`Repeat: ${labels[this.repeatMode]}`)
  }

  // Private

  _syncState() {
    const state = getPersistedState()
    state.queue = this.queue
    state.currentIndex = this.currentIndex
    state.isExplicitQueue = this.isExplicitQueue
    state.shuffle = this.shuffle
    state.repeatMode = this.repeatMode
    state.shuffleOrder = this.shuffleOrder
    state.shufflePosition = this.shufflePosition
  }

  _loadAndPlay(song) {
    this.audio.src = song.streamUrl
    this.audio.play()
    this._showPlayer()
    this._updatePlayerDisplay(song)
    this._updateNowPlayingRow()
    this._announce(`Now playing: ${song.title} by ${song.artist}`)
  }

  _parseSongData(event) {
    const detail = event.detail || {}
    if (detail.songs) return detail.songs
    if (detail.song) return [detail.song]
    return []
  }

  _dispatchQueueChanged() {
    this.element.dispatchEvent(new CustomEvent("audio-player:queueChanged", {
      bubbles: true,
      detail: { queue: this.queue, currentIndex: this.currentIndex }
    }))
  }

  _showToast(message) {
    const container = document.getElementById("toast-container")
    if (!container) return
    const toast = document.createElement("div")
    toast.setAttribute("data-controller", "toast")
    toast.className = "px-4 py-2 bg-green-900/80 text-green-300 rounded border border-green-800 shadow-lg transition-all duration-300"
    toast.textContent = message
    container.appendChild(toast)
    this._announce(message)
  }

  _showPlayer() {
    if (this.hasPlayerBarTarget) {
      this.playerBarTarget.classList.remove("translate-y-full")
      this._addPlayerPadding()
    }
  }

  _addPlayerPadding() {
    if (this.hasPlayerSpacerTarget) {
      this.playerSpacerTarget.classList.remove("hidden")
    }
  }

  _updatePlayerDisplay(song) {
    if (this.hasSongTitleTarget) this.songTitleTarget.textContent = song.title
    if (this.hasSongArtistTarget) this.songArtistTarget.textContent = song.artist
    if (this.hasAlbumArtTarget) {
      this.albumArtTarget.src = song.albumArtUrl
      this.albumArtTarget.alt = `Album art for ${song.title} by ${song.artist}`
    }
  }

  _updateNowPlayingRow() {
    document.querySelectorAll("tr[data-now-playing]").forEach(r => r.removeAttribute("data-now-playing"))
    if (this.queue.length > 0 && this.currentIndex >= 0) {
      const currentSong = this.queue[this.currentIndex]
      const row = document.querySelector(`tr[data-song-id="${currentSong.id}"]`)
      if (row) row.setAttribute("data-now-playing", "true")
    }
  }

  _onTimeUpdate() {
    if (!this.audio.duration) return
    const ratio = this.audio.currentTime / this.audio.duration
    if (this.hasProgressFillTarget) this.progressFillTarget.style.width = `${ratio * 100}%`
    if (this.hasCurrentTimeTarget) this.currentTimeTarget.textContent = this._formatTime(this.audio.currentTime)
    if (this.hasProgressSliderTarget) {
      this.progressSliderTarget.setAttribute("aria-valuenow", Math.round(this.audio.currentTime))
    }
  }

  _onLoadedMetadata() {
    if (this.hasDurationDisplayTarget) this.durationDisplayTarget.textContent = this._formatTime(this.audio.duration)
    if (this.hasProgressSliderTarget) {
      this.progressSliderTarget.setAttribute("aria-valuemax", Math.round(this.audio.duration))
    }
  }

  _onPlay() {
    this.isPlaying = true
    this._updatePlayPauseIcon()
  }

  _onPause() {
    this.isPlaying = false
    this._updatePlayPauseIcon()
  }

  _updatePlayPauseIcon() {
    if (this.hasPlayPauseIconTarget) {
      const svg = this.playPauseIconTarget.querySelector("svg")
      if (svg) svg.innerHTML = this.isPlaying ? this._pauseIconPath() : this._playIconPath()
    }
    if (this.hasPlayPauseBtnTarget) {
      this.playPauseBtnTarget.setAttribute("aria-label", this.isPlaying ? "Pause" : "Play")
    }
  }

  _onKeydown(event) {
    if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA" || event.target.tagName === "SELECT") return
    if (event.target.isContentEditable) return

    if (event.code === "Space" && this.audio.src) {
      event.preventDefault()
      this.togglePlay()
    }
  }

  _updateMuteIcon() {
    if (!this.hasMuteBtnTarget) return
    const muted = this.audio.muted || this.audio.volume === 0
    this.muteBtnTarget.setAttribute("aria-label", muted ? "Unmute" : "Mute")
    this.muteBtnTarget.querySelector("svg").innerHTML = muted ? this._mutedPath() : this._volumePath()
  }

  _onEnded() {
    if (this.repeatMode === "one") {
      this.audio.currentTime = 0
      this.audio.play()
    } else {
      this.next()
    }
  }

  _generateShuffleOrder() {
    // Fisher-Yates shuffle of queue indices
    this.shuffleOrder = Array.from({ length: this.queue.length }, (_, i) => i)
    for (let i = this.shuffleOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.shuffleOrder[i], this.shuffleOrder[j]] = [this.shuffleOrder[j], this.shuffleOrder[i]]
    }
  }

  _regenerateShuffleOrder() {
    if (!this.shuffle) return
    this._generateShuffleOrder()
    // Keep current song at current shuffle position
    if (this.currentIndex >= 0) {
      const idx = this.shuffleOrder.indexOf(this.currentIndex)
      if (idx !== this.shufflePosition && idx >= 0) {
        // Swap current song into shufflePosition
        const atPos = this.shuffleOrder[this.shufflePosition]
        this.shuffleOrder[this.shufflePosition] = this.currentIndex
        this.shuffleOrder[idx] = atPos
      }
    }
  }

  _updateShuffleBtn() {
    if (!this.hasShuffleBtnTarget) return
    if (this.shuffle) {
      this.shuffleBtnTarget.classList.remove("text-gray-400")
      this.shuffleBtnTarget.classList.add("text-blue-400")
      this.shuffleBtnTarget.setAttribute("aria-pressed", "true")
    } else {
      this.shuffleBtnTarget.classList.remove("text-blue-400")
      this.shuffleBtnTarget.classList.add("text-gray-400")
      this.shuffleBtnTarget.setAttribute("aria-pressed", "false")
    }
  }

  _updateRepeatBtn() {
    if (!this.hasRepeatBtnTarget) return
    const svg = this.repeatBtnTarget.querySelector("svg")
    if (this.repeatMode === "off") {
      this.repeatBtnTarget.classList.remove("text-blue-400")
      this.repeatBtnTarget.classList.add("text-gray-400")
      svg.innerHTML = this._repeatIconContent()
      this.repeatBtnTarget.setAttribute("aria-label", "Repeat: off")
    } else if (this.repeatMode === "all") {
      this.repeatBtnTarget.classList.remove("text-gray-400")
      this.repeatBtnTarget.classList.add("text-blue-400")
      svg.innerHTML = this._repeatIconContent()
      this.repeatBtnTarget.setAttribute("aria-label", "Repeat: all")
    } else {
      this.repeatBtnTarget.classList.remove("text-gray-400")
      this.repeatBtnTarget.classList.add("text-blue-400")
      svg.innerHTML = this._repeatOneIconContent()
      this.repeatBtnTarget.setAttribute("aria-label", "Repeat: one")
    }
  }

  _announce(message) {
    const region = document.getElementById("aria-live-region")
    if (region) region.textContent = message
  }

  _formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00"
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  _playIconPath() {
    return `<path fill="currentColor" d="M8 5v14l11-7z"/>`
  }

  _pauseIconPath() {
    return `<path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`
  }

  _volumePath() {
    return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M12 6l-4 4H4v4h4l4 4V6z"/>`
  }

  _mutedPath() {
    return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707A1 1 0 0112 5.586v12.828a1 1 0 01-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/>`
  }

  _repeatIconContent() {
    return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7h12l-3-3m3 3l-3 3M20 17H8l3 3m-3-3l3-3"/>`
  }

  _repeatOneIconContent() {
    return `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7h12l-3-3m3 3l-3 3M20 17H8l3 3m-3-3l3-3"/><rect x="7.5" y="8" width="9" height="10" rx="2" fill="currentColor" stroke="none"/><text x="12" y="15.5" text-anchor="middle" fill="#1e293b" font-size="9" font-weight="bold" font-family="system-ui, sans-serif" stroke="none">1</text>`
  }
}

import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { editUrl: String, deleteUrl: String, songTitle: String, songId: Number }

  connect() {
    this.element.addEventListener("contextmenu", this.show.bind(this))
    this.handleClickOutside = (event) => {
      const menu = document.getElementById("context-menu")
      if (menu && menu.contains(event.target)) return
      this.hide()
    }
    this.handleKeydown = this.onKeydown.bind(this)

    this.longPressTimer = null
    this.element.addEventListener("touchstart", this.touchStart.bind(this), { passive: true })
    this.element.addEventListener("touchend", this.touchEnd.bind(this))
    this.element.addEventListener("touchmove", this.touchCancel.bind(this), { passive: true })

    this.element.addEventListener("keydown", this.handleKeydown)
  }

  disconnect() {
    this.hide()
    this.touchCancel()
    this.element.removeEventListener("keydown", this.handleKeydown)
  }

  onKeydown(event) {
    if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
      event.preventDefault()
      const rect = this.element.getBoundingClientRect()
      this.show({ preventDefault: () => {}, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 })
    }
  }

  touchStart(event) {
    const touch = event.touches[0]
    this.touchX = touch.clientX
    this.touchY = touch.clientY
    this.longPressTimer = setTimeout(() => {
      this.show({ preventDefault: () => {}, clientX: this.touchX, clientY: this.touchY })
    }, 500)
  }

  touchEnd(event) {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer)
      this.longPressTimer = null
    }
  }

  touchCancel() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer)
      this.longPressTimer = null
    }
  }

  show(event) {
    event.preventDefault()
    this.hide()

    const menu = document.createElement("div")
    menu.id = "context-menu"
    menu.className = "fixed z-50 bg-gray-800 border border-gray-700 rounded shadow-lg py-1 min-w-[160px]"
    menu.setAttribute("role", "menu")
    menu.setAttribute("aria-label", "Song actions")

    const editLink = document.createElement("a")
    editLink.href = this.editUrlValue
    editLink.textContent = "Edit"
    editLink.className = "block px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
    editLink.setAttribute("role", "menuitem")
    editLink.setAttribute("aria-label", `Edit ${this.songTitleValue}`)
    menu.appendChild(editLink)

    // Play Next
    const playNextBtn = document.createElement("button")
    playNextBtn.textContent = "Play Next"
    playNextBtn.className = "block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
    playNextBtn.setAttribute("role", "menuitem")
    playNextBtn.setAttribute("aria-label", `Play ${this.songTitleValue} next`)
    playNextBtn.addEventListener("click", () => {
      this._queueAction("context-menu:playNext")
    })
    menu.appendChild(playNextBtn)

    // Add to Queue
    const addToQueueBtn = document.createElement("button")
    addToQueueBtn.textContent = "Add to Queue"
    addToQueueBtn.className = "block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
    addToQueueBtn.setAttribute("role", "menuitem")
    addToQueueBtn.setAttribute("aria-label", `Add ${this.songTitleValue} to queue`)
    addToQueueBtn.addEventListener("click", () => {
      this._queueAction("context-menu:addToQueue")
    })
    menu.appendChild(addToQueueBtn)

    // Add to Playlist
    if (this.hasSongIdValue) {
      const playlistBtn = document.createElement("button")
      playlistBtn.textContent = "Add to Playlist..."
      playlistBtn.className = "block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
      playlistBtn.setAttribute("role", "menuitem")
      playlistBtn.setAttribute("aria-label", `Add ${this.songTitleValue} to playlist`)
      playlistBtn.addEventListener("click", () => {
        this.showPlaylistSubmenu(menu, playlistBtn)
      })
      menu.appendChild(playlistBtn)
    }

    const deleteBtn = document.createElement("button")
    deleteBtn.textContent = "Delete"
    deleteBtn.className = "block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
    deleteBtn.setAttribute("role", "menuitem")
    deleteBtn.setAttribute("aria-label", `Delete ${this.songTitleValue}`)
    deleteBtn.addEventListener("click", () => {
      this.performDelete()
      this.hide()
    })
    menu.appendChild(deleteBtn)

    menu.addEventListener("click", (e) => e.stopPropagation())

    document.body.appendChild(menu)

    // Viewport bounds checking
    const rect = menu.getBoundingClientRect()
    let x = event.clientX
    let y = event.clientY

    if (x + rect.width > window.innerWidth) {
      x = window.innerWidth - rect.width - 4
    }
    if (y + rect.height > window.innerHeight) {
      y = window.innerHeight - rect.height - 4
    }
    if (x < 0) x = 4
    if (y < 0) y = 4

    menu.style.left = `${x}px`
    menu.style.top = `${y}px`

    document.addEventListener("click", this.handleClickOutside)
    this.handleMenuKeydown = this.menuKeydown.bind(this)
    document.addEventListener("keydown", this.handleMenuKeydown)

    editLink.focus()
  }

  async showPlaylistSubmenu(menu, triggerBtn) {
    // Replace menu contents with playlist list
    const items = menu.querySelectorAll("[role='menuitem']")
    items.forEach(item => item.remove())

    const loading = document.createElement("div")
    loading.className = "px-4 py-2 text-sm text-gray-500"
    loading.textContent = "Loading..."
    menu.appendChild(loading)

    try {
      const response = await fetch("/playlists.json")
      const playlists = await response.json()
      loading.remove()

      // Back button
      const backBtn = document.createElement("button")
      backBtn.textContent = "← Back"
      backBtn.className = "block w-full text-left px-4 py-2 text-sm text-gray-400 hover:bg-gray-700 border-b border-gray-700"
      backBtn.setAttribute("role", "menuitem")
      backBtn.addEventListener("click", () => {
        this.hide()
        // Re-show original menu would be complex, just close
      })
      menu.appendChild(backBtn)

      playlists.forEach(playlist => {
        const option = document.createElement("button")
        option.textContent = playlist.name
        option.className = "block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
        option.setAttribute("role", "menuitem")
        option.addEventListener("click", () => {
          this.addToPlaylist(playlist.id)
          this.hide()
        })
        menu.appendChild(option)
      })

      // New playlist option
      const newBtn = document.createElement("button")
      newBtn.textContent = "+ New Playlist..."
      newBtn.className = "block w-full text-left px-4 py-2 text-sm text-blue-400 hover:bg-gray-700 border-t border-gray-700"
      newBtn.setAttribute("role", "menuitem")
      newBtn.addEventListener("click", () => {
        const name = prompt("New playlist name:")
        if (name) {
          this.addToPlaylist(null, name)
        }
        this.hide()
      })
      menu.appendChild(newBtn)

      backBtn.focus()
    } catch {
      loading.textContent = "Failed to load playlists"
    }
  }

  addToPlaylist(playlistId, newName) {
    const token = document.querySelector('meta[name="csrf-token"]')?.content
    const body = new FormData()
    body.append("song_ids[]", this.songIdValue)
    if (newName) {
      body.append("new_playlist_name", newName)
    } else {
      body.append("playlist_id", playlistId)
    }

    fetch("/playlist_additions", {
      method: "POST",
      headers: { "X-CSRF-Token": token, "Accept": "application/json" },
      body: body
    })
    .then(r => r.json())
    .then(data => {
      this.showToast(data.message)
    })
    .catch(() => {
      this.showToast("Failed to add to playlist")
    })
  }

  showToast(message) {
    const container = document.getElementById("toast-container")
    if (!container) return
    const toast = document.createElement("div")
    toast.setAttribute("data-controller", "toast")
    toast.className = "px-4 py-2 bg-green-900/80 text-green-300 rounded border border-green-800 shadow-lg transition-all duration-300"
    toast.textContent = message
    container.appendChild(toast)
  }

  menuKeydown(event) {
    if (event.key === "Escape") {
      this.hide()
      this.element.focus()
      return
    }

    const menu = document.getElementById("context-menu")
    if (!menu) return

    const items = menu.querySelectorAll("[role='menuitem']")
    const current = document.activeElement
    const index = Array.from(items).indexOf(current)

    if (event.key === "ArrowDown") {
      event.preventDefault()
      const next = index < items.length - 1 ? index + 1 : 0
      items[next].focus()
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      const prev = index > 0 ? index - 1 : items.length - 1
      items[prev].focus()
    }
  }

  performDelete() {
    if (confirm(`Delete "${this.songTitleValue}"? This will permanently remove the file from disk.`)) {
      const token = document.querySelector('meta[name="csrf-token"]')?.content
      fetch(this.deleteUrlValue, {
        method: "DELETE",
        headers: { "X-CSRF-Token": token, "Accept": "text/vnd.turbo-stream.html" }
      }).then(() => window.location.reload())
    }
  }

  _queueAction(eventName) {
    const row = this.element.closest("tr[data-song-id]") || this.element.closest("div[data-song-id]") || this.element
    const song = {
      id: row.dataset.songId,
      title: row.dataset.songTitle,
      artist: row.dataset.songArtist,
      streamUrl: row.dataset.songStreamUrl,
      albumArtUrl: row.dataset.songAlbumArtUrl
    }
    document.body.dispatchEvent(new CustomEvent(eventName, {
      bubbles: true,
      detail: { songs: [song] }
    }))
    this.hide()
  }

  hide() {
    const existing = document.getElementById("context-menu")
    if (existing) existing.remove()
    document.removeEventListener("click", this.handleClickOutside)
    if (this.handleMenuKeydown) {
      document.removeEventListener("keydown", this.handleMenuKeydown)
    }
  }
}

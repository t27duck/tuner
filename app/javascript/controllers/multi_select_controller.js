import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["checkbox", "selectAll", "count", "bulkActions"]

  connect() {
    this.updateUI()
  }

  toggleAll() {
    const checked = this.selectAllTarget.checked
    this.checkboxTargets.forEach(cb => cb.checked = checked)
    this.updateUI()
  }

  toggle() {
    this.updateUI()
  }

  updateUI() {
    const selected = this.selectedIds
    const count = selected.length
    this.countTarget.textContent = count > 0 ? `${count} selected` : ""
    this.bulkActionsTarget.classList.toggle("hidden", count === 0)
    this.selectAllTarget.checked = count > 0 && count === this.checkboxTargets.length

    const liveRegion = document.getElementById("aria-live-region")
    if (liveRegion) {
      liveRegion.textContent = count > 0 ? `${count} songs selected` : "No songs selected"
    }
  }

  submitWithIds(event) {
    const form = event.target.closest("form")
    form.querySelectorAll(".dynamic-ids").forEach(el => el.remove())
    this.selectedIds.forEach(id => {
      const input = document.createElement("input")
      input.type = "hidden"
      input.name = "song_ids[]"
      input.value = id
      input.className = "dynamic-ids"
      form.appendChild(input)
    })
  }

  playNextSelected() {
    const songs = this._getSelectedSongData()
    if (!songs.length) return
    document.body.dispatchEvent(new CustomEvent("bulk:playNext", {
      bubbles: true,
      detail: { songs }
    }))
  }

  addToQueueSelected() {
    const songs = this._getSelectedSongData()
    if (!songs.length) return
    document.body.dispatchEvent(new CustomEvent("bulk:addToQueue", {
      bubbles: true,
      detail: { songs }
    }))
  }

  _getSelectedSongData() {
    return this.checkboxTargets
      .filter(cb => cb.checked)
      .map(cb => {
        const row = cb.closest("tr[data-song-id]") || cb.closest("div[data-song-id]")
        if (!row) return null
        return {
          id: row.dataset.songId,
          title: row.dataset.songTitle,
          artist: row.dataset.songArtist,
          streamUrl: row.dataset.songStreamUrl,
          albumArtUrl: row.dataset.songAlbumArtUrl
        }
      })
      .filter(Boolean)
  }

  get selectedIds() {
    return this.checkboxTargets.filter(cb => cb.checked).map(cb => cb.value)
  }
}

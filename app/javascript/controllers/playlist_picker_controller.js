import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["dropdown", "list"]

  toggle() {
    if (this.dropdownTarget.classList.contains("hidden")) {
      this.open()
    } else {
      this.close()
    }
  }

  async open() {
    this.dropdownTarget.classList.remove("hidden")
    try {
      const response = await fetch("/playlists.json")
      const playlists = await response.json()
      this.listTarget.innerHTML = ""
      playlists.forEach(playlist => {
        const btn = document.createElement("button")
        btn.type = "button"
        btn.textContent = playlist.name
        btn.className = "block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
        btn.setAttribute("role", "option")
        btn.addEventListener("click", () => this.addToPlaylist(playlist.id))
        this.listTarget.appendChild(btn)
      })
    } catch {
      this.listTarget.innerHTML = '<div class="px-4 py-2 text-sm text-gray-500">Failed to load playlists</div>'
    }
  }

  close() {
    this.dropdownTarget.classList.add("hidden")
  }

  createNew() {
    const name = prompt("New playlist name:")
    if (name) {
      this.addToPlaylist(null, name)
    }
    this.close()
  }

  addToPlaylist(playlistId, newName) {
    const songIds = this.getSelectedSongIds()
    if (songIds.length === 0) {
      this.showToast("No songs selected")
      this.close()
      return
    }

    const token = document.querySelector('meta[name="csrf-token"]')?.content
    const body = new FormData()
    songIds.forEach(id => body.append("song_ids[]", id))
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
    this.close()
  }

  getSelectedSongIds() {
    const checkboxes = document.querySelectorAll("[data-multi-select-target='checkbox']:checked")
    return Array.from(checkboxes).map(cb => cb.value)
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
}

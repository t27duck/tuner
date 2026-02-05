import { Controller } from "@hotwired/stimulus"
import Sortable from "sortablejs"

export default class extends Controller {
  static targets = ["list", "mobileList", "handle"]
  static values = { url: String }

  connect() {
    this.initSortable()
  }

  initSortable() {
    const options = {
      handle: "[data-playlist-sort-target='handle']",
      animation: 150,
      ghostClass: "opacity-50",
      onEnd: this.onSortEnd.bind(this)
    }

    if (this.hasListTarget) {
      this.sortable = Sortable.create(this.listTarget, options)
    }
    if (this.hasMobileListTarget) {
      this.mobileSortable = Sortable.create(this.mobileListTarget, options)
    }
  }

  onSortEnd() {
    const target = this.hasListTarget ? this.listTarget : this.mobileListTarget
    const items = target.querySelectorAll("[data-playlist-song-id]")
    const orderedIds = Array.from(items).map(el => el.dataset.playlistSongId)

    const token = document.querySelector('meta[name="csrf-token"]')?.content
    fetch(this.urlValue, {
      method: "PATCH",
      headers: {
        "X-CSRF-Token": token,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ ordered_ids: orderedIds })
    })

    const liveRegion = document.getElementById("aria-live-region")
    if (liveRegion) {
      liveRegion.textContent = "Playlist order updated"
    }
  }

  disconnect() {
    if (this.sortable) this.sortable.destroy()
    if (this.mobileSortable) this.mobileSortable.destroy()
  }
}

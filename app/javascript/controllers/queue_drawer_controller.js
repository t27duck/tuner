import { Controller } from "@hotwired/stimulus"
import Sortable from "sortablejs"

export default class extends Controller {
  static targets = ["panel", "list", "emptyState", "badge"]

  connect() {
    this._onQueueChanged = this._handleQueueChanged.bind(this)
    document.addEventListener("audio-player:queueChanged", this._onQueueChanged)

    this._onKeydown = this._handleKeydown.bind(this)
    document.addEventListener("keydown", this._onKeydown)

    // Restore drawer state only for explicitly built queues
    const state = window._tunerAudio
    if (state && state.isExplicitQueue) {
      this._renderQueue(state.queue, state.currentIndex)
    }
  }

  disconnect() {
    document.removeEventListener("audio-player:queueChanged", this._onQueueChanged)
    document.removeEventListener("keydown", this._onKeydown)
    if (this.sortable) this.sortable.destroy()
  }

  toggle() {
    if (this.hasPanelTarget) {
      if (this.panelTarget.classList.contains("translate-x-full")) {
        this.open()
      } else {
        this.close()
      }
    }
  }

  open() {
    if (this.hasPanelTarget) {
      this.panelTarget.classList.remove("translate-x-full")
      this.panelTarget.setAttribute("aria-hidden", "false")
    }
  }

  close() {
    if (this.hasPanelTarget) {
      this.panelTarget.classList.add("translate-x-full")
      this.panelTarget.setAttribute("aria-hidden", "true")
    }
  }

  remove(event) {
    const index = parseInt(event.currentTarget.dataset.index, 10)
    const player = document.querySelector("[data-controller~='audio-player']")
    if (player) {
      player.dispatchEvent(new CustomEvent("queue-drawer:removeFromQueue", {
        bubbles: true,
        detail: { index }
      }))
    }
  }

  clear() {
    const player = document.querySelector("[data-controller~='audio-player']")
    if (player) {
      player.dispatchEvent(new CustomEvent("queue-drawer:clearQueue", { bubbles: true }))
    }
    this.close()
  }

  // Private

  _handleQueueChanged(event) {
    const { queue, currentIndex } = event.detail
    this._renderQueue(queue, currentIndex)
  }

  _handleKeydown(event) {
    if (event.key === "Escape" && this.hasPanelTarget && !this.panelTarget.classList.contains("translate-x-full")) {
      this.close()
    }
  }

  _renderQueue(queue, currentIndex) {
    if (!this.hasListTarget) return

    // Update badge
    if (this.hasBadgeTarget) {
      const count = queue.length
      this.badgeTarget.textContent = count
      this.badgeTarget.classList.toggle("hidden", count === 0)
    }

    // Show/hide empty state
    if (this.hasEmptyStateTarget) {
      this.emptyStateTarget.classList.toggle("hidden", queue.length > 0)
    }
    this.listTarget.classList.toggle("hidden", queue.length === 0)

    // Rebuild list
    this.listTarget.innerHTML = ""

    queue.forEach((song, index) => {
      const isCurrent = index === currentIndex
      const item = document.createElement("div")
      item.className = `flex items-center gap-2 px-3 py-2 group ${isCurrent ? "bg-blue-900/30 border-l-2 border-blue-500" : "border-l-2 border-transparent hover:bg-gray-800/50"}`
      item.dataset.queueIndex = index

      item.innerHTML = `
        <span class="drag-handle cursor-grab text-gray-600 hover:text-gray-400 flex-shrink-0" aria-label="Drag to reorder">
          <svg class="w-4 h-4" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24"><path d="M3 15h18v-2H3v2zm0 4h18v-2H3v2zm0-8h18V9H3v2zm0-6v2h18V5H3z"/></svg>
        </span>
        <div class="min-w-0 flex-1">
          <div class="text-sm font-medium truncate ${isCurrent ? "text-blue-300" : "text-gray-200"}">${this._escapeHtml(song.title)}</div>
          <div class="text-xs text-gray-500 truncate">${this._escapeHtml(song.artist)}</div>
        </div>
        ${isCurrent
          ? '<span class="text-xs text-blue-400 flex-shrink-0">Playing</span>'
          : `<button data-action="click->queue-drawer#remove" data-index="${index}" aria-label="Remove ${this._escapeHtml(song.title)} from queue" class="text-gray-600 hover:text-red-400 flex-shrink-0 hidden group-hover:block group-focus-within:block">
              <svg class="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>`
        }
      `
      this.listTarget.appendChild(item)
    })

    // Init or reinit sortable
    if (this.sortable) this.sortable.destroy()
    if (queue.length > 1) {
      this.sortable = Sortable.create(this.listTarget, {
        handle: ".drag-handle",
        animation: 150,
        ghostClass: "opacity-50",
        onEnd: (evt) => {
          const player = document.querySelector("[data-controller~='audio-player']")
          if (player) {
            player.dispatchEvent(new CustomEvent("queue-drawer:reorderQueue", {
              bubbles: true,
              detail: { oldIndex: evt.oldIndex, newIndex: evt.newIndex }
            }))
          }
        }
      })
    }
  }

  _escapeHtml(str) {
    if (!str) return ""
    const div = document.createElement("div")
    div.textContent = str
    return div.innerHTML
  }
}

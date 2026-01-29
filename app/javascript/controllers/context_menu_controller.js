import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { editUrl: String, deleteUrl: String, songTitle: String }

  connect() {
    this.element.addEventListener("contextmenu", this.show.bind(this))
    this.handleClickOutside = this.hide.bind(this)
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
    menu.className = "fixed z-50 bg-gray-800 border border-gray-700 rounded shadow-lg py-1 min-w-[120px]"
    menu.setAttribute("role", "menu")
    menu.setAttribute("aria-label", "Song actions")

    const editLink = document.createElement("a")
    editLink.href = this.editUrlValue
    editLink.textContent = "Edit"
    editLink.className = "block px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
    editLink.setAttribute("role", "menuitem")
    editLink.setAttribute("aria-label", `Edit ${this.songTitleValue}`)
    menu.appendChild(editLink)

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

  hide() {
    const existing = document.getElementById("context-menu")
    if (existing) existing.remove()
    document.removeEventListener("click", this.handleClickOutside)
    if (this.handleMenuKeydown) {
      document.removeEventListener("keydown", this.handleMenuKeydown)
    }
  }
}

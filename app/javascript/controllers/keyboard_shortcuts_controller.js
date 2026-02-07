import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["dialog", "closeBtn"]

  connect() {
    this._onKeydown = this._handleKeydown.bind(this)
    document.addEventListener("keydown", this._onKeydown)
    this._previousFocus = null
  }

  disconnect() {
    document.removeEventListener("keydown", this._onKeydown)
  }

  open() {
    if (!this.hasDialogTarget) return
    this._previousFocus = document.activeElement
    this.dialogTarget.classList.remove("hidden")
    this.dialogTarget.setAttribute("aria-hidden", "false")
    if (this.hasCloseBtnTarget) this.closeBtnTarget.focus()
    this._announce("Keyboard shortcuts dialog opened")
  }

  close() {
    if (!this.hasDialogTarget) return
    this.dialogTarget.classList.add("hidden")
    this.dialogTarget.setAttribute("aria-hidden", "true")
    if (this._previousFocus && typeof this._previousFocus.focus === "function") {
      this._previousFocus.focus()
    }
    this._previousFocus = null
    this._announce("Keyboard shortcuts dialog closed")
  }

  closeOnBackdrop(event) {
    const panel = this.dialogTarget.querySelector("[data-keyboard-shortcuts-panel]")
    if (panel && !panel.contains(event.target)) {
      this.close()
    }
  }

  // Private

  _handleKeydown(event) {
    const isOpen = this.hasDialogTarget && !this.dialogTarget.classList.contains("hidden")

    if (isOpen) {
      if (event.key === "Escape") {
        event.stopImmediatePropagation()
        this.close()
        return
      }

      if (event.key === "?") {
        event.preventDefault()
        this.close()
        return
      }

      // Focus trap
      if (event.key === "Tab") {
        this._trapFocus(event)
        return
      }
      return
    }

    // Open on ? (skip if in form inputs)
    if (event.key === "?") {
      if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA" || event.target.tagName === "SELECT") return
      if (event.target.isContentEditable) return
      event.preventDefault()
      this.open()
    }
  }

  _trapFocus(event) {
    const focusable = this.dialogTarget.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
  }

  _announce(message) {
    const region = document.getElementById("aria-live-region")
    if (region) region.textContent = message
  }
}

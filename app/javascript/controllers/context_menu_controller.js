import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { editUrl: String, deleteUrl: String, songTitle: String }

  connect() {
    this.element.addEventListener("contextmenu", this.show.bind(this))
    this.handleClickOutside = this.hide.bind(this)
  }

  disconnect() {
    this.hide()
  }

  show(event) {
    event.preventDefault()
    this.hide()

    const menu = document.createElement("div")
    menu.id = "context-menu"
    menu.className = "fixed z-50 bg-gray-800 border border-gray-700 rounded shadow-lg py-1 min-w-[120px]"
    menu.style.left = `${event.clientX}px`
    menu.style.top = `${event.clientY}px`
    menu.setAttribute("role", "menu")

    const editLink = document.createElement("a")
    editLink.href = this.editUrlValue
    editLink.textContent = "Edit"
    editLink.className = "block px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
    editLink.setAttribute("role", "menuitem")
    menu.appendChild(editLink)

    const deleteBtn = document.createElement("button")
    deleteBtn.textContent = "Delete"
    deleteBtn.className = "block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
    deleteBtn.setAttribute("role", "menuitem")
    deleteBtn.addEventListener("click", () => {
      if (confirm(`Delete "${this.songTitleValue}"? This will permanently remove the file from disk.`)) {
        const token = document.querySelector('meta[name="csrf-token"]')?.content
        fetch(this.deleteUrlValue, {
          method: "DELETE",
          headers: { "X-CSRF-Token": token, "Accept": "text/vnd.turbo-stream.html" }
        }).then(() => window.location.reload())
      }
      this.hide()
    })
    menu.appendChild(deleteBtn)

    document.body.appendChild(menu)
    document.addEventListener("click", this.handleClickOutside)
  }

  hide() {
    const existing = document.getElementById("context-menu")
    if (existing) existing.remove()
    document.removeEventListener("click", this.handleClickOutside)
  }
}

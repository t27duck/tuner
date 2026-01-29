import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { url: String, field: String }

  connect() {
    this.element.addEventListener("dblclick", this.startEdit.bind(this))
    this.element.addEventListener("keydown", this.onKeydown.bind(this))
    this.element.setAttribute("title", `Double-click or press Enter to edit ${this.fieldValue}`)
  }

  onKeydown(event) {
    if ((event.key === "Enter" || event.key === " ") && !this.editing) {
      event.preventDefault()
      this.startEdit()
    }
  }

  startEdit() {
    if (this.editing) return
    this.editing = true

    this.originalValue = this.element.textContent.trim()
    const input = document.createElement("input")
    input.type = this.fieldValue === "year" || this.fieldValue === "track_number" || this.fieldValue === "disc_number" ? "number" : "text"
    input.value = this.originalValue
    input.className = "bg-gray-800 border border-blue-500 rounded px-2 py-1 text-gray-100 text-sm w-full focus:outline-none"
    input.setAttribute("aria-label", `Edit ${this.fieldValue}`)
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.save(input)
      if (e.key === "Escape") this.cancel()
    })
    input.addEventListener("blur", () => this.save(input))

    this.element.textContent = ""
    this.element.appendChild(input)
    input.focus()
    input.select()
  }

  async save(input) {
    if (!this.editing) return
    this.editing = false

    const newValue = input.value.trim()
    this.element.textContent = newValue

    if (newValue === this.originalValue) return

    const token = document.querySelector('meta[name="csrf-token"]')?.content
    const body = new FormData()
    body.append(`song[${this.fieldValue}]`, newValue)

    try {
      const response = await fetch(this.urlValue, {
        method: "PATCH",
        headers: { "X-CSRF-Token": token, "Accept": "application/json" },
        body
      })
      if (!response.ok) {
        this.element.textContent = this.originalValue
      }
    } catch {
      this.element.textContent = this.originalValue
    }
  }

  cancel() {
    this.editing = false
    this.element.textContent = this.originalValue
  }
}

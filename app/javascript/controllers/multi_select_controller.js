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
  }

  get selectedIds() {
    return this.checkboxTargets.filter(cb => cb.checked).map(cb => cb.value)
  }
}

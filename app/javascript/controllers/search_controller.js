import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["form"]

  connect() {
    this.timeout = null
  }

  search() {
    clearTimeout(this.timeout)
    this.timeout = setTimeout(() => {
      this.formTarget.requestSubmit()
    }, 300)
  }

  clear() {
    this.formTarget.querySelectorAll("input[type=text], input[type=search], input[type=number], select").forEach(input => {
      input.value = ""
    })
    this.formTarget.querySelectorAll("input[type=checkbox]").forEach(input => {
      input.checked = false
    })
    this.formTarget.requestSubmit()
  }
}

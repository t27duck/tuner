import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["form"]

  submit() {
    this.formTarget.requestSubmit()
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

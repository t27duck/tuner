import { Controller } from "@hotwired/stimulus"
import { createConsumer } from "@rails/actioncable"

export default class extends Controller {
  static targets = ["status", "button", "progress", "message"]

  connect() {
    this.consumer = createConsumer()
    this.subscription = this.consumer.subscriptions.create("SyncChannel", {
      received: (data) => this.handleMessage(data)
    })
  }

  disconnect() {
    if (this.subscription) this.subscription.unsubscribe()
    if (this.consumer) this.consumer.disconnect()
  }

  handleMessage(data) {
    const { status, message, current, total } = data
    const statusEl = this.statusTarget
    const progressEl = this.progressTarget
    const messageEl = this.messageTarget
    const buttonEl = this.buttonTarget

    if (status === "running" && current != null && total != null) {
      progressEl.textContent = `${current} / ${total}`
      messageEl.textContent = message.replace(/^Processing /, "")
    } else {
      progressEl.textContent = ""
      messageEl.textContent = message
    }

    // Reset color classes
    statusEl.classList.remove("hidden")
    progressEl.classList.remove("text-blue-300", "text-green-300", "text-red-300")

    switch (status) {
      case "running":
        progressEl.classList.add("text-blue-300")
        buttonEl.disabled = true
        buttonEl.classList.add("opacity-50", "cursor-not-allowed")
        break
      case "completed":
        progressEl.classList.add("text-green-300")
        messageEl.classList.remove("text-gray-400")
        messageEl.classList.add("text-green-300")
        buttonEl.disabled = false
        buttonEl.classList.remove("opacity-50", "cursor-not-allowed")
        setTimeout(() => {
          statusEl.classList.add("hidden")
          messageEl.classList.remove("text-green-300")
          messageEl.classList.add("text-gray-400")
        }, 5000)
        break
      case "failed":
        progressEl.classList.add("text-red-300")
        messageEl.classList.remove("text-gray-400")
        messageEl.classList.add("text-red-300")
        buttonEl.disabled = false
        buttonEl.classList.remove("opacity-50", "cursor-not-allowed")
        break
    }

    // Announce to screen readers
    const liveRegion = document.getElementById("aria-live-region")
    if (liveRegion) liveRegion.textContent = `${progressEl.textContent} ${messageEl.textContent}`
  }
}

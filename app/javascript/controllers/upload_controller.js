import { Controller } from "@hotwired/stimulus"
import { createConsumer } from "@rails/actioncable"

export default class extends Controller {
  static targets = [
    "dropZone", "fileInput", "progressSection", "counter",
    "statusText", "progressBar", "progressFill", "messageLog", "summary"
  ]

  connect() {
    this.total = 0
    this.completed = 0
    this.failed = 0
    this.uploading = false

    this.consumer = createConsumer()
    this.subscription = this.consumer.subscriptions.create("UploadChannel", {
      received: (data) => this.handleBroadcast(data)
    })
  }

  disconnect() {
    if (this.subscription) this.subscription.unsubscribe()
    if (this.consumer) this.consumer.disconnect()
  }

  dragover(event) {
    event.preventDefault()
  }

  dragenter(event) {
    event.preventDefault()
    this.dropZoneTarget.classList.add("border-blue-500", "bg-gray-900/50")
  }

  dragleave(event) {
    event.preventDefault()
    this.dropZoneTarget.classList.remove("border-blue-500", "bg-gray-900/50")
  }

  async drop(event) {
    event.preventDefault()
    this.dropZoneTarget.classList.remove("border-blue-500", "bg-gray-900/50")

    if (this.uploading) return

    const items = event.dataTransfer.items
    const files = []

    if (items) {
      const entries = []
      for (const item of items) {
        const entry = item.webkitGetAsEntry?.()
        if (entry) entries.push(entry)
      }
      for (const entry of entries) {
        await this.collectFiles(entry, "", files)
      }
    } else {
      for (const file of event.dataTransfer.files) {
        if (file.name.toLowerCase().endsWith(".mp3")) {
          files.push({ file, relativePath: file.name })
        }
      }
    }

    if (files.length > 0) {
      this.uploadFiles(files)
    }
  }

  browse(event) {
    if (this.uploading) return
    this.fileInputTarget.click()
  }

  fileSelected(event) {
    const fileList = event.target.files
    const files = []
    for (const file of fileList) {
      if (file.name.toLowerCase().endsWith(".mp3")) {
        files.push({ file, relativePath: file.name })
      }
    }
    if (files.length > 0) {
      this.uploadFiles(files)
    }
    event.target.value = ""
  }

  async collectFiles(entry, basePath, files) {
    if (entry.isFile) {
      if (entry.name.toLowerCase().endsWith(".mp3")) {
        const file = await new Promise((resolve) => entry.file(resolve))
        const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name
        files.push({ file, relativePath })
      }
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader()
      const entries = await this.readAllEntries(dirReader)
      const dirPath = basePath ? `${basePath}/${entry.name}` : entry.name
      for (const child of entries) {
        await this.collectFiles(child, dirPath, files)
      }
    }
  }

  async readAllEntries(dirReader) {
    const allEntries = []
    let entries
    do {
      entries = await new Promise((resolve) => dirReader.readEntries(resolve))
      allEntries.push(...entries)
    } while (entries.length > 0)
    return allEntries
  }

  async uploadFiles(files) {
    this.uploading = true
    this.total = files.length
    this.completed = 0
    this.failed = 0

    this.progressSectionTarget.classList.remove("hidden")
    this.messageLogTarget.innerHTML = ""
    this.summaryTarget.classList.add("hidden")
    this.updateProgress()
    this.announce(`Starting upload of ${this.total} file${this.total === 1 ? "" : "s"}`)

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content

    for (const { file, relativePath } of files) {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("relative_path", relativePath)

      try {
        const response = await fetch("/upload", {
          method: "POST",
          headers: { "X-CSRF-Token": csrfToken },
          body: formData
        })

        const data = await response.json()

        if (response.ok) {
          this.completed++
          this.logMessage(relativePath, "success")
        } else {
          this.failed++
          this.logMessage(`${relativePath}: ${data.error}`, "error")
        }
      } catch (error) {
        this.failed++
        this.logMessage(`${relativePath}: Network error`, "error")
      }

      this.updateProgress()
    }

    this.showSummary()
    this.uploading = false
  }

  updateProgress() {
    const done = this.completed + this.failed
    const pct = this.total > 0 ? Math.round((done / this.total) * 100) : 0

    this.counterTarget.textContent = `${done} / ${this.total}`
    this.statusTextTarget.textContent = done < this.total ? "Uploading..." : "Done"
    this.progressFillTarget.style.width = `${pct}%`
    this.progressBarTarget.setAttribute("aria-valuenow", pct)
  }

  logMessage(text, type) {
    const line = document.createElement("div")
    line.textContent = text
    line.classList.add(type === "error" ? "text-red-400" : "text-green-400")
    this.messageLogTarget.appendChild(line)
    this.messageLogTarget.scrollTop = this.messageLogTarget.scrollHeight
  }

  showSummary() {
    const summary = this.summaryTarget
    summary.classList.remove("hidden", "bg-green-900/50", "text-green-300", "bg-red-900/50", "text-red-300")

    let msg = `Upload complete. ${this.completed} file${this.completed === 1 ? "" : "s"} uploaded.`
    if (this.failed > 0) {
      msg += ` ${this.failed} failed.`
      summary.classList.add("bg-red-900/50", "text-red-300")
    } else {
      summary.classList.add("bg-green-900/50", "text-green-300")
    }

    summary.textContent = msg
    this.announce(msg)
  }

  announce(text) {
    const liveRegion = document.getElementById("aria-live-region")
    if (liveRegion) liveRegion.textContent = text
  }

  handleBroadcast(data) {
    // Server-side broadcast for supplementary feedback if needed
  }
}

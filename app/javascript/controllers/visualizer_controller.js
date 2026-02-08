import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["canvas", "canvasContainer", "modeBtn", "activateOverlay", "emptyState"]

  connect() {
    this.mode = "frequency" // "frequency" or "waveform"
    this.animationId = null
    this.state = window._tunerAudio

    if (!this.state || !this.state.audio.src) {
      this._showEmpty()
      return
    }

    this._setupAudioNodes()
    this._resizeCanvas()
    this._startRendering()

    this._boundResize = () => this._resizeCanvas()
    this._boundVisibility = () => this._onVisibilityChange()

    window.addEventListener("resize", this._boundResize)
    document.addEventListener("visibilitychange", this._boundVisibility)
  }

  disconnect() {
    this._stopRendering()

    if (this._boundResize) window.removeEventListener("resize", this._boundResize)
    if (this._boundVisibility) document.removeEventListener("visibilitychange", this._boundVisibility)
  }

  toggleMode() {
    if (this.mode === "frequency") {
      this.mode = "waveform"
      this.modeBtnTarget.textContent = "Frequency"
      if (this.analyser) this.analyser.fftSize = 2048
    } else {
      this.mode = "frequency"
      this.modeBtnTarget.textContent = "Waveform"
      if (this.analyser) this.analyser.fftSize = 256
    }
  }

  activate() {
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume().then(() => {
        this.activateOverlayTarget.classList.add("hidden")
        this._startRendering()
      })
    }
  }

  // Private

  _setupAudioNodes() {
    // Reuse existing AudioContext or create one
    if (!this.state._audioContext) {
      this.state._audioContext = new (window.AudioContext || window.webkitAudioContext)()
    }
    this.audioContext = this.state._audioContext

    // createMediaElementSource can only be called once per element
    if (!this.state._sourceNode) {
      this.state._sourceNode = this.audioContext.createMediaElementSource(this.state.audio)
      this.state._sourceNode.connect(this.audioContext.destination)
    }

    // Create analyser (can recreate on each visit)
    if (!this.state._analyserNode) {
      this.state._analyserNode = this.audioContext.createAnalyser()
      // Insert analyser between source and destination
      this.state._sourceNode.disconnect()
      this.state._sourceNode.connect(this.state._analyserNode)
      this.state._analyserNode.connect(this.audioContext.destination)
    }

    this.analyser = this.state._analyserNode
    this.analyser.fftSize = this.mode === "frequency" ? 256 : 2048

    // Handle suspended AudioContext
    if (this.audioContext.state === "suspended") {
      this.activateOverlayTarget.classList.remove("hidden")
    }
  }

  _resizeCanvas() {
    if (!this.hasCanvasTarget) return
    const container = this.canvasContainerTarget
    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    this.canvasTarget.width = rect.width * dpr
    this.canvasTarget.height = rect.height * dpr

    this.canvasWidth = rect.width
    this.canvasHeight = rect.height

    const ctx = this.canvasTarget.getContext("2d")
    ctx.scale(dpr, dpr)
  }

  _startRendering() {
    if (this.animationId) return
    this._render()
  }

  _stopRendering() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  _render() {
    this.animationId = requestAnimationFrame(() => this._render())

    if (!this.analyser || !this.hasCanvasTarget) return

    const ctx = this.canvasTarget.getContext("2d")
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)

    if (this.mode === "frequency") {
      this._renderFrequency(ctx)
    } else {
      this._renderWaveform(ctx)
    }
  }

  _renderFrequency(ctx) {
    const bufferLength = this.analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    this.analyser.getByteFrequencyData(dataArray)

    const barCount = 64
    const gap = 2
    const totalGaps = gap * (barCount - 1)
    const barWidth = (this.canvasWidth - totalGaps) / barCount

    for (let i = 0; i < barCount; i++) {
      const value = dataArray[i]
      const barHeight = (value / 255) * this.canvasHeight

      const x = i * (barWidth + gap)
      const y = this.canvasHeight - barHeight

      // Blue gradient: lighter at top, darker at bottom
      const gradient = ctx.createLinearGradient(x, y, x, this.canvasHeight)
      gradient.addColorStop(0, "rgb(96, 165, 250)")  // blue-400
      gradient.addColorStop(1, "rgb(59, 130, 246)")   // blue-500

      ctx.fillStyle = gradient
      ctx.fillRect(x, y, barWidth, barHeight)
    }
  }

  _renderWaveform(ctx) {
    const bufferLength = this.analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    this.analyser.getByteTimeDomainData(dataArray)

    // Subtle glow
    ctx.shadowBlur = 8
    ctx.shadowColor = "rgb(59, 130, 246)"

    ctx.lineWidth = 2
    ctx.strokeStyle = "rgb(59, 130, 246)" // blue-500
    ctx.beginPath()

    const sliceWidth = this.canvasWidth / bufferLength
    let x = 0

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0
      const y = (v * this.canvasHeight) / 2

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
      x += sliceWidth
    }

    ctx.lineTo(this.canvasWidth, this.canvasHeight / 2)
    ctx.stroke()

    // Reset shadow
    ctx.shadowBlur = 0
    ctx.shadowColor = "transparent"
  }

  _showEmpty() {
    if (this.hasEmptyStateTarget) this.emptyStateTarget.classList.remove("hidden")
  }

  _onVisibilityChange() {
    if (document.hidden) {
      this._stopRendering()
    } else {
      this._startRendering()
    }
  }
}

import { Controller } from "@hotwired/stimulus"
import { TerrainRenderer } from "controllers/visualizer/terrain_renderer"
import { SynthwaveRenderer } from "controllers/visualizer/synthwave_renderer"
import { StarfieldRenderer } from "controllers/visualizer/starfield_renderer"

export default class extends Controller {
  static targets = ["canvas", "canvasContainer", "modeLabel", "activateOverlay", "emptyState"]

  connect() {
    this.modes = ["frequency", "waveform", "circular", "terrain", "synthwave", "starfield"]
    this.mode = "frequency"
    this.animationId = null
    this.state = window._tunerAudio

    if (!this.state || !this.state.audio.src) {
      this._showEmpty()
      return
    }

    this._setupAudioNodes()
    this._resizeCanvas()
    this._initRenderers()
    this._startRendering()

    this._updateModeLabel()

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

  prevMode() {
    const currentIndex = this.modes.indexOf(this.mode)
    this.mode = this.modes[(currentIndex - 1 + this.modes.length) % this.modes.length]
    this._updateModeLabel()
    if (this.analyser) this.analyser.fftSize = this._fftSizeForMode()
  }

  nextMode() {
    const currentIndex = this.modes.indexOf(this.mode)
    this.mode = this.modes[(currentIndex + 1) % this.modes.length]
    this._updateModeLabel()
    if (this.analyser) this.analyser.fftSize = this._fftSizeForMode()
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
    this.analyser.fftSize = this._fftSizeForMode()

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

    this._resizeRenderers()
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
    } else if (this.mode === "waveform") {
      this._renderWaveform(ctx)
    } else if (this.mode === "circular") {
      this._renderCircular(ctx)
    } else if (this._renderers && this._renderers[this.mode]) {
      this._renderers[this.mode].render(ctx, this.analyser)
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

  _renderCircular(ctx) {
    const bufferLength = this.analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    this.analyser.getByteFrequencyData(dataArray)

    const cx = this.canvasWidth / 2
    const cy = this.canvasHeight / 2
    const baseRadius = Math.min(cx, cy) * 0.3
    const maxBarHeight = Math.min(cx, cy) * 0.55
    const barCount = 128
    const angleStep = (Math.PI * 2) / barCount

    for (let i = 0; i < barCount; i++) {
      const value = dataArray[i]
      const barHeight = (value / 255) * maxBarHeight
      const angle = i * angleStep - Math.PI / 2

      const x1 = cx + Math.cos(angle) * baseRadius
      const y1 = cy + Math.sin(angle) * baseRadius
      const x2 = cx + Math.cos(angle) * (baseRadius + barHeight)
      const y2 = cy + Math.sin(angle) * (baseRadius + barHeight)

      // Color shifts around the circle: blue-400 to blue-300
      const t = i / barCount
      const r = Math.round(96 + t * (51))    // 96 -> 147
      const g = Math.round(165 + t * (32))   // 165 -> 197
      const b = Math.round(250 + t * (3))    // 250 -> 253

      ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`
      ctx.lineWidth = Math.max(2, (angleStep * baseRadius) - 1)
      ctx.lineCap = "round"
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }
  }

  _initRenderers() {
    this._renderers = {
      terrain: new TerrainRenderer(this.canvasWidth, this.canvasHeight),
      synthwave: new SynthwaveRenderer(this.canvasWidth, this.canvasHeight),
      starfield: new StarfieldRenderer(this.canvasWidth, this.canvasHeight)
    }
  }

  _resizeRenderers() {
    if (!this._renderers) return
    for (const renderer of Object.values(this._renderers)) {
      renderer.resize(this.canvasWidth, this.canvasHeight)
    }
  }

  _fftSizeForMode() {
    if (this.mode === "waveform") return 2048
    if (this._renderers && this._renderers[this.mode]) {
      return this._renderers[this.mode].fftSize
    }
    return 256 // frequency and circular
  }

  _updateModeLabel() {
    if (this.hasModeLabelTarget) {
      this.modeLabelTarget.textContent = this.mode.charAt(0).toUpperCase() + this.mode.slice(1)
    }
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

export class GameboyRenderer {
  constructor(w, h) {
    this._dataArray = null
    this._timeArray = null
    this._peaks = []
    this._peakVelocities = []
    this._barCount = 20
    this._offscreen = null
    this._offCtx = null
    this.resize(w, h)
  }

  get fftSize() { return 256 }

  resize(w, h) {
    this._w = w
    this._h = h
    this._offscreen = null
    this._offCtx = null
  }

  render(ctx, analyser) {
    const bufLen = analyser.frequencyBinCount
    if (!this._dataArray || this._dataArray.length !== bufLen) {
      this._dataArray = new Uint8Array(bufLen)
      this._timeArray = new Uint8Array(bufLen)
    }
    analyser.getByteFrequencyData(this._dataArray)
    analyser.getByteTimeDomainData(this._timeArray)

    const w = this._w
    const h = this._h

    // Virtual LCD: 160x144, integer-scaled to fit canvas
    const scale = Math.max(1, Math.min(Math.floor(w / 160), Math.floor(h / 144)))
    const lcdW = 160 * scale
    const lcdH = 144 * scale
    const offsetX = Math.floor((w - lcdW) / 2)
    const offsetY = Math.floor((h - lcdH) / 2)

    // Offscreen canvas for LCD ghosting persistence
    this._ensureOffscreen(lcdW, lcdH)
    const oc = this._offCtx

    // Ghosting fade: overlay lightest color at low opacity to simulate LCD persistence
    oc.fillStyle = "rgba(155, 188, 15, 0.35)"
    oc.fillRect(0, 0, lcdW, lcdH)

    // --- Header bar: top 16 virtual pixels ---
    const headerH = 16 * scale
    oc.fillStyle = LIGHT
    oc.fillRect(0, 0, lcdW, headerH)

    // Pixel font "SOUND" label
    this._drawPixelText(oc, "SOUND", scale)

    // Divider line below header
    oc.fillStyle = DARKEST
    oc.fillRect(0, headerH - scale, lcdW, scale)

    // --- Spectrum area ---
    const specTop = headerH
    const waveH = 12 * scale
    const specBottom = lcdH - waveH
    const specH = specBottom - specTop

    // Divider line above waveform
    oc.fillStyle = DARK
    oc.fillRect(0, specBottom, lcdW, scale)

    // Logarithmic frequency bin mapping
    const binValues = this._mapBins(bufLen, this._barCount)

    // Initialize peaks if needed
    if (this._peaks.length !== this._barCount) {
      this._peaks = new Array(this._barCount).fill(0)
      this._peakVelocities = new Array(this._barCount).fill(0)
    }

    // Bar layout: 6px wide cells, 2px gap between bars
    const cellW = 6
    const cellH = 3
    const barGap = 2
    const barPitch = cellW + barGap
    const maxCells = Math.floor((specH / scale - 2) / cellH)

    // Center bars horizontally
    const totalBarsW = this._barCount * barPitch - barGap
    const barsOffsetX = Math.floor((160 - totalBarsW) / 2) * scale

    for (let i = 0; i < this._barCount; i++) {
      const value = binValues[i] / 255
      const activeCells = Math.floor(value * maxCells)

      // Update peak with gravity decay
      if (activeCells >= this._peaks[i]) {
        this._peaks[i] = activeCells
        this._peakVelocities[i] = 0
      } else {
        this._peakVelocities[i] += 0.0005
        this._peaks[i] -= this._peakVelocities[i] * 60
        if (this._peaks[i] < 0) this._peaks[i] = 0
      }

      const barX = barsOffsetX + i * barPitch * scale

      // Draw discrete cells bottom-up with 1-virtual-pixel gaps
      for (let c = 0; c < activeCells; c++) {
        const cellY = specBottom - (c + 1) * cellH * scale
        const ratio = c / maxCells
        // Bottom 70% darkest, top 30% dark
        oc.fillStyle = ratio < 0.7 ? DARKEST : DARK
        oc.fillRect(barX, cellY, (cellW - 1) * scale, (cellH - 1) * scale)
      }

      // Peak indicator
      const peakCell = Math.round(this._peaks[i])
      if (peakCell > 0 && peakCell > activeCells) {
        const peakY = specBottom - (peakCell + 1) * cellH * scale
        oc.fillStyle = DARK
        oc.fillRect(barX, peakY, (cellW - 1) * scale, (cellH - 1) * scale)
      }
    }

    // --- Waveform strip: bottom section ---
    const waveTop = specBottom + scale * 2
    const waveBottom = lcdH - scale
    const waveMidY = waveTop + (waveBottom - waveTop) / 2
    const waveAmplitude = (waveBottom - waveTop) / 2 - scale

    oc.fillStyle = DARKEST
    let prevPy = null
    for (let vx = 0; vx < 160; vx++) {
      const dataIdx = Math.floor((vx / 160) * bufLen)
      const sample = (this._timeArray[dataIdx] / 128.0) - 1.0
      const py = Math.round(waveMidY + sample * waveAmplitude)

      // 2x2 virtual pixel block for visibility
      oc.fillRect(vx * scale, py, scale * 2, scale * 2)

      // Connect vertical gaps between samples
      if (prevPy !== null && Math.abs(py - prevPy) > scale * 2) {
        const startY = Math.min(py, prevPy)
        const endY = Math.max(py, prevPy)
        oc.fillRect(vx * scale, startY, scale, endY - startY)
      }
      prevPy = py
    }

    // --- Dot-matrix grid overlay (only when scale >= 3) ---
    if (scale >= 3) {
      oc.fillStyle = "rgba(0, 0, 0, 0.15)"
      for (let x = 0; x <= lcdW; x += scale) {
        oc.fillRect(x, 0, 1, lcdH)
      }
      for (let y = 0; y <= lcdH; y += scale) {
        oc.fillRect(0, y, lcdW, 1)
      }
    }

    // --- Composite onto main canvas ---

    // Bezel background (darkest green, full canvas)
    ctx.fillStyle = DARKEST
    ctx.fillRect(0, 0, w, h)

    // LCD border/recess effect (dark green frame)
    const borderW = Math.max(2, scale)
    ctx.fillStyle = DARK
    ctx.fillRect(
      offsetX - borderW, offsetY - borderW,
      lcdW + borderW * 2, lcdH + borderW * 2
    )

    // LCD screen background (lightest green)
    ctx.fillStyle = LIGHTEST
    ctx.fillRect(offsetX, offsetY, lcdW, lcdH)

    // Draw offscreen LCD content
    ctx.drawImage(this._offscreen, offsetX, offsetY, lcdW, lcdH)

    // "DOT MATRIX WITH STEREO SOUND" text below LCD on bezel
    const fontSize = Math.max(8, Math.floor(scale * 3))
    ctx.save()
    ctx.font = `bold ${fontSize}px monospace`
    ctx.fillStyle = DARK
    ctx.textAlign = "center"
    ctx.textBaseline = "top"
    ctx.fillText(
      "DOT MATRIX WITH STEREO SOUND",
      w / 2,
      offsetY + lcdH + borderW + Math.max(4, scale * 2)
    )
    ctx.restore()
  }

  _ensureOffscreen(w, h) {
    if (this._offscreen && this._offscreen.width === w && this._offscreen.height === h) return
    this._offscreen = document.createElement("canvas")
    this._offscreen.width = w
    this._offscreen.height = h
    this._offCtx = this._offscreen.getContext("2d")
    // Initialize with lightest color (LCD "off" state)
    this._offCtx.fillStyle = LIGHTEST
    this._offCtx.fillRect(0, 0, w, h)
  }

  _drawPixelText(ctx, text, scale) {
    const charW = 5
    const charH = 5
    const charGap = 1
    const totalW = text.length * (charW + charGap) - charGap
    const startX = Math.floor((this._offscreen.width / scale - totalW) / 2)
    const startY = Math.floor((16 - charH) / 2)

    ctx.fillStyle = DARKEST
    for (let ci = 0; ci < text.length; ci++) {
      const glyph = GLYPHS[text[ci]]
      if (!glyph) continue
      const cx = startX + ci * (charW + charGap)
      for (let row = 0; row < charH; row++) {
        const bits = glyph[row]
        for (let col = 0; col < charW; col++) {
          if (bits & (0x80 >> col)) {
            ctx.fillRect((cx + col) * scale, (startY + row) * scale, scale, scale)
          }
        }
      }
    }
  }

  _mapBins(bufLen, barCount) {
    const values = new Array(barCount)
    const minFreq = 1
    const maxFreq = bufLen
    const logMin = Math.log(minFreq)
    const logMax = Math.log(maxFreq)

    for (let i = 0; i < barCount; i++) {
      const logLow = logMin + (logMax - logMin) * (i / barCount)
      const logHigh = logMin + (logMax - logMin) * ((i + 1) / barCount)
      const low = Math.floor(Math.exp(logLow))
      const high = Math.min(Math.floor(Math.exp(logHigh)), bufLen - 1)

      let sum = 0
      let count = 0
      for (let j = low; j <= high; j++) {
        sum += this._dataArray[j]
        count++
      }
      values[i] = count > 0 ? sum / count : 0
    }
    return values
  }
}

// Game Boy 4-shade palette
const DARKEST  = "#0f380f"
const DARK     = "#306230"
const LIGHT    = "#8bac0f"
const LIGHTEST = "#9bbc0f"

// 5x5 pixel font glyphs (bits 7-3 map to columns 0-4)
const GLYPHS = {
  S: [0x70, 0x80, 0x70, 0x08, 0x70],
  O: [0x70, 0x88, 0x88, 0x88, 0x70],
  U: [0x88, 0x88, 0x88, 0x88, 0x70],
  N: [0x88, 0xC8, 0xA8, 0x98, 0x88],
  D: [0xF0, 0x88, 0x88, 0x88, 0xF0]
}

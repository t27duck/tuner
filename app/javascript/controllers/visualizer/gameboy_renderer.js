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

    // Game Boy palette (4 shades only)
    const DARKEST  = "#0f380f"
    const DARK     = "#306230"
    const LIGHT    = "#8bac0f"
    const LIGHTEST = "#9bbc0f"

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

    // --- Draw onto offscreen at LCD resolution ---

    // Header bar: top 16 virtual pixels
    const headerH = 16 * scale
    oc.fillStyle = LIGHT
    oc.fillRect(0, 0, lcdW, headerH)

    // Pixel font "SOUND" label
    this._drawPixelText(oc, "SOUND", scale, DARKEST)

    // Spectrum area
    const specTop = headerH
    const waveH = 10 * scale
    const specBottom = lcdH - waveH
    const specH = specBottom - specTop

    // Logarithmic frequency bin mapping
    const binValues = this._mapBins(bufLen, this._barCount)

    // Initialize peaks if needed
    if (this._peaks.length !== this._barCount) {
      this._peaks = new Array(this._barCount).fill(0)
      this._peakVelocities = new Array(this._barCount).fill(0)
    }

    // Bar dimensions in virtual pixels
    const vBarW = 6     // virtual bar width
    const cellW = 6     // virtual cell width
    const cellH = 3     // virtual cell height
    const maxCells = Math.floor((specH / scale) / cellH)

    // Center bars horizontally
    const totalBarsW = this._barCount * vBarW * scale
    const barsOffsetX = Math.floor((lcdW - totalBarsW) / 2)

    for (let i = 0; i < this._barCount; i++) {
      const value = binValues[i] / 255
      const activeCells = Math.floor(value * maxCells)

      // Update peak
      if (activeCells >= this._peaks[i]) {
        this._peaks[i] = activeCells
        this._peakVelocities[i] = 0
      } else {
        this._peakVelocities[i] += 0.0005
        this._peaks[i] -= this._peakVelocities[i] * 60
        if (this._peaks[i] < 0) this._peaks[i] = 0
      }

      const barX = barsOffsetX + i * vBarW * scale

      // Draw discrete cells bottom-up
      for (let c = 0; c < activeCells; c++) {
        const cellY = specBottom - (c + 1) * cellH * scale
        const ratio = c / maxCells
        // Bottom 70% darkest, top 30% dark
        oc.fillStyle = ratio < 0.7 ? DARKEST : DARK
        oc.fillRect(barX, cellY, cellW * scale, cellH * scale)
      }

      // Peak indicator
      const peakCell = Math.round(this._peaks[i])
      if (peakCell > 0 && peakCell > activeCells) {
        const peakY = specBottom - (peakCell + 1) * cellH * scale
        oc.fillStyle = DARK
        oc.fillRect(barX, peakY, cellW * scale, cellH * scale)
      }
    }

    // Waveform strip: bottom 10 virtual pixels
    const waveTop = lcdH - waveH
    const waveMidY = waveTop + waveH / 2
    for (let x = 0; x < lcdW; x += scale) {
      const dataIdx = Math.floor((x / lcdW) * bufLen)
      const sample = (this._timeArray[dataIdx] / 128.0) - 1.0
      const py = Math.round(waveMidY + sample * (waveH / 2 - scale))
      oc.fillStyle = DARKEST
      oc.fillRect(x, py, scale, scale)
    }

    // Dot-matrix grid overlay (only when scale >= 3)
    if (scale >= 3) {
      oc.fillStyle = "rgba(0, 0, 0, 0.15)"
      // Vertical lines
      for (let x = 0; x <= lcdW; x += scale) {
        oc.fillRect(x, 0, 1, lcdH)
      }
      // Horizontal lines
      for (let y = 0; y <= lcdH; y += scale) {
        oc.fillRect(0, y, lcdW, 1)
      }
    }

    // --- Composite onto main canvas ---

    // Bezel background (darkest green, full canvas)
    ctx.fillStyle = DARKEST
    ctx.fillRect(0, 0, w, h)

    // LCD screen background (lightest green)
    ctx.fillStyle = LIGHTEST
    ctx.fillRect(offsetX, offsetY, lcdW, lcdH)

    // Draw offscreen LCD content
    ctx.drawImage(this._offscreen, offsetX, offsetY, lcdW, lcdH)
  }

  _ensureOffscreen(w, h) {
    if (this._offscreen && this._offscreen.width === w && this._offscreen.height === h) return
    this._offscreen = document.createElement("canvas")
    this._offscreen.width = w
    this._offscreen.height = h
    this._offCtx = this._offscreen.getContext("2d")
    // Initialize with lightest color (LCD "off" state)
    this._offCtx.fillStyle = "#9bbc0f"
    this._offCtx.fillRect(0, 0, w, h)
  }

  _drawPixelText(ctx, text, scale, color) {
    // Simple 5x5 pixel font for uppercase letters
    const glyphs = {
      S: [0x7c, 0x80, 0x7c, 0x04, 0x7c],
      O: [0x7c, 0x44, 0x44, 0x44, 0x7c],
      U: [0x44, 0x44, 0x44, 0x44, 0x7c],
      N: [0x44, 0x64, 0x54, 0x4c, 0x44],
      D: [0x78, 0x44, 0x44, 0x44, 0x78]
    }

    const charW = 5
    const charH = 7
    const charGap = 1
    const totalW = text.length * (charW + charGap) - charGap
    const startX = Math.floor((this._offscreen.width / scale - totalW) / 2)
    const startY = Math.floor((16 - charH) / 2)

    ctx.fillStyle = color
    for (let ci = 0; ci < text.length; ci++) {
      const glyph = glyphs[text[ci]]
      if (!glyph) continue
      const cx = startX + ci * (charW + charGap)
      for (let row = 0; row < charH; row++) {
        // Map 7 rows from 5-row glyph data
        const glyphRow = Math.min(Math.floor(row * 5 / charH), 4)
        const bits = glyph[glyphRow]
        for (let col = 0; col < charW; col++) {
          // Test bit from MSB
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

export class WinampRenderer {
  constructor(w, h) {
    this._dataArray = null
    this._peaks = []
    this._peakVelocities = []
    this._barCount = 28
    this.resize(w, h)
  }

  get fftSize() { return 256 }

  resize(w, h) {
    this._w = w
    this._h = h
  }

  render(ctx, analyser) {
    const bufLen = analyser.frequencyBinCount
    if (!this._dataArray || this._dataArray.length !== bufLen) {
      this._dataArray = new Uint8Array(bufLen)
    }
    analyser.getByteFrequencyData(this._dataArray)

    const w = this._w
    const h = this._h
    const barCount = this._barCount

    // Dark background
    ctx.fillStyle = "#0a0a0a"
    ctx.fillRect(0, 0, w, h)

    // Layout
    const padding = w * 0.04
    const gap = Math.max(2, w * 0.006)
    const totalGaps = gap * (barCount - 1)
    const barWidth = (w - padding * 2 - totalGaps) / barCount
    const maxBarHeight = h * 0.85
    const blockHeight = Math.max(3, Math.floor(maxBarHeight / 32))
    const blockGap = 1
    const totalBlocks = Math.floor(maxBarHeight / (blockHeight + blockGap))

    // Initialize peaks if needed
    if (this._peaks.length !== barCount) {
      this._peaks = new Array(barCount).fill(0)
      this._peakVelocities = new Array(barCount).fill(0)
    }

    // Logarithmic frequency bin mapping
    const binValues = this._mapBins(bufLen, barCount)

    for (let i = 0; i < barCount; i++) {
      const value = binValues[i] / 255
      const activeBlocks = Math.floor(value * totalBlocks)

      const x = padding + i * (barWidth + gap)

      // Update peak
      if (activeBlocks >= this._peaks[i]) {
        this._peaks[i] = activeBlocks
        this._peakVelocities[i] = 0
      } else {
        this._peakVelocities[i] += 0.0005
        this._peaks[i] -= this._peakVelocities[i] * 60
        if (this._peaks[i] < 0) this._peaks[i] = 0
      }

      // Draw blocks
      for (let b = 0; b < activeBlocks; b++) {
        const blockY = h - (b + 1) * (blockHeight + blockGap)
        const ratio = b / totalBlocks
        ctx.fillStyle = this._blockColor(ratio)
        ctx.fillRect(x, blockY, barWidth, blockHeight)
      }

      // Draw peak indicator
      const peakBlock = Math.round(this._peaks[i])
      if (peakBlock > 0 && peakBlock > activeBlocks) {
        const peakY = h - (peakBlock + 1) * (blockHeight + blockGap)
        const peakRatio = peakBlock / totalBlocks
        ctx.fillStyle = this._peakColor(peakRatio)
        ctx.fillRect(x, peakY, barWidth, blockHeight)
      }
    }
  }

  _blockColor(ratio) {
    if (ratio < 0.6) {
      // Green zone
      const t = ratio / 0.6
      const r = Math.round(30 + t * 50)
      const g = Math.round(180 + t * 50)
      const b = Math.round(20 + t * 10)
      return `rgb(${r},${g},${b})`
    } else if (ratio < 0.85) {
      // Yellow zone
      const t = (ratio - 0.6) / 0.25
      const r = Math.round(180 + t * 75)
      const g = Math.round(220 - t * 40)
      const b = Math.round(20)
      return `rgb(${r},${g},${b})`
    } else {
      // Red zone
      const t = (ratio - 0.85) / 0.15
      const r = Math.round(230 + t * 25)
      const g = Math.round(50 - t * 30)
      const b = Math.round(20)
      return `rgb(${r},${g},${b})`
    }
  }

  _peakColor(ratio) {
    if (ratio < 0.6) return "#80ff80"
    if (ratio < 0.85) return "#ffff60"
    return "#ff6040"
  }

  _mapBins(bufLen, barCount) {
    // Logarithmic mapping: lower bars get fewer bins, higher bars get more
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

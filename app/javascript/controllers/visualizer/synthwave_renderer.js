export class SynthwaveRenderer {
  constructor(w, h) {
    this._gridOffset = 0
    this._dataArray = null
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

    // Bass energy (bins 0-15)
    let bass = 0
    for (let i = 0; i < 16; i++) bass += this._dataArray[i]
    bass = bass / (16 * 255)

    // Mid energy (bins 16-63)
    let mid = 0
    for (let i = 16; i < 64; i++) mid += this._dataArray[i]
    mid = mid / (48 * 255)

    const w = this._w
    const h = this._h
    const horizon = h * 0.45

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizon)
    skyGrad.addColorStop(0, "#0a0014")
    skyGrad.addColorStop(1, "#2d1b69")
    ctx.fillStyle = skyGrad
    ctx.fillRect(0, 0, w, horizon)

    // Ground fill
    ctx.fillStyle = "#0a0014"
    ctx.fillRect(0, horizon, w, h - horizon)

    // Neon sun
    this._drawSun(ctx, w, h, horizon, bass)

    // Mountain silhouette
    this._drawMountains(ctx, w, horizon, mid)

    // Perspective grid floor
    this._drawGrid(ctx, w, h, horizon, bass)

    // CRT scan lines
    this._drawScanLines(ctx, w, h)

    this._gridOffset += 0.5 + bass * 2
  }

  _drawSun(ctx, w, h, horizon, bass) {
    const cx = w / 2
    const cy = horizon
    const radius = Math.min(w, h) * 0.14 * (1 + bass * 0.15)

    // Sun gradient
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
    grad.addColorStop(0, "#ff6a00")
    grad.addColorStop(0.4, "#ff2d78")
    grad.addColorStop(1, "#ff2d7800")

    ctx.save()
    ctx.beginPath()
    // Draw sun as horizontal slices with gaps
    const sliceCount = 8
    const gapSize = radius * 0.06
    for (let i = 0; i < sliceCount; i++) {
      const yTop = cy - radius + (i * 2 * radius) / sliceCount
      const yBot = yTop + (2 * radius) / sliceCount - gapSize
      ctx.rect(cx - radius, yTop, radius * 2, yBot - yTop)
    }
    ctx.clip()

    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  _drawMountains(ctx, w, horizon, mid) {
    ctx.beginPath()
    ctx.moveTo(0, horizon)
    const segments = 48
    for (let i = 0; i <= segments; i++) {
      const x = (i / segments) * w
      // Use mid-frequency bins to drive peak heights
      const binIndex = Math.min(Math.floor((i / segments) * 48) + 16, 127)
      const val = this._dataArray[binIndex] / 255
      const peakH = 20 + val * 60 + mid * 30
      const y = horizon - peakH * (0.5 + 0.5 * Math.sin(i * 0.7 + 1.3))
      ctx.lineTo(x, y)
    }
    ctx.lineTo(w, horizon)
    ctx.closePath()
    ctx.fillStyle = "#1a0a3e"
    ctx.fill()
  }

  _drawGrid(ctx, w, h, horizon, bass) {
    const floorH = h - horizon
    const vanishX = w / 2
    const gridSpacing = 40

    ctx.save()
    ctx.shadowBlur = 6
    ctx.shadowColor = "#00fff2"
    ctx.strokeStyle = "rgba(0, 255, 242, 0.5)"
    ctx.lineWidth = 1

    // Horizontal lines with perspective
    const lineCount = 20
    const offset = (this._gridOffset % gridSpacing) / gridSpacing

    for (let i = 0; i < lineCount; i++) {
      const t = (i - offset) / lineCount
      if (t < 0) continue
      // Perspective: lines bunch up near horizon
      const perspY = horizon + Math.pow(t, 1.8) * floorH
      if (perspY > h) continue

      // Bass warp
      const warp = Math.sin(t * Math.PI * 3 + this._gridOffset * 0.05) * bass * 8

      ctx.beginPath()
      ctx.moveTo(0, perspY + warp)
      ctx.lineTo(w, perspY + warp)
      ctx.stroke()
    }

    // Vertical lines converging to vanishing point
    const vLineCount = 24
    for (let i = 0; i <= vLineCount; i++) {
      const t = i / vLineCount
      const bottomX = t * w

      ctx.beginPath()
      ctx.moveTo(vanishX, horizon)
      ctx.lineTo(bottomX, h)
      ctx.stroke()
    }

    ctx.restore()
  }

  _drawScanLines(ctx, w, h) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.12)"
    for (let y = 0; y < h; y += 3) {
      ctx.fillRect(0, y, w, 1)
    }
  }
}

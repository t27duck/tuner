export class SynthwaveRenderer {
  constructor(w, h) {
    this._gridOffset = 0
    this._dataArray = null
    this._stars = []
    this._buildings = []
    this.resize(w, h)
  }

  get fftSize() { return 256 }

  resize(w, h) {
    this._w = w
    this._h = h
    this._generateStars(60)
    this._generateBuildings()
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

    // Treble energy (bins 64-127)
    let treble = 0
    for (let i = 64; i < bufLen; i++) treble += this._dataArray[i]
    treble = treble / (64 * 255)

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

    // Stars
    this._drawStars(ctx, treble)

    // Neon sun
    this._drawSun(ctx, w, h, horizon, bass)

    // Cityscape silhouette
    this._drawBuildings(ctx, w, horizon, mid)

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

  _drawStars(ctx, treble) {
    const now = Date.now()
    for (const star of this._stars) {
      let brightness = star.base * (0.5 + 0.5 * Math.sin(now * 0.001 * star.twinkleSpeed))
      brightness *= (0.6 + treble * 0.8)
      brightness = Math.min(brightness, 1)

      ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`
      ctx.fillRect(star.x, star.y, 2, 2)

      // Bright stars get a subtle cross glow
      if (star.base > 0.8) {
        const glowAlpha = brightness * 0.5
        ctx.fillStyle = `rgba(255, 255, 255, ${glowAlpha})`
        ctx.fillRect(star.x - 1, star.y + 0.5, 1, 1)
        ctx.fillRect(star.x + 2, star.y + 0.5, 1, 1)
        ctx.fillRect(star.x + 0.5, star.y - 1, 1, 1)
        ctx.fillRect(star.x + 0.5, star.y + 2, 1, 1)
      }
    }
  }

  _drawBuildings(ctx, w, horizon, mid) {
    for (const b of this._buildings) {
      const top = horizon - b.h
      // Building silhouette
      ctx.fillStyle = "#0d0620"
      ctx.fillRect(b.x, top, b.w, b.h)

      // Neon outline on rooftop
      ctx.strokeStyle = "rgba(0, 255, 242, 0.15)"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(b.x, top)
      ctx.lineTo(b.x + b.w, top)
      ctx.stroke()

      // Windows
      for (const win of b.windows) {
        // Deterministic hash to decide if lit — stable across frames
        const hash = ((b.x * 7 + win.row * 13 + win.col * 31) & 0xff) / 255
        const baseThreshold = 0.15
        const lit = hash < baseThreshold + mid * 1.0

        if (lit) {
          // Occasional cyan accent window, otherwise warm yellow-orange
          if (hash < 0.05) {
            ctx.fillStyle = `rgba(0, 255, 242, 0.5)`
          } else {
            ctx.fillStyle = `rgba(255, 200, 80, ${0.7 + mid * 0.3})`
          }
          ctx.fillRect(b.x + win.col, top + win.row, 3, 2)
        }
      }
    }
  }

  _generateStars(count) {
    this._stars = []
    for (let i = 0; i < count; i++) {
      this._stars.push({
        x: Math.random() * this._w,
        y: Math.random() * this._h * 0.35,
        base: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 0.5 + Math.random() * 2
      })
    }
  }

  _generateBuildings() {
    this._buildings = []
    const horizon = this._h * 0.45
    let x = 0
    while (x < this._w) {
      const bw = 30 + Math.random() * 50
      const bh = horizon * (0.15 + Math.random() * 0.30)
      const windows = []

      const marginX = 5
      const marginTop = 4
      const spacingX = 8
      const spacingY = 10

      for (let row = marginTop; row < bh - spacingY; row += spacingY) {
        for (let col = marginX; col < bw - spacingX; col += spacingX) {
          windows.push({ row, col })
        }
      }

      this._buildings.push({ x, w: bw, h: bh, windows })
      x += bw + Math.random() * 5
    }
  }
}

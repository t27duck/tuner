export class StarfieldRenderer {
  constructor(w, h) {
    this._stars = []
    this._dataArray = null
    this.resize(w, h)
    this._initStars()
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
    const cx = w / 2
    const cy = h / 2

    // Calculate energy levels
    let energy = 0
    for (let i = 0; i < bufLen; i++) energy += this._dataArray[i]
    energy = energy / (bufLen * 255)

    let bass = 0
    for (let i = 0; i < 16; i++) bass += this._dataArray[i]
    bass = bass / (16 * 255)

    // Background with radial gradient
    ctx.fillStyle = "#000000"
    ctx.fillRect(0, 0, w, h)

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.5)
    grad.addColorStop(0, "rgba(30, 15, 60, 0.3)")
    grad.addColorStop(1, "rgba(0, 0, 0, 0)")
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // Speed: gentle drift in silence, hyperspace when loud
    const speed = 0.003 + energy * 0.04
    const warpActive = bass > 0.5

    // Update and draw stars
    for (const star of this._stars) {
      // Store previous projected position for streak
      const pScreenX = cx + (star.x / star.z) * (w * 0.5)
      const pScreenY = cy + (star.y / star.z) * (h * 0.5)

      // Move star toward viewer
      star.z -= speed
      if (star.z <= 0.01) {
        this._resetStar(star)
        continue
      }

      // Current projected position
      const screenX = cx + (star.x / star.z) * (w * 0.5)
      const screenY = cy + (star.y / star.z) * (h * 0.5)

      // Reset if off screen
      if (screenX < -50 || screenX > w + 50 || screenY < -50 || screenY > h + 50) {
        this._resetStar(star)
        continue
      }

      // Brightness increases as star gets closer
      const brightness = Math.min(1.0, (1.0 - star.z) * 1.2)
      const size = Math.max(0.5, (1.0 - star.z) * 3)

      // Color: closer = warmer white, farther = cooler blue-gray
      const warmth = 1.0 - star.z
      const r = Math.round(180 + warmth * 75)
      const g = Math.round(180 + warmth * 75)
      const b = Math.round(200 + warmth * 55)

      ctx.save()

      if (warpActive) {
        // Warp mode: longer trails, blue tint, glow
        ctx.shadowBlur = 8 + bass * 12
        ctx.shadowColor = "rgba(100, 150, 255, 0.6)"
        ctx.strokeStyle = `rgba(${r - 30}, ${g - 20}, ${Math.min(255, b + 40)}, ${brightness})`
        ctx.lineWidth = size * 1.2
        ctx.beginPath()
        ctx.moveTo(pScreenX, pScreenY)
        ctx.lineTo(screenX, screenY)
        ctx.stroke()
      } else {
        // Normal mode: short streaks
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${brightness})`
        ctx.lineWidth = size

        // Streak from previous position to current
        const dx = screenX - pScreenX
        const dy = screenY - pScreenY
        const streakLen = Math.sqrt(dx * dx + dy * dy)

        if (streakLen > 1) {
          ctx.beginPath()
          ctx.moveTo(pScreenX, pScreenY)
          ctx.lineTo(screenX, screenY)
          ctx.stroke()
        } else {
          // Dot for very slow stars
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${brightness})`
          ctx.fillRect(screenX - size / 2, screenY - size / 2, size, size)
        }
      }

      ctx.restore()
    }
  }

  _initStars() {
    this._stars = []
    for (let i = 0; i < 200; i++) {
      this._stars.push(this._createStar())
    }
  }

  _createStar() {
    return {
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: Math.random() * 0.99 + 0.01
    }
  }

  _resetStar(star) {
    star.x = (Math.random() - 0.5) * 2
    star.y = (Math.random() - 0.5) * 2
    star.z = 0.9 + Math.random() * 0.1
  }
}

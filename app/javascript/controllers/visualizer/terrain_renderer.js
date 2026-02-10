export class TerrainRenderer {
  constructor(w, h) {
    this._scrollOffset = 0
    this._stars = []
    this._clouds = []
    this._bgProfile = []
    this._midProfile = []
    this._dataArray = null
    this._pixelSize = 4
    this.resize(w, h)
  }

  get fftSize() { return 256 }

  resize(w, h) {
    this._w = w
    this._h = h

    // Re-generate static elements on resize
    this._generateStars(50)
    this._generateClouds(6)
    this._generateProfile(this._bgProfile, 300)
    this._generateProfile(this._midProfile, 300)
  }

  render(ctx, analyser) {
    const bufLen = analyser.frequencyBinCount
    if (!this._dataArray || this._dataArray.length !== bufLen) {
      this._dataArray = new Uint8Array(bufLen)
    }
    analyser.getByteFrequencyData(this._dataArray)

    const w = this._w
    const h = this._h
    const px = this._pixelSize

    // Overall energy
    let energy = 0
    for (let i = 0; i < bufLen; i++) energy += this._dataArray[i]
    energy = energy / (bufLen * 255)

    // Bass energy for clouds
    let bass = 0
    for (let i = 0; i < 16; i++) bass += this._dataArray[i]
    bass = bass / (16 * 255)

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h)
    skyGrad.addColorStop(0, "#1a0533")
    skyGrad.addColorStop(0.5, "#2d1b69")
    skyGrad.addColorStop(1, "#1a3a5c")
    ctx.fillStyle = skyGrad
    ctx.fillRect(0, 0, w, h)

    // Stars
    this._drawStars(ctx, energy)

    // Background mountains (scroll 0.2x)
    this._drawLayer(ctx, this._bgProfile, 0.2, h * 0.55, h * 0.25, "#1a2744", px)

    // Midground hills (scroll 0.5x)
    this._drawLayer(ctx, this._midProfile, 0.5, h * 0.65, h * 0.2, "#1a4a2a", px)

    // Clouds
    this._drawClouds(ctx, bass)

    // Foreground terrain (audio-reactive, scroll 1x)
    this._drawForeground(ctx, px)

    this._scrollOffset += 1.2
  }

  _drawStars(ctx, energy) {
    for (const star of this._stars) {
      const brightness = 0.3 + energy * 0.7
      ctx.fillStyle = `rgba(255, 255, 255, ${brightness * star.base})`
      ctx.fillRect(star.x, star.y, 2, 2)
    }
  }

  _drawLayer(ctx, profile, parallax, baseY, maxH, color, px) {
    const w = this._w
    const offset = Math.floor(this._scrollOffset * parallax) % profile.length

    ctx.fillStyle = color
    for (let screenX = 0; screenX < w; screenX += px) {
      const pi = (Math.floor(screenX / px) + offset) % profile.length
      const height = profile[pi] * maxH
      const y = this._snap(baseY - height, px)
      ctx.fillRect(screenX, y, px, this._h - y)
    }
  }

  _drawForeground(ctx, px) {
    const w = this._w
    const h = this._h
    const bufLen = this._dataArray.length
    const baseY = h * 0.85
    const maxH = h * 0.25
    const cols = Math.ceil(w / px)

    for (let col = 0; col < cols; col++) {
      const screenX = col * px
      const binIndex = Math.floor((col / cols) * bufLen)
      const value = this._dataArray[binIndex] / 255
      const terrainH = 10 + value * maxH
      const topY = this._snap(baseY - terrainH, px)

      // Green surface blocks
      const surfaceH = Math.min(px * 3, (h - topY) * 0.2)
      ctx.fillStyle = "#2d8a2d"
      ctx.fillRect(screenX, topY, px, surfaceH)

      // Brown underground
      ctx.fillStyle = "#5c3a1e"
      ctx.fillRect(screenX, topY + surfaceH, px, h - topY - surfaceH)
    }
  }

  _drawClouds(ctx, bass) {
    ctx.fillStyle = `rgba(200, 180, 220, ${0.3 + bass * 0.3})`
    const scale = 1 + bass * 0.3

    for (const cloud of this._clouds) {
      const range = this._w + 80
      const x = (((cloud.x - this._scrollOffset * 0.1) % range) + range) % range - 40
      const w = cloud.w * scale
      const h = cloud.h * scale

      // Pixel-art cloud: 3 stacked rects
      const px = this._pixelSize
      ctx.fillRect(this._snap(x, px), this._snap(cloud.y, px), this._snap(w, px), this._snap(h * 0.4, px))
      ctx.fillRect(this._snap(x - w * 0.15, px), this._snap(cloud.y + h * 0.3, px), this._snap(w * 1.3, px), this._snap(h * 0.4, px))
      ctx.fillRect(this._snap(x + w * 0.1, px), this._snap(cloud.y + h * 0.6, px), this._snap(w * 0.8, px), this._snap(h * 0.3, px))
    }
  }

  _snap(val, px) {
    return Math.round(val / px) * px
  }

  _generateStars(count) {
    this._stars = []
    for (let i = 0; i < count; i++) {
      this._stars.push({
        x: Math.random() * this._w,
        y: Math.random() * this._h * 0.5,
        base: 0.3 + Math.random() * 0.7
      })
    }
  }

  _generateClouds(count) {
    this._clouds = []
    for (let i = 0; i < count; i++) {
      this._clouds.push({
        x: Math.random() * this._w,
        y: 30 + Math.random() * this._h * 0.25,
        w: 40 + Math.random() * 60,
        h: 15 + Math.random() * 20
      })
    }
  }

  _generateProfile(arr, length) {
    arr.length = 0
    for (let i = 0; i < length; i++) {
      // Smooth noise via layered sine
      arr.push(
        0.3 +
        0.3 * Math.sin(i * 0.05) +
        0.2 * Math.sin(i * 0.13 + 2) +
        0.15 * Math.sin(i * 0.27 + 5)
      )
    }
  }
}

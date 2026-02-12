export class DemosceneRenderer {
  constructor(w, h) {
    this._dataArray = null
    this._time = 0
    this._scrollX = 0
    this._offscreen = null
    this._offCtx = null
    this._initSinTable()
    this._initFont()
    this.resize(w, h)
  }

  get fftSize() { return 256 }

  resize(w, h) {
    this._w = w
    this._h = h
    this._offscreen = null
    this._offCtx = null
    this._pixelSize = Math.max(2, Math.floor(Math.min(w, h) / 120))
  }

  render(ctx, analyser) {
    const bufLen = analyser.frequencyBinCount
    if (!this._dataArray || this._dataArray.length !== bufLen) {
      this._dataArray = new Uint8Array(bufLen)
    }
    analyser.getByteFrequencyData(this._dataArray)

    // Energy bands
    let bass = 0
    for (let i = 0; i < 16; i++) bass += this._dataArray[i]
    bass = bass / (16 * 255)

    let mid = 0
    for (let i = 16; i < 64; i++) mid += this._dataArray[i]
    mid = mid / (48 * 255)

    let treble = 0
    for (let i = 64; i < bufLen; i++) treble += this._dataArray[i]
    treble = treble / ((bufLen - 64) * 255)

    let energy = 0
    for (let i = 0; i < bufLen; i++) energy += this._dataArray[i]
    energy = energy / (bufLen * 255)

    const w = this._w
    const h = this._h

    // Time advances with mid-frequency influence
    this._time += 0.016 * (0.8 + mid * 1.5)

    // --- Plasma background ---
    this._renderPlasma(ctx, w, h, energy)

    // --- Raster bars ---
    this._renderRasterBars(ctx, w, h, bass)

    // --- Sine-wave scroll text ---
    this._renderScrollText(ctx, w, h, treble, energy)

    // --- CRT scanlines ---
    this._drawScanLines(ctx, w, h)
  }

  _renderPlasma(ctx, w, h, energy) {
    const ps = this._pixelSize
    const pw = Math.ceil(w / ps)
    const ph = Math.ceil(h / ps)

    this._ensureOffscreen(pw, ph)
    const oc = this._offCtx
    const imageData = oc.createImageData(pw, ph)
    const data = imageData.data
    const t = this._time

    // Contrast boost from energy
    const contrast = 0.8 + energy * 0.6

    // Plasma scale factors
    const sx = 16 + Math.sin(t * 0.3) * 4
    const sy = 12 + Math.cos(t * 0.4) * 3
    const sd = 14 + Math.sin(t * 0.2) * 3
    const sr = 10 + Math.cos(t * 0.35) * 2

    for (let py = 0; py < ph; py++) {
      for (let px = 0; px < pw; px++) {
        const v1 = this._sin(((px / sx + t) * 256 / (2 * Math.PI)) & 255)
        const v2 = this._sin(((py / sy + t * 0.7) * 256 / (2 * Math.PI)) & 255)
        const v3 = this._sin((((px + py) / sd + t * 0.5) * 256 / (2 * Math.PI)) & 255)
        const dist = Math.sqrt((px - pw / 2) * (px - pw / 2) + (py - ph / 2) * (py - ph / 2))
        const v4 = this._sin(((dist / sr + t * 0.3) * 256 / (2 * Math.PI)) & 255)

        // Combine and map to palette index
        let v = (v1 + v2 + v3 + v4) / 4
        v = 0.5 + (v - 0.5) * contrast // Apply contrast
        const colorIdx = Math.floor(Math.abs(v) * 15.99) % 16
        const color = C64_PALETTE[colorIdx]

        const idx = (py * pw + px) * 4
        data[idx] = color[0]
        data[idx + 1] = color[1]
        data[idx + 2] = color[2]
        data[idx + 3] = 255
      }
    }

    oc.putImageData(imageData, 0, 0)

    // Scale up with nearest-neighbor
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(this._offscreen, 0, 0, w, h)
    ctx.imageSmoothingEnabled = true
  }

  _renderRasterBars(ctx, w, h, bass) {
    const t = this._time
    const barCount = 6
    const scanlines = 11
    const barH = scanlines * 3 // 3px per scanline
    const amplitude = h * 0.3 * (0.5 + bass * 1.0)
    const speed = 1.5 + bass * 2.0

    ctx.save()
    ctx.globalAlpha = 0.75

    const gradients = RASTER_GRADIENTS

    for (let b = 0; b < barCount; b++) {
      const phase = (b / barCount) * Math.PI * 2
      const cy = h / 2 + Math.sin(t * speed + phase) * amplitude
      const gradient = gradients[b % gradients.length]

      for (let s = 0; s < scanlines; s++) {
        const ratio = s / (scanlines - 1)
        // Symmetric: mirror around center
        const mirrorRatio = 1 - Math.abs(ratio - 0.5) * 2
        const colorIdx = Math.min(Math.floor(mirrorRatio * gradient.length), gradient.length - 1)
        const color = gradient[colorIdx]

        const y = cy - barH / 2 + s * 3
        ctx.fillStyle = color
        ctx.fillRect(0, y, w, 2)
      }
    }

    ctx.globalAlpha = 1
    ctx.restore()
  }

  _renderScrollText(ctx, w, h, treble, energy) {
    const text = "TUNER MUSIC PLAYER ... GREETINGS TO ALL CODERS AND MUSICIANS ... LONG LIVE THE DEMOSCENE ... "
    const charSize = Math.max(8, Math.floor(Math.min(w, h) / 40))
    const pixelScale = Math.max(1, Math.floor(charSize / 8))
    const charW = 8 * pixelScale
    const totalTextW = text.length * charW

    // Scroll speed driven by energy
    const scrollSpeed = (2 + energy * 4) * pixelScale
    this._scrollX = (this._scrollX + scrollSpeed) % totalTextW

    const baseY = h * 0.78
    const sineAmplitude = 15 + treble * 30
    const t = this._time

    ctx.save()

    for (let i = 0; i < text.length; i++) {
      const x = i * charW - this._scrollX
      // Wrap around
      const drawX = ((x % totalTextW) + totalTextW) % totalTextW - charW

      if (drawX < -charW || drawX > w + charW) continue

      const sinOffset = Math.sin(drawX * 0.02 + t * 3) * sineAmplitude

      // Rainbow color cycling through bright C64 colors
      const colorIdx = Math.floor((i + this._time * 5) % SCROLL_COLORS.length)
      const color = SCROLL_COLORS[colorIdx]

      this._drawBitmapChar(ctx, text[i], drawX, baseY + sinOffset, pixelScale, color)
    }

    ctx.restore()
  }

  _drawBitmapChar(ctx, ch, x, y, scale, color) {
    const code = ch.charCodeAt(0)
    const glyph = this._font[code]
    if (!glyph) return

    ctx.fillStyle = color
    for (let row = 0; row < 8; row++) {
      const bits = glyph[row]
      for (let col = 0; col < 8; col++) {
        if (bits & (0x80 >> col)) {
          ctx.fillRect(x + col * scale, y + row * scale, scale, scale)
        }
      }
    }
  }

  _drawScanLines(ctx, w, h) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.12)"
    for (let y = 0; y < h; y += 3) {
      ctx.fillRect(0, y, w, 1)
    }
  }

  _ensureOffscreen(w, h) {
    if (this._offscreen && this._offscreen.width === w && this._offscreen.height === h) return
    this._offscreen = document.createElement("canvas")
    this._offscreen.width = w
    this._offscreen.height = h
    this._offCtx = this._offscreen.getContext("2d")
  }

  _initSinTable() {
    this._sinTable = new Float32Array(256)
    for (let i = 0; i < 256; i++) {
      this._sinTable[i] = Math.sin((i / 256) * Math.PI * 2)
    }
  }

  _sin(index) {
    return this._sinTable[((Math.floor(index) % 256) + 256) % 256]
  }

  _initFont() {
    // C64-style 8x8 bitmap font for printable ASCII
    this._font = {}

    // Space
    this._font[32] = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
    // !
    this._font[33] = [0x18, 0x18, 0x18, 0x18, 0x18, 0x00, 0x18, 0x00]
    // .
    this._font[46] = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x18, 0x00]
    // A-Z
    this._font[65] = [0x3c, 0x66, 0x66, 0x7e, 0x66, 0x66, 0x66, 0x00]
    this._font[66] = [0x7c, 0x66, 0x66, 0x7c, 0x66, 0x66, 0x7c, 0x00]
    this._font[67] = [0x3c, 0x66, 0x60, 0x60, 0x60, 0x66, 0x3c, 0x00]
    this._font[68] = [0x78, 0x6c, 0x66, 0x66, 0x66, 0x6c, 0x78, 0x00]
    this._font[69] = [0x7e, 0x60, 0x60, 0x7c, 0x60, 0x60, 0x7e, 0x00]
    this._font[70] = [0x7e, 0x60, 0x60, 0x7c, 0x60, 0x60, 0x60, 0x00]
    this._font[71] = [0x3c, 0x66, 0x60, 0x6e, 0x66, 0x66, 0x3e, 0x00]
    this._font[72] = [0x66, 0x66, 0x66, 0x7e, 0x66, 0x66, 0x66, 0x00]
    this._font[73] = [0x3c, 0x18, 0x18, 0x18, 0x18, 0x18, 0x3c, 0x00]
    this._font[74] = [0x1e, 0x0c, 0x0c, 0x0c, 0x0c, 0x6c, 0x38, 0x00]
    this._font[75] = [0x66, 0x6c, 0x78, 0x70, 0x78, 0x6c, 0x66, 0x00]
    this._font[76] = [0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x7e, 0x00]
    this._font[77] = [0x63, 0x77, 0x7f, 0x6b, 0x63, 0x63, 0x63, 0x00]
    this._font[78] = [0x66, 0x76, 0x7e, 0x7e, 0x6e, 0x66, 0x66, 0x00]
    this._font[79] = [0x3c, 0x66, 0x66, 0x66, 0x66, 0x66, 0x3c, 0x00]
    this._font[80] = [0x7c, 0x66, 0x66, 0x7c, 0x60, 0x60, 0x60, 0x00]
    this._font[81] = [0x3c, 0x66, 0x66, 0x66, 0x6a, 0x6c, 0x36, 0x00]
    this._font[82] = [0x7c, 0x66, 0x66, 0x7c, 0x6c, 0x66, 0x66, 0x00]
    this._font[83] = [0x3c, 0x66, 0x60, 0x3c, 0x06, 0x66, 0x3c, 0x00]
    this._font[84] = [0x7e, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0x00]
    this._font[85] = [0x66, 0x66, 0x66, 0x66, 0x66, 0x66, 0x3c, 0x00]
    this._font[86] = [0x66, 0x66, 0x66, 0x66, 0x66, 0x3c, 0x18, 0x00]
    this._font[87] = [0x63, 0x63, 0x63, 0x6b, 0x7f, 0x77, 0x63, 0x00]
    this._font[88] = [0x66, 0x66, 0x3c, 0x18, 0x3c, 0x66, 0x66, 0x00]
    this._font[89] = [0x66, 0x66, 0x66, 0x3c, 0x18, 0x18, 0x18, 0x00]
    this._font[90] = [0x7e, 0x06, 0x0c, 0x18, 0x30, 0x60, 0x7e, 0x00]
  }
}

// C64 16-color palette
const C64_PALETTE = [
  [0, 0, 0],        // 0  Black
  [255, 255, 255],  // 1  White
  [136, 0, 0],      // 2  Red
  [170, 255, 238],  // 3  Cyan
  [204, 68, 204],   // 4  Purple
  [0, 204, 85],     // 5  Green
  [0, 0, 170],      // 6  Blue
  [238, 238, 119],  // 7  Yellow
  [221, 136, 85],   // 8  Orange
  [102, 68, 0],     // 9  Brown
  [255, 119, 119],  // 10 Light Red
  [51, 51, 51],     // 11 Dark Grey
  [119, 119, 119],  // 12 Grey
  [170, 255, 102],  // 13 Light Green
  [0, 136, 255],    // 14 Light Blue
  [187, 187, 187]   // 15 Light Grey
]

// Raster bar gradients (symmetric, using C64-ish colors)
const RASTER_GRADIENTS = [
  // Cyan scheme
  ["#000000", "#003333", "#006666", "#009999", "#00cccc", "#00ffff"],
  // Green scheme
  ["#000000", "#003300", "#006600", "#009900", "#00cc00", "#00ff00"],
  // Purple scheme
  ["#000000", "#330033", "#660066", "#990099", "#cc00cc", "#ff00ff"],
  // Orange scheme
  ["#000000", "#331100", "#663300", "#995500", "#cc7700", "#ff9900"],
  // Cyan scheme (repeat)
  ["#000000", "#003333", "#006666", "#009999", "#00cccc", "#00ffff"],
  // Green scheme (repeat)
  ["#000000", "#003300", "#006600", "#009900", "#00cc00", "#00ff00"]
]

// Bright C64 colors for scroll text rainbow
const SCROLL_COLORS = [
  "#ff0000", "#ff7700", "#ffff00", "#00ff00",
  "#00ffff", "#0088ff", "#cc00ff", "#ff00ff",
  "#ffffff", "#aaffaa", "#77ccff", "#ffaaff"
]

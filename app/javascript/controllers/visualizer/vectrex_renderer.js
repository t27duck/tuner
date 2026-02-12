export class VectrexRenderer {
  constructor(w, h) {
    this._dataArray = null
    this._rotX = 0
    this._rotY = 0
    this._rotZ = 0
    this._debris = []
    this._offscreen = null
    this._offCtx = null
    this._initDodecahedron()
    this.resize(w, h)
  }

  get fftSize() { return 256 }

  resize(w, h) {
    this._w = w
    this._h = h
    this._offscreen = null
    this._offCtx = null
    this._generateDebris(10)
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
    treble = treble / (64 * 255)

    let energy = 0
    for (let i = 0; i < bufLen; i++) energy += this._dataArray[i]
    energy = energy / (bufLen * 255)

    const w = this._w
    const h = this._h

    // Offscreen canvas for phosphor persistence
    this._ensureOffscreen(w, h)
    const oc = this._offCtx

    // Phosphor decay: overlay dark to fade previous frame
    oc.fillStyle = "rgba(0, 0, 0, 0.15)"
    oc.fillRect(0, 0, w, h)

    const cx = w / 2
    const cy = h / 2

    // Set up phosphor glow
    oc.save()
    oc.shadowBlur = 10 + energy * 14
    oc.shadowColor = "#00ff44"
    oc.strokeStyle = "#00ff44"
    oc.lineWidth = 1.5

    // Rotation driven by bass
    const rotSpeed = 0.005 + bass * 0.025
    this._rotX += rotSpeed * 0.7
    this._rotY += rotSpeed
    this._rotZ += rotSpeed * 0.3

    // Scale driven by mid
    const scale = Math.min(w, h) * 0.2 * (0.8 + mid * 0.5)

    // Ground grid
    this._drawGroundGrid(oc, w, h, cx, cy, bass, energy)

    // Project and draw dodecahedron
    this._drawDodecahedron(oc, cx, cy, scale, energy)

    // Treble sparks on vertices
    if (treble > 0.3) {
      this._drawSparks(oc, cx, cy, scale, treble)
    }

    // Orbiting debris
    this._drawDebris(oc, cx, cy, bass, mid, energy)

    oc.restore()

    // Composite offscreen buffer onto main canvas
    ctx.drawImage(this._offscreen, 0, 0, w, h)

    // CRT scanlines and vignette on main canvas (no persistence)
    this._drawScanLines(ctx, w, h)
    this._drawVignette(ctx, w, h)
  }

  _ensureOffscreen(w, h) {
    if (this._offscreen && this._offscreen.width === w && this._offscreen.height === h) return
    this._offscreen = document.createElement("canvas")
    this._offscreen.width = w
    this._offscreen.height = h
    this._offCtx = this._offscreen.getContext("2d")
  }

  _initDodecahedron() {
    // Golden ratio construction
    const phi = (1 + Math.sqrt(5)) / 2
    const invPhi = 1 / phi

    this._vertices = [
      // Cube vertices
      [ 1,  1,  1], [ 1,  1, -1], [ 1, -1,  1], [ 1, -1, -1],
      [-1,  1,  1], [-1,  1, -1], [-1, -1,  1], [-1, -1, -1],
      // Rectangle vertices on XY plane
      [0,  phi,  invPhi], [0,  phi, -invPhi], [0, -phi,  invPhi], [0, -phi, -invPhi],
      // Rectangle vertices on YZ plane
      [ invPhi, 0,  phi], [ invPhi, 0, -phi], [-invPhi, 0,  phi], [-invPhi, 0, -phi],
      // Rectangle vertices on XZ plane
      [ phi,  invPhi, 0], [ phi, -invPhi, 0], [-phi,  invPhi, 0], [-phi, -invPhi, 0]
    ]

    this._edges = [
      [0, 8], [0, 12], [0, 16],
      [1, 9], [1, 13], [1, 16],
      [2, 10], [2, 12], [2, 17],
      [3, 11], [3, 13], [3, 17],
      [4, 8], [4, 14], [4, 18],
      [5, 9], [5, 15], [5, 18],
      [6, 10], [6, 14], [6, 19],
      [7, 11], [7, 15], [7, 19],
      [8, 9], [10, 11], [12, 14], [13, 15], [16, 17], [18, 19]
    ]
  }

  _drawDodecahedron(ctx, cx, cy, scale, energy) {
    const camDist = 5
    const projected = []

    for (const [vx, vy, vz] of this._vertices) {
      const rotated = this._rotate(vx, vy, vz)
      const z = rotated[2] + camDist
      const sx = cx + (rotated[0] * scale) / z
      const sy = cy + (rotated[1] * scale) / z
      projected.push([sx, sy, z])
    }

    // Sort edges by average depth (back to front)
    const sortedEdges = this._edges
      .map(([a, b]) => [a, b, (projected[a][2] + projected[b][2]) / 2])
      .sort((a, b) => b[2] - a[2])

    // Brightness pulses with energy
    const baseBrightness = 0.6 + energy * 0.4

    for (const [a, b, avgZ] of sortedEdges) {
      const depthAlpha = Math.max(0.15, Math.min(1, 1.2 - avgZ * 0.1))
      const alpha = depthAlpha * baseBrightness

      ctx.globalAlpha = alpha
      ctx.beginPath()
      ctx.moveTo(projected[a][0], projected[a][1])
      ctx.lineTo(projected[b][0], projected[b][1])
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    this._projectedVertices = projected
  }

  _drawSparks(ctx, cx, cy, scale, treble) {
    const sparkLen = 4 + treble * 12
    ctx.save()
    ctx.shadowBlur = 20
    ctx.shadowColor = "#88ffaa"
    ctx.strokeStyle = "#88ffaa"
    ctx.lineWidth = 1

    for (let i = 0; i < this._projectedVertices.length; i++) {
      if (Math.random() > treble) continue
      const [sx, sy] = this._projectedVertices[i]
      const angle = Math.random() * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.lineTo(sx + Math.cos(angle) * sparkLen, sy + Math.sin(angle) * sparkLen)
      ctx.stroke()
    }
    ctx.restore()
  }

  _drawGroundGrid(ctx, w, h, cx, cy, bass, energy) {
    const horizon = cy + h * 0.05
    const floorH = h - horizon
    if (floorH <= 0) return

    ctx.save()
    const brightness = 0.2 + energy * 0.3
    ctx.shadowBlur = 4 + energy * 6
    ctx.shadowColor = `rgba(0, 255, 68, ${brightness})`
    ctx.strokeStyle = `rgba(0, 255, 68, ${brightness})`
    ctx.lineWidth = 1

    // Horizontal lines receding into distance
    const lineCount = 14
    const scrollSpeed = 0.4 + bass * 1.5
    this._gridScroll = ((this._gridScroll || 0) + scrollSpeed) % 1

    for (let i = 0; i < lineCount; i++) {
      const t = (i + this._gridScroll) / lineCount
      const perspY = horizon + Math.pow(t, 2) * floorH
      if (perspY > h) continue

      // Fade lines near horizon
      const lineAlpha = Math.pow(t, 0.5) * brightness
      ctx.globalAlpha = lineAlpha
      ctx.beginPath()
      ctx.moveTo(0, perspY)
      ctx.lineTo(w, perspY)
      ctx.stroke()
    }

    // Vertical lines converging to vanishing point
    const vLineCount = 16
    ctx.globalAlpha = brightness * 0.8
    for (let i = 0; i <= vLineCount; i++) {
      const t = i / vLineCount
      const bottomX = t * w

      ctx.beginPath()
      ctx.moveTo(cx, horizon)
      ctx.lineTo(bottomX, h)
      ctx.stroke()
    }

    ctx.globalAlpha = 1
    ctx.restore()
  }

  _drawDebris(ctx, cx, cy, bass, mid, energy) {
    const now = Date.now() * 0.001

    for (const d of this._debris) {
      const orbitSpeed = d.speed * (0.5 + bass * 1.5)
      const angle = now * orbitSpeed + d.phase

      // 3D tilted orbit
      const flatX = Math.cos(angle) * d.dist * (0.9 + mid * 0.3)
      const flatY = Math.sin(angle) * d.dist * (0.9 + mid * 0.3)
      const tiltCos = Math.cos(d.tilt)
      const tiltSin = Math.sin(d.tilt)

      const dx = cx + flatX * Math.cos(d.tiltAxis) - flatY * Math.sin(d.tiltAxis) * tiltCos
      const dy = cy + flatX * Math.sin(d.tiltAxis) + flatY * Math.cos(d.tiltAxis) * tiltCos
      const dz = flatY * tiltSin

      // Depth-based brightness
      const depthAlpha = 0.4 + (dz / d.dist + 1) * 0.3
      const brightness = depthAlpha * (0.5 + energy * 0.5)
      ctx.globalAlpha = Math.max(0.15, Math.min(1, brightness))

      const rot = now * d.spinSpeed

      ctx.save()
      ctx.translate(dx, dy)
      ctx.rotate(rot)

      ctx.beginPath()
      const size = d.size
      const sides = d.sides
      for (let i = 0; i < sides; i++) {
        const a = (Math.PI * 2 * i) / sides + (sides === 4 ? Math.PI / 4 : 0)
        const px = Math.cos(a) * size
        const py = Math.sin(a) * size
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.stroke()
      ctx.restore()
    }
    ctx.globalAlpha = 1
  }

  _rotate(x, y, z) {
    // Rotate X
    let y1 = y * Math.cos(this._rotX) - z * Math.sin(this._rotX)
    let z1 = y * Math.sin(this._rotX) + z * Math.cos(this._rotX)
    // Rotate Y
    let x2 = x * Math.cos(this._rotY) + z1 * Math.sin(this._rotY)
    let z2 = -x * Math.sin(this._rotY) + z1 * Math.cos(this._rotY)
    // Rotate Z
    let x3 = x2 * Math.cos(this._rotZ) - y1 * Math.sin(this._rotZ)
    let y3 = x2 * Math.sin(this._rotZ) + y1 * Math.cos(this._rotZ)
    return [x3, y3, z2]
  }

  _drawScanLines(ctx, w, h) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.12)"
    for (let y = 0; y < h; y += 3) {
      ctx.fillRect(0, y, w, 1)
    }
  }

  _drawVignette(ctx, w, h) {
    const cx = w / 2
    const cy = h / 2
    const radius = Math.max(w, h) * 0.7
    const grad = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius)
    grad.addColorStop(0, "rgba(0, 0, 0, 0)")
    grad.addColorStop(1, "rgba(0, 0, 0, 0.6)")
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
  }

  _generateDebris(count) {
    this._debris = []
    const minDist = Math.min(this._w, this._h) * 0.25
    const maxDist = Math.min(this._w, this._h) * 0.45
    for (let i = 0; i < count; i++) {
      this._debris.push({
        dist: minDist + Math.random() * (maxDist - minDist),
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.5,
        spinSpeed: 0.5 + Math.random() * 2,
        size: 4 + Math.random() * 8,
        sides: Math.random() < 0.5 ? 3 : 4,
        tilt: Math.random() * Math.PI * 0.4 - Math.PI * 0.2,
        tiltAxis: Math.random() * Math.PI * 2
      })
    }
  }
}

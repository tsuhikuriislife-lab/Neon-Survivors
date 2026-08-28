import { drawPolygon } from './Utils.js';
import { state } from './gameState.js';

// ============================================================================
// VECTOR FONT DEFINITIONS (Normalized coordinates [0..1] x [0..1.4])
// ============================================================================
export const VECTOR_GLYPHS = {
  'A': [
    [[0, 1.4], [0, 0.4], [0.35, 0], [0.65, 0], [1, 0.4], [1, 1.4]],
    [[0, 0.75], [1, 0.75]]
  ],
  'B': [
    [[0, 1.4], [0, 0], [0.65, 0], [1, 0.25], [0.65, 0.65], [0, 0.65], [0.65, 0.65], [1, 1.05], [0.65, 1.4], [0, 1.4]]
  ],
  'C': [
    [[1, 0.25], [0.75, 0], [0.25, 0], [0, 0.25], [0, 1.15], [0.25, 1.4], [0.75, 1.4], [1, 1.15]]
  ],
  'D': [
    [[0, 1.4], [0, 0], [0.55, 0], [1, 0.35], [1, 1.05], [0.55, 1.4], [0, 1.4]]
  ],
  'E': [
    [[1, 0], [0, 0], [0, 1.4], [1, 1.4]],
    [[0, 0.68], [0.75, 0.68]]
  ],
  'F': [
    [[1, 0], [0, 0], [0, 1.4]],
    [[0, 0.68], [0.75, 0.68]]
  ],
  'G': [
    [[1, 0.25], [0.75, 0], [0.25, 0], [0, 0.25], [0, 1.15], [0.25, 1.4], [0.75, 1.4], [1, 1.15], [1, 0.7], [0.5, 0.7]]
  ],
  'H': [
    [[0, 0], [0, 1.4]],
    [[1, 0], [1, 1.4]],
    [[0, 0.7], [1, 0.7]]
  ],
  'I': [
    [[0.2, 0], [0.8, 0]],
    [[0.5, 0], [0.5, 1.4]],
    [[0.2, 1.4], [0.8, 1.4]]
  ],
  'J': [
    [[0.8, 0], [0.8, 1.15], [0.55, 1.4], [0.2, 1.4], [0, 1.15]]
  ],
  'K': [
    [[0, 0], [0, 1.4]],
    [[1, 0], [0, 0.7], [1, 1.4]]
  ],
  'L': [
    [[0, 0], [0, 1.4], [1, 1.4]]
  ],
  'M': [
    [[0, 1.4], [0, 0], [0.5, 0.7], [1, 0], [1, 1.4]]
  ],
  'N': [
    [[0, 1.4], [0, 0], [1, 1.4], [1, 0]]
  ],
  'O': [
    [[0.3, 0], [0.7, 0], [1, 0.3], [1, 1.1], [0.7, 1.4], [0.3, 1.4], [0, 1.1], [0, 0.3], [0.3, 0]]
  ],
  'P': [
    [[0, 1.4], [0, 0], [0.65, 0], [1, 0.32], [0.65, 0.7], [0, 0.7]]
  ],
  'Q': [
    [[0.3, 0], [0.7, 0], [1, 0.3], [1, 1.1], [0.7, 1.4], [0.3, 1.4], [0, 1.1], [0, 0.3], [0.3, 0]],
    [[0.6, 0.95], [1.05, 1.48]]
  ],
  'R': [
    [[0, 1.4], [0, 0], [0.65, 0], [1, 0.32], [0.65, 0.7], [0, 0.7]],
    [[0.55, 0.7], [1, 1.4]]
  ],
  'S': [
    [[1, 0.25], [0.75, 0], [0.25, 0], [0, 0.3], [0.25, 0.65], [0.75, 0.75], [1, 1.1], [0.75, 1.4], [0.25, 1.4], [0, 1.15]]
  ],
  'T': [
    [[0, 0], [1, 0]],
    [[0.5, 0], [0.5, 1.4]]
  ],
  'U': [
    [[0, 0], [0, 1.1], [0.25, 1.4], [0.75, 1.4], [1, 1.1], [1, 0]]
  ],
  'V': [
    [[0, 0], [0.5, 1.4], [1, 0]]
  ],
  'W': [
    [[0, 0], [0.2, 1.4], [0.5, 0.7], [0.8, 1.4], [1, 0]]
  ],
  'X': [
    [[0, 0], [1, 1.4]],
    [[1, 0], [0, 1.4]]
  ],
  'Y': [
    [[0, 0], [0.5, 0.7], [1, 0]],
    [[0.5, 0.7], [0.5, 1.4]]
  ],
  'Z': [
    [[0, 0], [1, 0], [0, 1.4], [1, 1.4]]
  ],
  ' ': []
};

// ============================================================================
// VECTOR TITLE RENDERER
// ============================================================================
export class VectorTitleRenderer {
  constructor(text = "NEON SURVIVORS") {
    this.text = text;
    this.time = 0;
  }

  update(dt) {
    this.time += dt;
  }

  draw(ctx, screenWidth, screenHeight) {
    const time = this.time;
    
    // Split into 2 lines for high-impact title display
    const lines = ["NEON", "SURVIVORS"];
    
    // Compute letter dimensions based on screen width
    const maxLineLength = Math.max(...lines.map(l => l.length));
    const targetTitleWidth = Math.min(screenWidth * 0.88, 760);
    const letterWidth = Math.min(68, targetTitleWidth / (maxLineLength * 1.25));
    const letterHeight = letterWidth * 1.35;
    const letterSpacing = letterWidth * 0.28;
    const lineGap = letterHeight * 0.28;

    // Centered vertically in top area
    const totalTitleHeight = lines.length * letterHeight + (lines.length - 1) * lineGap;
    const startY = Math.max(50, screenHeight * 0.22 - totalTitleHeight / 2);

    let globalCharIndex = 0;

    lines.forEach((line, lineIdx) => {
      const lineWidth = line.length * letterWidth + (line.length - 1) * letterSpacing;
      let curX = (screenWidth - lineWidth) / 2;
      const curY = startY + lineIdx * (letterHeight + lineGap);

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const glyph = VECTOR_GLYPHS[char];

        // Progressive rainbow / neon color cycling
        const hue = (time * 55 + globalCharIndex * 28) % 360;
        const color = `hsl(${hue}, 100%, 65%)`;

        // Smooth individual lateral, vertical and tilt movement
        const lateralX = Math.sin(time * 2.2 + globalCharIndex * 0.75) * (letterWidth * 0.12);
        const swayY = Math.cos(time * 1.7 + globalCharIndex * 0.6) * (letterHeight * 0.08);
        const rot = Math.sin(time * 1.4 + globalCharIndex * 0.5) * 0.035;

        ctx.save();
        ctx.translate(curX + letterWidth / 2 + lateralX, curY + letterHeight / 2 + swayY);
        ctx.rotate(rot);
        ctx.translate(-letterWidth / 2, -letterHeight / 2);

        if (glyph && glyph.length > 0) {
          // 1. Outer Bloom
          ctx.save();
          ctx.shadowColor = color;
          ctx.shadowBlur = 18;
          ctx.strokeStyle = color;
          ctx.lineWidth = Math.max(3, letterWidth * 0.11);
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.globalAlpha = 0.45;
          glyph.forEach(stroke => {
            ctx.beginPath();
            stroke.forEach((pt, pIdx) => {
              const px = pt[0] * letterWidth;
              const py = (pt[1] / 1.4) * letterHeight;
              if (pIdx === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            });
            ctx.stroke();
          });
          ctx.restore();

          // 2. Crisp Neon Tube
          ctx.save();
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;
          ctx.strokeStyle = color;
          ctx.lineWidth = Math.max(2, letterWidth * 0.065);
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.globalAlpha = 0.95;
          glyph.forEach(stroke => {
            ctx.beginPath();
            stroke.forEach((pt, pIdx) => {
              const px = pt[0] * letterWidth;
              const py = (pt[1] / 1.4) * letterHeight;
              if (pIdx === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            });
            ctx.stroke();
          });
          ctx.restore();

          // 3. Inner White Core
          ctx.save();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = Math.max(1, letterWidth * 0.025);
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.globalAlpha = 0.9;
          glyph.forEach(stroke => {
            ctx.beginPath();
            stroke.forEach((pt, pIdx) => {
              const px = pt[0] * letterWidth;
              const py = (pt[1] / 1.4) * letterHeight;
              if (pIdx === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            });
            ctx.stroke();
          });
          ctx.restore();

          // 4. Luminous Vertex Nodes
          ctx.save();
          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = color;
          ctx.shadowBlur = 6;
          glyph.forEach(stroke => {
            stroke.forEach(pt => {
              const px = pt[0] * letterWidth;
              const py = (pt[1] / 1.4) * letterHeight;
              ctx.beginPath();
              ctx.arc(px, py, Math.max(1.5, letterWidth * 0.035), 0, Math.PI * 2);
              ctx.fill();
            });
          });
          ctx.restore();
        }

        ctx.restore();

        curX += letterWidth + letterSpacing;
        globalCharIndex++;
      }
    });
  }
}

// ============================================================================
// MENU BACKGROUND SHOWCASE SIMULATION
// ============================================================================
export class MenuBackgroundShowcase {
  constructor() {
    this.time = 0;
    this.initEntities();
  }

  initEntities() {
    const W = state.width;
    const H = state.height;

    // 1. AMALGAM (Stage 1 root, drawn at the very bottom layer)
    this.amalgam = {
      x: W * 0.5,
      y: H * 0.52,
      vx: 0.9,
      vy: 0.7,
      radius: 160,
      angle: 0,
      color: "#ff0033"
    };

    // 2. DEVOURER OF TAX (45 complete segments with rainbow gradient)
    this.devourer = {
      x: W * 0.35,
      y: H * 0.3,
      angle: 0,
      speed: 2.8,
      turnRate: 0.015,
      turnTimer: 0,
      radius: 36,
      segmentLength: 36,
      segmentCount: 45,
      segments: []
    };
    for (let i = 0; i < this.devourer.segmentCount; i++) {
      this.devourer.segments.push({
        x: this.devourer.x - i * this.devourer.segmentLength,
        y: this.devourer.y,
        angle: 0
      });
    }

    // 3. CARLOS (15 segments, lime green)
    this.carlos = {
      x: W * 0.75,
      y: H * 0.35,
      angle: Math.PI * 0.75,
      speed: 2.4,
      radius: 36,
      segmentLength: 36,
      segmentCount: 15,
      color: "#00ff88",
      segments: []
    };
    for (let i = 0; i < this.carlos.segmentCount; i++) {
      this.carlos.segments.push({
        x: this.carlos.x - i * this.carlos.segmentLength,
        y: this.carlos.y,
        angle: this.carlos.angle
      });
    }

    // 4. SEBASTIAN (15 segments, purple)
    this.sebastian = {
      x: W * 0.25,
      y: H * 0.75,
      angle: -Math.PI * 0.25,
      speed: 2.5,
      radius: 36,
      segmentLength: 36,
      segmentCount: 15,
      color: "#a855f7",
      segments: []
    };
    for (let i = 0; i < this.sebastian.segmentCount; i++) {
      this.sebastian.segments.push({
        x: this.sebastian.x - i * this.sebastian.segmentLength,
        y: this.sebastian.y,
        angle: this.sebastian.angle
      });
    }

    // 5. KYREN (Peaceful wandering dual-octagon, no charge/dash, no Denzel)
    this.kyren = {
      x: W * 0.7,
      y: H * 0.7,
      vx: 1.1,
      vy: -0.9,
      angle: 0,
      innerAngle: 0,
      radius: 135,
      color: "#00ffcc"
    };

    // 6. SWARMERS (Flock keeping flocking / boid behavior)
    this.swarmers = [];
    const swarmerCount = 12;
    const flockOriginX = W * 0.45;
    const flockOriginY = H * 0.4;
    for (let i = 0; i < swarmerCount; i++) {
      this.swarmers.push({
        x: flockOriginX + (Math.random() * 120 - 60),
        y: flockOriginY + (Math.random() * 120 - 60),
        vx: 2.8 + Math.random() * 0.8,
        vy: (Math.random() - 0.5) * 1.5,
        radius: 12,
        sides: 3,
        color: "#ff9900",
        angle: 0
      });
    }

    // 7. STANDARD & SPECIAL ROAMING ENEMIES
    this.roamingEnemies = [
      // Standard Small (triangles, pink)
      { x: W * 0.2, y: H * 0.4, vx: 1.2, vy: 1.0, radius: 18, sides: 3, color: "#ff3366", angle: 0 },
      { x: W * 0.8, y: H * 0.6, vx: -1.3, vy: -0.8, radius: 18, sides: 3, color: "#ff3366", angle: 0 },
      // Standard Medium (pentagons, amber)
      { x: W * 0.6, y: H * 0.25, vx: -0.9, vy: 1.1, radius: 24, sides: 5, color: "#ffbb00", angle: 0 },
      { x: W * 0.3, y: H * 0.8, vx: 1.0, vy: -0.9, radius: 24, sides: 5, color: "#ffbb00", angle: 0 },
      // Standard Large (hexagons, purple)
      { x: W * 0.85, y: H * 0.8, vx: -0.8, vy: -0.7, radius: 30, sides: 6, color: "#a855f7", angle: 0 },
      // Ranger (diamond, cyan)
      { x: W * 0.15, y: H * 0.6, vx: 1.4, vy: -0.7, radius: 22, sides: 4, color: "#00ccff", angle: Math.PI / 4 },
      // Mother (octagon, green) & Children
      { x: W * 0.5, y: H * 0.18, vx: 0.8, vy: 0.6, radius: 34, sides: 8, color: "#00ff66", angle: 0 },
      { x: W * 0.52, y: H * 0.16, vx: 1.1, vy: 0.7, radius: 14, sides: 3, color: "#00ff00", angle: 0 },
      { x: W * 0.48, y: H * 0.20, vx: 0.7, vy: 0.9, radius: 14, sides: 3, color: "#00ff00", angle: 0 }
    ];
  }

  update(dt) {
    this.time += dt;
    const W = state.width;
    const H = state.height;

    // --- 1. Update Amalgam ---
    const a = this.amalgam;
    a.angle += 0.012;
    a.x += a.vx;
    a.y += a.vy;
    if (a.x <= a.radius + 50) { a.x = a.radius + 50; a.vx = Math.abs(a.vx); }
    else if (a.x >= W - a.radius - 50) { a.x = W - a.radius - 50; a.vx = -Math.abs(a.vx); }
    if (a.y <= a.radius + 50) { a.y = a.radius + 50; a.vy = Math.abs(a.vy); }
    else if (a.y >= H - a.radius - 50) { a.y = H - a.radius - 50; a.vy = -Math.abs(a.vy); }

    // --- 2. Update Devourer of Tax ---
    const dev = this.devourer;
    dev.turnTimer++;
    if (dev.turnTimer % 90 === 0) {
      dev.targetHeading = Math.random() * Math.PI * 2;
    }
    if (dev.targetHeading !== undefined) {
      let diff = dev.targetHeading - dev.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      dev.angle += Math.sign(diff) * Math.min(dev.turnRate, Math.abs(diff));
    } else {
      dev.angle += 0.008;
    }

    // Boundary steering
    if (dev.x < 250) dev.angle = 0;
    else if (dev.x > W - 250) dev.angle = Math.PI;
    if (dev.y < 250) dev.angle = Math.PI / 2;
    else if (dev.y > H - 250) dev.angle = -Math.PI / 2;

    dev.x += Math.cos(dev.angle) * dev.speed;
    dev.y += Math.sin(dev.angle) * dev.speed;

    dev.segments[0].x = dev.x;
    dev.segments[0].y = dev.y;
    dev.segments[0].angle = dev.angle;

    for (let i = 1; i < dev.segmentCount; i++) {
      const prev = dev.segments[i - 1];
      const cur = dev.segments[i];
      const ang = Math.atan2(prev.y - cur.y, prev.x - cur.x);
      cur.x = prev.x - Math.cos(ang) * dev.segmentLength;
      cur.y = prev.y - Math.sin(ang) * dev.segmentLength;
      cur.angle = ang;
    }

    // --- 3. Update Carlos ---
    const c = this.carlos;
    c.angle += Math.sin(this.time * 0.7) * 0.015;
    if (c.x < 150) c.angle = 0;
    else if (c.x > W - 150) c.angle = Math.PI;
    if (c.y < 150) c.angle = Math.PI / 2;
    else if (c.y > H - 150) c.angle = -Math.PI / 2;

    c.x += Math.cos(c.angle) * c.speed;
    c.y += Math.sin(c.angle) * c.speed;
    c.segments[0].x = c.x;
    c.segments[0].y = c.y;
    c.segments[0].angle = c.angle;
    for (let i = 1; i < c.segmentCount; i++) {
      const prev = c.segments[i - 1];
      const cur = c.segments[i];
      const ang = Math.atan2(prev.y - cur.y, prev.x - cur.x);
      cur.x = prev.x - Math.cos(ang) * c.segmentLength;
      cur.y = prev.y - Math.sin(ang) * c.segmentLength;
      cur.angle = ang;
    }

    // --- 4. Update Sebastian ---
    const s = this.sebastian;
    s.angle += Math.cos(this.time * 0.6) * 0.018;
    if (s.x < 150) s.angle = 0;
    else if (s.x > W - 150) s.angle = Math.PI;
    if (s.y < 150) s.angle = Math.PI / 2;
    else if (s.y > H - 150) s.angle = -Math.PI / 2;

    s.x += Math.cos(s.angle) * s.speed;
    s.y += Math.sin(s.angle) * s.speed;
    s.segments[0].x = s.x;
    s.segments[0].y = s.y;
    s.segments[0].angle = s.angle;
    for (let i = 1; i < s.segmentCount; i++) {
      const prev = s.segments[i - 1];
      const cur = s.segments[i];
      const ang = Math.atan2(prev.y - cur.y, prev.x - cur.x);
      cur.x = prev.x - Math.cos(ang) * s.segmentLength;
      cur.y = prev.y - Math.sin(ang) * s.segmentLength;
      cur.angle = ang;
    }

    // --- 5. Update Kyren (Peaceful wandering) ---
    const k = this.kyren;
    k.angle += 0.018;
    k.innerAngle -= 0.035;
    k.x += k.vx;
    k.y += k.vy;
    if (k.x <= k.radius + 80) { k.x = k.radius + 80; k.vx = Math.abs(k.vx); }
    else if (k.x >= W - k.radius - 80) { k.x = W - k.radius - 80; k.vx = -Math.abs(k.vx); }
    if (k.y <= k.radius + 80) { k.y = k.radius + 80; k.vy = Math.abs(k.vy); }
    else if (k.y >= H - k.radius - 80) { k.y = H - k.radius - 80; k.vy = -Math.abs(k.vy); }

    // --- 6. Update Swarmers (Flocking behavior) ---
    // Compute flock center and average velocity
    let avgX = 0, avgY = 0, avgVx = 0, avgVy = 0;
    const n = this.swarmers.length;
    for (let sw of this.swarmers) {
      avgX += sw.x; avgY += sw.y;
      avgVx += sw.vx; avgVy += sw.vy;
    }
    avgX /= n; avgY /= n;
    avgVx /= n; avgVy /= n;

    for (let i = 0; i < n; i++) {
      const sw = this.swarmers[i];

      // Cohesion: pull gently toward center
      let cohX = (avgX - sw.x) * 0.002;
      let cohY = (avgY - sw.y) * 0.002;

      // Alignment: match average flock velocity
      let aliX = (avgVx - sw.vx) * 0.03;
      let aliY = (avgVy - sw.vy) * 0.03;

      // Separation: push away from very close neighbors
      let sepX = 0, sepY = 0;
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          const other = this.swarmers[j];
          const d = Math.hypot(sw.x - other.x, sw.y - other.y);
          if (d > 0 && d < 35) {
            sepX += (sw.x - other.x) / d * (35 - d) * 0.06;
            sepY += (sw.y - other.y) / d * (35 - d) * 0.06;
          }
        }
      }

      sw.vx += cohX + aliX + sepX;
      sw.vy += cohY + aliY + sepY;

      // Gentle arena wrapping / boundary turn
      if (sw.x < 100) sw.vx += 0.2;
      else if (sw.x > W - 100) sw.vx -= 0.2;
      if (sw.y < 100) sw.vy += 0.2;
      else if (sw.y > H - 100) sw.vy -= 0.2;

      // Clamp speed
      const spd = Math.hypot(sw.vx, sw.vy);
      const targetSpd = 3.2;
      if (spd > 0) {
        sw.vx = (sw.vx / spd) * targetSpd;
        sw.vy = (sw.vy / spd) * targetSpd;
      }

      sw.x += sw.vx;
      sw.y += sw.vy;
      sw.angle = Math.atan2(sw.vy, sw.vx);
    }

    // --- 7. Update Roaming Enemies ---
    for (let e of this.roamingEnemies) {
      e.angle += 0.02;
      e.x += e.vx;
      e.y += e.vy;
      if (e.x <= e.radius + 30) { e.x = e.radius + 30; e.vx = Math.abs(e.vx); }
      else if (e.x >= W - e.radius - 30) { e.x = W - e.radius - 30; e.vx = -Math.abs(e.vx); }
      if (e.y <= e.radius + 30) { e.y = e.radius + 30; e.vy = Math.abs(e.vy); }
      else if (e.y >= H - e.radius - 30) { e.y = H - e.radius - 30; e.vy = -Math.abs(e.vy); }
    }
  }

  draw(ctx) {
    // ------------------------------------------------------------------------
    // LAYER 1 (BOTTOM-MOST): AMALGAM (Main Phase 1)
    // ------------------------------------------------------------------------
    const a = this.amalgam;
    drawPolygon(ctx, a.x, a.y, a.radius, 10, a.angle, a.color, 16, "rgba(255, 0, 51, 0.2)");
    // Inner pulse ring
    const pulseRadius = a.radius * (0.55 + Math.sin(this.time * 3) * 0.05);
    drawPolygon(ctx, a.x, a.y, pulseRadius, 10, -a.angle * 1.5, "#ff3366", 8, "rgba(255, 51, 102, 0.15)");

    // ------------------------------------------------------------------------
    // LAYER 2: DEVOURER OF TAX (Full 45 segments with Rainbow Hue)
    // ------------------------------------------------------------------------
    const dev = this.devourer;
    for (let i = dev.segmentCount - 1; i >= 0; i--) {
      const seg = dev.segments[i];
      const hue = (i / dev.segmentCount) * 360;
      const color = `hsl(${hue}, 100%, 55%)`;
      drawPolygon(ctx, seg.x, seg.y, dev.radius, 3, seg.angle, color, 10, color.replace('hsl', 'hsla').replace(')', ', 0.3)'));
    }

    // ------------------------------------------------------------------------
    // LAYER 3: CARLOS & SEBASTIAN (15 segments each)
    // ------------------------------------------------------------------------
    const c = this.carlos;
    for (let i = c.segmentCount - 1; i >= 0; i--) {
      const seg = c.segments[i];
      drawPolygon(ctx, seg.x, seg.y, c.radius, 3, seg.angle, c.color, 8, "rgba(0, 255, 136, 0.2)");
    }

    const s = this.sebastian;
    for (let i = s.segmentCount - 1; i >= 0; i--) {
      const seg = s.segments[i];
      drawPolygon(ctx, seg.x, seg.y, s.radius, 3, seg.angle, s.color, 8, "rgba(168, 85, 247, 0.2)");
    }

    // ------------------------------------------------------------------------
    // LAYER 4: KYREN (Peaceful dual-rotating octagons)
    // ------------------------------------------------------------------------
    const k = this.kyren;
    drawPolygon(ctx, k.x, k.y, k.radius, 8, k.angle, k.color, 16, "rgba(0, 255, 204, 0.1)");
    drawPolygon(ctx, k.x, k.y, k.radius * 0.52, 8, k.innerAngle, "#ffffff", 10, "rgba(255, 255, 255, 0.2)");

    // ------------------------------------------------------------------------
    // LAYER 5: ROAMING STANDARD & SPECIAL ENEMIES
    // ------------------------------------------------------------------------
    for (let e of this.roamingEnemies) {
      drawPolygon(ctx, e.x, e.y, e.radius, e.sides, e.angle, e.color, 8, "rgba(20, 0, 30, 0.3)");
    }

    // ------------------------------------------------------------------------
    // LAYER 6: SWARMERS (Flock)
    // ------------------------------------------------------------------------
    for (let sw of this.swarmers) {
      drawPolygon(ctx, sw.x, sw.y, sw.radius, sw.sides, sw.angle, sw.color, 6, "rgba(255, 153, 0, 0.25)");
    }
  }
}


import { state } from './gameState.js';
import { uiLayer, worldLayer } from '../main.js';
import { textures, getOrCachePolygon } from './TextureCache.js';

// ============================================================================
// VECTOR FONT DEFINITIONS (Normalized coordinates [0..1] x [0..1.4])
// ============================================================================
export const VECTOR_GLYPHS = {
  'A': [ [[0, 1.4], [0, 0.4], [0.35, 0], [0.65, 0], [1, 0.4], [1, 1.4]], [[0, 0.75], [1, 0.75]] ],
  'B': [ [[0, 1.4], [0, 0], [0.65, 0], [1, 0.25], [0.65, 0.65], [0, 0.65], [0.65, 0.65], [1, 1.05], [0.65, 1.4], [0, 1.4]] ],
  'C': [ [[1, 0.25], [0.75, 0], [0.25, 0], [0, 0.25], [0, 1.15], [0.25, 1.4], [0.75, 1.4], [1, 1.15]] ],
  'D': [ [[0, 1.4], [0, 0], [0.55, 0], [1, 0.35], [1, 1.05], [0.55, 1.4], [0, 1.4]] ],
  'E': [ [[1, 0], [0, 0], [0, 1.4], [1, 1.4]], [[0, 0.68], [0.75, 0.68]] ],
  'F': [ [[1, 0], [0, 0], [0, 1.4]], [[0, 0.68], [0.75, 0.68]] ],
  'G': [ [[1, 0.25], [0.75, 0], [0.25, 0], [0, 0.25], [0, 1.15], [0.25, 1.4], [0.75, 1.4], [1, 1.15], [1, 0.7], [0.5, 0.7]] ],
  'H': [ [[0, 0], [0, 1.4]], [[1, 0], [1, 1.4]], [[0, 0.7], [1, 0.7]] ],
  'I': [ [[0.2, 0], [0.8, 0]], [[0.5, 0], [0.5, 1.4]], [[0.2, 1.4], [0.8, 1.4]] ],
  'J': [ [[0.8, 0], [0.8, 1.15], [0.55, 1.4], [0.2, 1.4], [0, 1.15]] ],
  'K': [ [[0, 0], [0, 1.4]], [[1, 0], [0, 0.7], [1, 1.4]] ],
  'L': [ [[0, 0], [0, 1.4], [1, 1.4]] ],
  'M': [ [[0, 1.4], [0, 0], [0.5, 0.7], [1, 0], [1, 1.4]] ],
  'N': [ [[0, 1.4], [0, 0], [1, 1.4], [1, 0]] ],
  'O': [ [[0.3, 0], [0.7, 0], [1, 0.3], [1, 1.1], [0.7, 1.4], [0.3, 1.4], [0, 1.1], [0, 0.3], [0.3, 0]] ],
  'P': [ [[0, 1.4], [0, 0], [0.65, 0], [1, 0.32], [0.65, 0.7], [0, 0.7]] ],
  'Q': [ [[0.3, 0], [0.7, 0], [1, 0.3], [1, 1.1], [0.7, 1.4], [0.3, 1.4], [0, 1.1], [0, 0.3], [0.3, 0]], [[0.6, 0.95], [1.05, 1.48]] ],
  'R': [ [[0, 1.4], [0, 0], [0.65, 0], [1, 0.32], [0.65, 0.7], [0, 0.7]], [[0.55, 0.7], [1, 1.4]] ],
  'S': [ [[1, 0.25], [0.75, 0], [0.25, 0], [0, 0.3], [0.25, 0.65], [0.75, 0.75], [1, 1.1], [0.75, 1.4], [0.25, 1.4], [0, 1.15]] ],
  'T': [ [[0, 0], [1, 0]], [[0.5, 0], [0.5, 1.4]] ],
  'U': [ [[0, 0], [0, 1.1], [0.25, 1.4], [0.75, 1.4], [1, 1.1], [1, 0]] ],
  'V': [ [[0, 0], [0.5, 1.4], [1, 0]] ],
  'W': [ [[0, 0], [0.2, 1.4], [0.5, 0.7], [0.8, 1.4], [1, 0]] ],
  'X': [ [[0, 0], [1, 1.4]], [[1, 0], [0, 1.4]] ],
  'Y': [ [[0, 0], [0.5, 0.7], [1, 0]], [[0.5, 0.7], [0.5, 1.4]] ],
  'Z': [ [[0, 0], [1, 0], [0, 1.4], [1, 1.4]] ],
  ' ': []
};

// ============================================================================
// VECTOR TITLE RENDERER
// ============================================================================
export class VectorTitleRenderer {
  constructor(text = "NEON SURVIVORS") {
    this.text = text;
    this.time = 0;
    
    this.container = new PIXI.Container();
    uiLayer.addChild(this.container);

    this.letters = [];
    this.initLetters();
  }
  
  destroy() {
    if (this.container) {
      this.container.destroy({ children: true });
    }
  }

  initLetters() {
    const W = state.width || 1920;
    const H = state.height || 1080;

    const lines = ["NEON", "SURVIVORS"];
    const maxLineLength = Math.max(...lines.map(l => l.length));
    const targetTitleWidth = Math.min(W * 0.88, 760);
    const letterWidth = Math.min(68, targetTitleWidth / (maxLineLength * 1.25));
    const letterHeight = letterWidth * 1.35;
    const letterSpacing = letterWidth * 0.28;
    const lineGap = letterHeight * 0.28;

    const totalTitleHeight = lines.length * letterHeight + (lines.length - 1) * lineGap;
    const startY = Math.max(50, H * 0.22 - totalTitleHeight / 2);

    let globalCharIndex = 0;

    lines.forEach((line, lineIdx) => {
      const lineWidth = line.length * letterWidth + (line.length - 1) * letterSpacing;
      let curX = (W - lineWidth) / 2;
      const curY = startY + lineIdx * (letterHeight + lineGap);

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const glyph = VECTOR_GLYPHS[char];

        const letterContainer = new PIXI.Container();
        letterContainer.x = curX + letterWidth / 2;
        letterContainer.y = curY + letterHeight / 2;
        
        const baseX = letterContainer.x;
        const baseY = letterContainer.y;
        
        if (glyph && glyph.length > 0) {
          const g = new PIXI.Graphics();
          
          const drawGlyph = (graphics, width, alpha) => {
             graphics.lineStyle({ width: width, color: 0xFFFFFF, alpha: alpha, cap: PIXI.LINE_CAP.ROUND, join: PIXI.LINE_JOIN.ROUND });
             glyph.forEach(stroke => {
               stroke.forEach((pt, pIdx) => {
                 const px = pt[0] * letterWidth - letterWidth / 2;
                 const py = (pt[1] / 1.4) * letterHeight - letterHeight / 2;
                 if (pIdx === 0) graphics.moveTo(px, py);
                 else graphics.lineTo(px, py);
               });
             });
          };

          drawGlyph(g, Math.max(3, letterWidth * 0.11), 0.45);
          drawGlyph(g, Math.max(2, letterWidth * 0.065), 0.95);
          
          letterContainer.addChild(g);
          
          const whiteCore = new PIXI.Graphics();
          drawGlyph(whiteCore, Math.max(1, letterWidth * 0.025), 0.9);
          letterContainer.addChild(whiteCore);
          
          const vertices = new PIXI.Graphics();
          vertices.beginFill(0xFFFFFF);
          glyph.forEach(stroke => {
            stroke.forEach(pt => {
              const px = pt[0] * letterWidth - letterWidth / 2;
              const py = (pt[1] / 1.4) * letterHeight - letterHeight / 2;
              vertices.drawCircle(px, py, Math.max(1.5, letterWidth * 0.035));
            });
          });
          vertices.endFill();
          letterContainer.addChild(vertices);
          
          this.letters.push({
            container: letterContainer,
            colorGraphics: g,
            index: globalCharIndex,
            baseX: baseX,
            baseY: baseY,
            letterWidth,
            letterHeight
          });
        }
        
        this.container.addChild(letterContainer);
        curX += letterWidth + letterSpacing;
        globalCharIndex++;
      }
    });
  }

  update(dt) {
    this.time += dt;
    const time = this.time;
    
    this.letters.forEach(letObj => {
      const { container, colorGraphics, index, baseX, baseY, letterWidth, letterHeight } = letObj;
      
      const hue = (time * 55 + index * 28) % 360;
      const rgb = this.hslToRgb(hue / 360, 1, 0.65);
      const hexColor = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
      
      colorGraphics.tint = hexColor;

      const lateralX = Math.sin(time * 2.2 + index * 0.75) * (letterWidth * 0.12);
      const swayY = Math.cos(time * 1.7 + index * 0.6) * (letterHeight * 0.08);
      const rot = Math.sin(time * 1.4 + index * 0.5) * 0.035;

      container.x = baseX + lateralX;
      container.y = baseY + swayY;
      container.rotation = rot;
    });
  }

  hslToRgb(h, s, l){
    let r, g, b;
    if(s == 0){
        r = g = b = l; 
    } else {
        const hue2rgb = function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }
}

// ============================================================================
// MENU BACKGROUND SHOWCASE SIMULATION
// ============================================================================
export class MenuBackgroundShowcase {
  constructor() {
    this.time = 0;
    this.container = new PIXI.Container();
    worldLayer.addChild(this.container);
    this.initEntities();
  }

  destroy() {
    if (this.container) {
      this.container.destroy({ children: true });
    }
  }

  initEntities() {
    const W = state.width || 1920;
    const H = state.height || 1080;

    // 1. AMALGAM (Stage 1 root, drawn at the very bottom layer)
    this.amalgam = { x: W * 0.5, y: H * 0.52, vx: 0.9, vy: 0.7, radius: 160, angle: 0 };
    
    // pulse is under amalgam
    const pulseTex = getOrCachePolygon(160, 10, "#ff3366", 8, "rgba(255, 51, 102, 0.15)", 2.5);
    this.amalgamPulseSprite = new PIXI.Sprite(pulseTex);
    this.amalgamPulseSprite.anchor.set(0.5);
    this.container.addChild(this.amalgamPulseSprite);

    this.amalgamSprite = new PIXI.Sprite(textures['boss_amalgam_1']);
    this.amalgamSprite.anchor.set(0.5);
    this.container.addChild(this.amalgamSprite);

    // 2. DEVOURER OF TAX (45 complete segments with rainbow gradient)
    this.devourer = {
      x: W * 0.35, y: H * 0.3, angle: 0, speed: 2.8, turnRate: 0.015, turnTimer: 0,
      radius: 36, segmentLength: 36, segmentCount: 45, segments: []
    };
    
    const devTex = getOrCachePolygon(36, 3, "#ffffff", 10, "rgba(255,255,255,0.3)", 2.5);
    for (let i = 0; i < this.devourer.segmentCount; i++) {
      let sprite = new PIXI.Sprite(devTex);
      sprite.anchor.set(0.5);
      const hue = ((this.devourer.segmentCount - 1 - i) / this.devourer.segmentCount) * 360;
      const rgb = this.hslToRgb(hue / 360, 1, 0.55);
      sprite.tint = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
      
      this.devourer.segments.push({
        x: this.devourer.x - i * this.devourer.segmentLength,
        y: this.devourer.y,
        angle: 0,
        sprite: sprite
      });
    }

    // 3. CARLOS (15 segments, lime green)
    this.carlos = {
      x: W * 0.75, y: H * 0.35, angle: Math.PI * 0.75, speed: 2.4,
      radius: 36, segmentLength: 36, segmentCount: 15, segments: []
    };
    for (let i = 0; i < this.carlos.segmentCount; i++) {
      let sprite = new PIXI.Sprite(textures['boss_carlos_seg']);
      sprite.anchor.set(0.5);
      this.carlos.segments.push({
        x: this.carlos.x - i * this.carlos.segmentLength,
        y: this.carlos.y,
        angle: this.carlos.angle,
        sprite: sprite
      });
    }

    // 4. SEBASTIAN (15 segments, purple)
    this.sebastian = {
      x: W * 0.25, y: H * 0.75, angle: -Math.PI * 0.25, speed: 2.5,
      radius: 36, segmentLength: 36, segmentCount: 15, segments: []
    };
    for (let i = 0; i < this.sebastian.segmentCount; i++) {
      let sprite = new PIXI.Sprite(textures['boss_sebastian_seg']);
      sprite.anchor.set(0.5);
      this.sebastian.segments.push({
        x: this.sebastian.x - i * this.sebastian.segmentLength,
        y: this.sebastian.y,
        angle: this.sebastian.angle,
        sprite: sprite
      });
    }
    
    // add backwards to layer properly
    for (let i = this.devourer.segmentCount - 1; i >= 0; i--) this.container.addChild(this.devourer.segments[i].sprite);
    for (let i = this.carlos.segmentCount - 1; i >= 0; i--) this.container.addChild(this.carlos.segments[i].sprite);
    for (let i = this.sebastian.segmentCount - 1; i >= 0; i--) this.container.addChild(this.sebastian.segments[i].sprite);

    // 5. KYREN (Peaceful wandering dual-octagon)
    this.kyren = { x: W * 0.7, y: H * 0.7, vx: 1.1, vy: -0.9, angle: 0, innerAngle: 0, radius: 135 };
    this.kyrenOuter = new PIXI.Sprite(textures['boss_kyren_outer']);
    this.kyrenOuter.anchor.set(0.5);
    this.kyrenInner = new PIXI.Sprite(textures['boss_kyren_inner']);
    this.kyrenInner.anchor.set(0.5);
    this.container.addChild(this.kyrenOuter);
    this.container.addChild(this.kyrenInner);

    // 6. SWARMERS (Flock keeping flocking / boid behavior)
    this.swarmers = [];
    const swarmerCount = 12;
    const flockOriginX = W * 0.45;
    const flockOriginY = H * 0.4;
    for (let i = 0; i < swarmerCount; i++) {
      let sw = {
        x: flockOriginX + (Math.random() * 120 - 60),
        y: flockOriginY + (Math.random() * 120 - 60),
        vx: 2.8 + Math.random() * 0.8,
        vy: (Math.random() - 0.5) * 1.5,
        radius: 12,
        angle: 0
      };
      sw.sprite = new PIXI.Sprite(textures['enemy_swarmer']);
      sw.sprite.anchor.set(0.5);
      this.swarmers.push(sw);
      this.container.addChild(sw.sprite);
    }

    // 7. STANDARD & SPECIAL ROAMING ENEMIES
    this.roamingEnemies = [
      { x: W * 0.2, y: H * 0.4, vx: 1.2, vy: 1.0, radius: 18, tex: 'enemy_standard_small', angle: 0 },
      { x: W * 0.8, y: H * 0.6, vx: -1.3, vy: -0.8, radius: 18, tex: 'enemy_standard_small', angle: 0 },
      { x: W * 0.6, y: H * 0.25, vx: -0.9, vy: 1.1, radius: 24, tex: 'enemy_standard_medium', angle: 0 },
      { x: W * 0.3, y: H * 0.8, vx: 1.0, vy: -0.9, radius: 24, tex: 'enemy_standard_medium', angle: 0 },
      { x: W * 0.85, y: H * 0.8, vx: -0.8, vy: -0.7, radius: 30, tex: 'enemy_standard_large', angle: 0 },
      { x: W * 0.15, y: H * 0.6, vx: 1.4, vy: -0.7, radius: 22, tex: 'enemy_ranger', angle: Math.PI / 4 },
      { x: W * 0.5, y: H * 0.18, vx: 0.8, vy: 0.6, radius: 34, tex: 'enemy_mother', angle: 0 },
      { x: W * 0.52, y: H * 0.16, vx: 1.1, vy: 0.7, radius: 14, tex: 'enemy_mother_child', angle: 0 },
      { x: W * 0.48, y: H * 0.20, vx: 0.7, vy: 0.9, radius: 14, tex: 'enemy_mother_child', angle: 0 }
    ];
    for (let e of this.roamingEnemies) {
      e.sprite = new PIXI.Sprite(textures[e.tex]);
      e.sprite.anchor.set(0.5);
      this.container.addChild(e.sprite);
    }
  }

  hslToRgb(h, s, l) {
    let r, g, b;
    if(s == 0) r = g = b = l; 
    else {
      const hue2rgb = function(p, q, t){
        if(t < 0) t += 1;
        if(t > 1) t -= 1;
        if(t < 1/6) return p + (q - p) * 6 * t;
        if(t < 1/2) return q;
        if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  update(dt) {
    this.time += dt;
    const W = state.width || 1920;
    const H = state.height || 1080;

    // --- 1. Update Amalgam ---
    const a = this.amalgam;
    a.angle += 0.012;
    a.x += a.vx;
    a.y += a.vy;
    if (a.x <= a.radius + 50) { a.x = a.radius + 50; a.vx = Math.abs(a.vx); }
    else if (a.x >= W - a.radius - 50) { a.x = W - a.radius - 50; a.vx = -Math.abs(a.vx); }
    if (a.y <= a.radius + 50) { a.y = a.radius + 50; a.vy = Math.abs(a.vy); }
    else if (a.y >= H - a.radius - 50) { a.y = H - a.radius - 50; a.vy = -Math.abs(a.vy); }
    
    this.amalgamSprite.x = a.x;
    this.amalgamSprite.y = a.y;
    this.amalgamSprite.rotation = a.angle;

    this.amalgamPulseSprite.x = a.x;
    this.amalgamPulseSprite.y = a.y;
    this.amalgamPulseSprite.rotation = -a.angle * 1.5;
    const pulseScale = (0.55 + Math.sin(this.time * 3) * 0.05);
    this.amalgamPulseSprite.scale.set(pulseScale);

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
    
    for (let i = 0; i < dev.segmentCount; i++) {
      const seg = dev.segments[i];
      seg.sprite.x = seg.x;
      seg.sprite.y = seg.y;
      seg.sprite.rotation = seg.angle;
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
    for (let i = 0; i < c.segmentCount; i++) {
      const seg = c.segments[i];
      seg.sprite.x = seg.x;
      seg.sprite.y = seg.y;
      seg.sprite.rotation = seg.angle;
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
    for (let i = 0; i < s.segmentCount; i++) {
      const seg = s.segments[i];
      seg.sprite.x = seg.x;
      seg.sprite.y = seg.y;
      seg.sprite.rotation = seg.angle;
    }

    // --- 5. Update Kyren ---
    const k = this.kyren;
    k.angle += 0.018;
    k.innerAngle -= 0.035;
    k.x += k.vx;
    k.y += k.vy;
    if (k.x <= k.radius + 80) { k.x = k.radius + 80; k.vx = Math.abs(k.vx); }
    else if (k.x >= W - k.radius - 80) { k.x = W - k.radius - 80; k.vx = -Math.abs(k.vx); }
    if (k.y <= k.radius + 80) { k.y = k.radius + 80; k.vy = Math.abs(k.vy); }
    else if (k.y >= H - k.radius - 80) { k.y = H - k.radius - 80; k.vy = -Math.abs(k.vy); }
    
    this.kyrenOuter.x = k.x;
    this.kyrenOuter.y = k.y;
    this.kyrenOuter.rotation = k.angle;
    
    this.kyrenInner.x = k.x;
    this.kyrenInner.y = k.y;
    this.kyrenInner.rotation = k.innerAngle;
    // The original code drew inner kyren with a scaled radius (k.radius * 0.52).
    // Let's just scale it using the sprite. `textures['boss_kyren_inner']` is size 78 which is 150 * 0.52. So scaling is already mostly handled, but we can do:
    // Wait, 150 * 0.52 = 78. So it's 1:1. We can just leave scale = 1.

    // --- 6. Update Swarmers ---
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
      let cohX = (avgX - sw.x) * 0.002;
      let cohY = (avgY - sw.y) * 0.002;
      let aliX = (avgVx - sw.vx) * 0.03;
      let aliY = (avgVy - sw.vy) * 0.03;
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

      if (sw.x < 100) sw.vx += 0.2;
      else if (sw.x > W - 100) sw.vx -= 0.2;
      if (sw.y < 100) sw.vy += 0.2;
      else if (sw.y > H - 100) sw.vy -= 0.2;

      const spd = Math.hypot(sw.vx, sw.vy);
      const targetSpd = 3.2;
      if (spd > 0) {
        sw.vx = (sw.vx / spd) * targetSpd;
        sw.vy = (sw.vy / spd) * targetSpd;
      }

      sw.x += sw.vx;
      sw.y += sw.vy;
      sw.angle = Math.atan2(sw.vy, sw.vx);
      
      sw.sprite.x = sw.x;
      sw.sprite.y = sw.y;
      sw.sprite.rotation = sw.angle;
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
      
      e.sprite.x = e.x;
      e.sprite.y = e.y;
      e.sprite.rotation = e.angle;
    }
  }
}

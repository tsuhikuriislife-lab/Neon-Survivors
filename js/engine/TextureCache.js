// ============================================================================
// TextureCache.js - Pre-rendered Offscreen Textures for Maximum 60FPS Performance
// ============================================================================

function createCanvas(width, height) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c;
}

export function createPolygonTexture(radius, sides, color, glow = 10, fill = null, lineWidth = 2.5) {
  const padding = Math.ceil(glow * 2 + lineWidth + 4);
  const size = Math.ceil((radius + padding) * 2);
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = (i * 2 * Math.PI) / sides;
    const px = radius * Math.cos(a);
    const py = radius * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;

  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  ctx.stroke();
  ctx.restore();

  return PIXI.Texture.from(canvas);
}

export function createCircleTexture(radius, strokeColor, fillColor = "#ffffff", glow = 10, lineWidth = 2) {
  const padding = Math.ceil(glow * 2 + lineWidth + 4);
  const size = Math.ceil((radius + padding) * 2);
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.shadowColor = strokeColor;
  ctx.shadowBlur = glow;

  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
  ctx.restore();

  return PIXI.Texture.from(canvas);
}

export function createMissileTexture(color = "#ff4400", glow = 10) {
  const padding = Math.ceil(glow * 2 + 10);
  const size = Math.ceil((12 + padding) * 2);
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(-4, 4);
  ctx.lineTo(-4, -4);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  return PIXI.Texture.from(canvas);
}

export const textures = {};
const dynamicPolygonCache = new Map();
const dynamicCircleCache = new Map();

export function initTextureCache() {
  // Player & weapons
  textures['player_ship'] = createPolygonTexture(16, 3, "#00ffff", 15, "rgba(0, 255, 255, 0.2)", 2.5);
  textures['player_orbital_8'] = createPolygonTexture(8, 6, "#ff00ff", 12, "rgba(255, 0, 255, 0.4)", 2.5);
  textures['player_orbital_12'] = createPolygonTexture(12, 6, "#ff00ff", 12, "rgba(255, 0, 255, 0.4)", 2.5);

  // Standard enemies
  textures['enemy_standard_small'] = createPolygonTexture(15, 3, "#ff3366", 8, "rgba(255, 51, 102, 0.2)", 2.5);
  textures['enemy_standard_medium'] = createPolygonTexture(21, 5, "#ffbb00", 8, "rgba(255, 187, 0, 0.2)", 2.5);
  textures['enemy_standard_large'] = createPolygonTexture(45, 6, "#a855f7", 10, "rgba(168, 85, 247, 0.2)", 2.5);
  textures['enemy_swarmer'] = createPolygonTexture(12, 3, "#ff9900", 6, "rgba(255, 153, 0, 0.2)", 2.5);
  textures['enemy_ranger'] = createPolygonTexture(18, 4, "#00ccff", 8, "rgba(0, 204, 255, 0.2)", 2.5);
  textures['enemy_mother'] = createPolygonTexture(60, 8, "#00ff66", 10, "rgba(0, 68, 0, 0.5)", 2.5);
  textures['enemy_mother_child'] = createPolygonTexture(10, 3, "#00ff00", 6, "rgba(0, 255, 0, 0.2)", 2.5);

  // XP Gems
  textures['gem_green'] = createPolygonTexture(6, 4, "#39ff14", 8, "rgba(255,255,255,0.2)", 2.5);
  textures['gem_cyan'] = createPolygonTexture(6, 4, "#00ffff", 8, "rgba(255,255,255,0.2)", 2.5);
  textures['gem_magenta'] = createPolygonTexture(6, 4, "#ff00ff", 8, "rgba(255,255,255,0.2)", 2.5);
  textures['gem_red'] = createPolygonTexture(6, 4, "#ff0055", 8, "rgba(255,255,255,0.2)", 2.5);

  // Projectiles
  textures['proj_blaster'] = createCircleTexture(4, "#00ffff", "#ffffff", 10, 2);
  textures['proj_nova'] = createPolygonTexture(14, 4, "#0088ff", 12, "rgba(0, 136, 255, 0.5)", 2.5);
  textures['proj_missile'] = createMissileTexture("#ff4400", 10);
  textures['proj_accelerating'] = createCircleTexture(5, "#00ff66", "#ffffff", 10, 2);
  textures['proj_accelerating_amalgam'] = createCircleTexture(5, "#ff0033", "#ffffff", 10, 2);
  textures['proj_enemy_ranger'] = createCircleTexture(5, "#00ccff", "#ffffff", 10, 2);
  textures['proj_enemy_child'] = createCircleTexture(4, "#00ff00", "#ffffff", 8, 2);
  textures['proj_enemy_amalgam'] = createCircleTexture(4, "#ff0033", "#ffffff", 8, 2);
  textures['proj_enemy_falling'] = createCircleTexture(5, "#ffffff", "#ffffff", 10, 2);

  // Bosses
  textures['boss_kyren_outer'] = createPolygonTexture(150, 8, "#00ffcc", 18, "rgba(0, 255, 204, 0.1)", 3);
  textures['boss_kyren_inner'] = createPolygonTexture(78, 8, "#ffffff", 10, "rgba(255, 255, 255, 0.2)", 2.5);
  textures['boss_denzel'] = createPolygonTexture(75, 8, "#ffffff", 12, "rgba(255, 255, 255, 0.3)", 2.5);
  textures['boss_amalgam_1'] = createPolygonTexture(160, 10, "#ff0033", 14, "rgba(255, 0, 51, 0.2)", 3);
  textures['boss_amalgam_2'] = createPolygonTexture(80, 10, "#ff0033", 14, "rgba(255, 0, 51, 0.2)", 2.5);
  textures['boss_amalgam_3'] = createPolygonTexture(40, 10, "#ff0033", 14, "rgba(255, 0, 51, 0.2)", 2.5);
  textures['boss_amalgam_4'] = createPolygonTexture(20, 10, "#ff0033", 14, "rgba(255, 0, 51, 0.2)", 2.5);
  textures['boss_devourer_seg'] = createPolygonTexture(36, 3, "#ffffff", 8, "rgba(255, 255, 255, 0.2)", 2.5);
  textures['boss_carlos_seg'] = createPolygonTexture(36, 3, "#00ff88", 8, "rgba(0, 255, 136, 0.2)", 2.5);
  textures['boss_sebastian_seg'] = createPolygonTexture(36, 3, "#ff5500", 8, "rgba(255, 85, 0, 0.2)", 2.5);
  textures['boss_testing'] = createPolygonTexture(160, 10, "#00ffff", 14, "rgba(0, 255, 255, 0.2)", 3);
}

export function getOrCachePolygon(radius, sides, color, glow = 10, fill = null, lineWidth = 2.5) {
  const key = `${radius}_${sides}_${color}_${glow}_${fill}_${lineWidth}`;
  let tex = dynamicPolygonCache.get(key);
  if (!tex) {
    tex = createPolygonTexture(radius, sides, color, glow, fill, lineWidth);
    dynamicPolygonCache.set(key, tex);
  }
  return tex;
}

export function getOrCacheCircle(radius, strokeColor, fillColor = "#ffffff", glow = 10, lineWidth = 2) {
  const key = `${radius}_${strokeColor}_${fillColor}_${glow}_${lineWidth}`;
  let tex = dynamicCircleCache.get(key);
  if (!tex) {
    tex = createCircleTexture(radius, strokeColor, fillColor, glow, lineWidth);
    dynamicCircleCache.set(key, tex);
  }
  return tex;
}

export function drawCachedTexture(ctx, texture, x, y, angle = 0) {
  if (!texture || !texture.canvas) return;

  if (angle === 0) {
    ctx.drawImage(texture.canvas, (x - texture.halfWidth) | 0, (y - texture.halfHeight) | 0);
  } else {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.drawImage(texture.canvas, -texture.halfWidth, -texture.halfHeight);
    ctx.restore();
  }
}

export const preloadedUpgradeImages = new Map();

export function preloadUpgradeIcons(upgradesList) {
  if (typeof Image === 'undefined') return;
  const list = upgradesList || [];
  list.forEach(u => {
    if (!u.icon) return;
    const match = u.icon.match(/src=["']([^"']+)["']/);
    if (match && match[1]) {
      const src = match[1];
      if (!preloadedUpgradeImages.has(src)) {
        const img = new Image();
        img.src = src;
        preloadedUpgradeImages.set(src, img);
      }
    }
  });
}



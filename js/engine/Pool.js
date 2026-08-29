// ============================================================================
// Pool.js - Zero-Allocation Object Pools for High Performance 60FPS
// ============================================================================

import { textures, drawCachedTexture } from './TextureCache.js';
import { dist } from './Utils.js';

// ----------------------------------------------------------------------------
// 1. PARTICLE POOL (1500 particles)
// ----------------------------------------------------------------------------
class PooledParticle {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.color = "#ffffff";
    this.alpha = 0;
    this.decay = 0.02;
    this.size = 3;
    this.active = false;
  }

  reset(x, y, color, speed = 2, decay = 0.02, size = 3) {
    this.x = x;
    this.y = y;
    this.color = color;
    const angle = Math.random() * Math.PI * 2;
    const s = (Math.random() * 0.7 + 0.3) * speed;
    this.vx = Math.cos(angle) * s;
    this.vy = Math.sin(angle) * s;
    this.alpha = 1.0;
    this.decay = decay * (Math.random() * 0.5 + 0.75);
    this.size = size;
    this.active = true;
  }

  update() {
    if (!this.active) return;
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.96;
    this.vy *= 0.96;
    this.alpha -= this.decay;
    if (this.alpha <= 0) {
      this.active = false;
    }
  }
}

export class ParticlePool {
  constructor(size = 1500) {
    this.pool = new Array(size);
    for (let i = 0; i < size; i++) {
      this.pool[i] = new PooledParticle();
    }
    this.searchIndex = 0;
    this.colorBuckets = new Map();
  }

  acquire(x, y, color, speed = 2, decay = 0.02, size = 3) {
    const len = this.pool.length;
    for (let i = 0; i < len; i++) {
      const idx = (this.searchIndex + i) % len;
      const p = this.pool[idx];
      if (!p.active) {
        p.reset(x, y, color, speed, decay, size);
        this.searchIndex = (idx + 1) % len;
        return p;
      }
    }
    // Fallback: recycle oldest
    const p = this.pool[this.searchIndex];
    p.reset(x, y, color, speed, decay, size);
    this.searchIndex = (this.searchIndex + 1) % len;
    return p;
  }

  spawnExplosion(x, y, color, count = 16, speed = 4) {
    for (let i = 0; i < count; i++) {
      this.acquire(x, y, color, speed, 0.025, Math.random() * 3 + 2);
    }
  }

  clear() {
    const len = this.pool.length;
    for (let i = 0; i < len; i++) {
      this.pool[i].active = false;
    }
  }

  update() {
    const len = this.pool.length;
    for (let i = 0; i < len; i++) {
      const p = this.pool[i];
      if (p.active) {
        p.update();
      }
    }
  }

  drawBatch(ctx) {
    this.colorBuckets.clear();
    const len = this.pool.length;

    for (let i = 0; i < len; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      let list = this.colorBuckets.get(p.color);
      if (!list) {
        list = [];
        this.colorBuckets.set(p.color, list);
      }
      list.push(p);
    }

    ctx.save();
    ctx.shadowBlur = 0;

    for (const [color, list] of this.colorBuckets) {
      ctx.fillStyle = color;
      const listLen = list.length;
      for (let i = 0; i < listLen; i++) {
        const p = list[i];
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillRect((p.x - p.size * 0.5) | 0, (p.y - p.size * 0.5) | 0, p.size, p.size);
      }
    }

    ctx.restore();
  }
}

// ----------------------------------------------------------------------------
// 2. PROJECTILE POOL (400 projectiles)
// ----------------------------------------------------------------------------
class PooledProjectile {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.damage = 0;
    this.color = "#00ffff";
    this.radius = 4;
    this.isEnemy = false;
    this.homingStrength = 0;
    this.life = 120;
    this.pierce = false;
    this.active = false;
    this.texture = null;
  }

  reset(x, y, vx, vy, damage, color = "#00ffff", radius = 4, isEnemy = false, homingStrength = 0) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.color = color;
    this.radius = radius;
    this.isEnemy = isEnemy;
    this.homingStrength = homingStrength;
    this.life = 120;
    this.pierce = false;
    this.active = true;

    if (isEnemy) {
      if (color === '#00ccff') this.texture = textures['proj_enemy_ranger'];
      else if (color === '#00ff00') this.texture = textures['proj_enemy_child'];
      else if (color === '#ff0033') this.texture = textures['proj_enemy_amalgam'];
      else this.texture = textures['proj_enemy_ranger'] || textures['proj_blaster'];
    } else {
      this.texture = textures['proj_blaster'];
    }
  }

  update(worldWidth = 1920, worldHeight = 1920) {
    if (!this.active) return false;

    this.x += this.vx;
    this.y += this.vy;
    this.life--;

    const inBounds = this.x >= 0 && this.x <= worldWidth && this.y >= 0 && this.y <= worldHeight;
    if (this.isEnemy) {
      if (!inBounds) {
        this.active = false;
        return false;
      }
    } else {
      if (this.life <= 0 || !inBounds) {
        this.active = false;
        return false;
      }
    }
    return true;
  }

  draw(ctx) {
    if (!this.active) return;
    if (this.x < 0 || this.x > 1920 || this.y < 0 || this.y > 1920) return;
    if (this.texture) {
      drawCachedTexture(ctx, this.texture, this.x, this.y);
    } else {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export class ProjectilePool {
  constructor(size = 400) {
    this.pool = new Array(size);
    for (let i = 0; i < size; i++) {
      this.pool[i] = new PooledProjectile();
    }
    this.searchIndex = 0;
  }

  acquire(x, y, vx, vy, damage, color = "#00ffff", radius = 4, isEnemy = false, homingStrength = 0) {
    const len = this.pool.length;
    for (let i = 0; i < len; i++) {
      const idx = (this.searchIndex + i) % len;
      const p = this.pool[idx];
      if (!p.active) {
        p.reset(x, y, vx, vy, damage, color, radius, isEnemy, homingStrength);
        this.searchIndex = (idx + 1) % len;
        return p;
      }
    }
    const p = this.pool[this.searchIndex];
    p.reset(x, y, vx, vy, damage, color, radius, isEnemy, homingStrength);
    this.searchIndex = (this.searchIndex + 1) % len;
    return p;
  }

  clear() {
    const len = this.pool.length;
    for (let i = 0; i < len; i++) {
      this.pool[i].active = false;
    }
  }
}

// ----------------------------------------------------------------------------
// 3. GEM POOL (500 gems)
// ----------------------------------------------------------------------------
class PooledGem {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.value = 1;
    this.radius = 6;
    this.angle = 0;
    this.color = "#39ff14";
    this.active = false;
    this.texture = null;
  }

  reset(x, y, value) {
    this.x = x;
    this.y = y;
    this.value = value;
    this.radius = 6;
    this.angle = 0;
    this.active = true;

    if (value > 15) {
      this.color = "#ff0055";
      this.texture = textures['gem_red'];
    } else if (value > 5) {
      this.color = "#ff00ff";
      this.texture = textures['gem_magenta'];
    } else if (value > 2) {
      this.color = "#00ffff";
      this.texture = textures['gem_cyan'];
    } else {
      this.color = "#39ff14";
      this.texture = textures['gem_green'];
    }
  }

  update(player) {
    if (!this.active) return false;
    this.angle += 0.05;
    const d = dist(this.x, this.y, player.x, player.y);
    if (d < player.pickupRadius) {
      const speed = 7.5;
      const a = Math.atan2(player.y - this.y, player.x - this.x);
      this.x += Math.cos(a) * speed;
      this.y += Math.sin(a) * speed;
      if (d < player.radius + 8) {
        player.gainXP(this.value);
        this.active = false;
        return false;
      }
    }
    return true;
  }

  draw(ctx) {
    if (!this.active) return;
    if (this.texture) {
      drawCachedTexture(ctx, this.texture, this.x, this.y, this.angle);
    }
  }
}

export class GemPool {
  constructor(size = 500) {
    this.pool = new Array(size);
    for (let i = 0; i < size; i++) {
      this.pool[i] = new PooledGem();
    }
    this.searchIndex = 0;
  }

  acquire(x, y, value) {
    const len = this.pool.length;
    for (let i = 0; i < len; i++) {
      const idx = (this.searchIndex + i) % len;
      const g = this.pool[idx];
      if (!g.active) {
        g.reset(x, y, value);
        this.searchIndex = (idx + 1) % len;
        return g;
      }
    }
    const g = this.pool[this.searchIndex];
    g.reset(x, y, value);
    this.searchIndex = (this.searchIndex + 1) % len;
    return g;
  }

  clear() {
    const len = this.pool.length;
    for (let i = 0; i < len; i++) {
      this.pool[i].active = false;
    }
  }

  update(player) {
    const len = this.pool.length;
    for (let i = 0; i < len; i++) {
      const g = this.pool[i];
      if (g.active) {
        g.update(player);
      }
    }
  }

  draw(ctx) {
    const len = this.pool.length;
    for (let i = 0; i < len; i++) {
      const g = this.pool[i];
      if (g.active) {
        g.draw(ctx);
      }
    }
  }
}

// ----------------------------------------------------------------------------
// 4. FLOATING TEXT POOL (300 items)
// ----------------------------------------------------------------------------
class PooledFloatingText {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.text = "";
    this.color = "#fff";
    this.size = 14;
    this.isCrit = false;
    this.rotation = 0;
    this.alpha = 0;
    this.vy = -1.2;
    this.active = false;
  }

  reset(x, y, text, color = "#fff", size = 14, isCrit = false) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.size = size;
    this.isCrit = isCrit;
    this.rotation = isCrit ? (Math.random() - 0.5) * 0.35 : 0;
    this.alpha = 1.0;
    this.vy = isCrit ? -1.6 : -1.2;
    this.active = true;
  }

  update() {
    if (!this.active) return;
    this.y += this.vy;
    this.alpha -= this.isCrit ? 0.015 : 0.02;
    if (this.alpha <= 0) {
      this.active = false;
    }
  }
}

export class FloatingTextPool {
  constructor(size = 300) {
    this.pool = new Array(size);
    for (let i = 0; i < size; i++) {
      this.pool[i] = new PooledFloatingText();
    }
    this.searchIndex = 0;
  }

  acquire(x, y, text, color = "#fff", size = 14, isCrit = false) {
    const len = this.pool.length;
    for (let i = 0; i < len; i++) {
      const idx = (this.searchIndex + i) % len;
      const ft = this.pool[idx];
      if (!ft.active) {
        ft.reset(x, y, text, color, size, isCrit);
        this.searchIndex = (idx + 1) % len;
        return ft;
      }
    }
    const ft = this.pool[this.searchIndex];
    ft.reset(x, y, text, color, size, isCrit);
    this.searchIndex = (this.searchIndex + 1) % len;
    return ft;
  }

  clear() {
    const len = this.pool.length;
    for (let i = 0; i < len; i++) {
      this.pool[i].active = false;
    }
  }

  update() {
    const len = this.pool.length;
    for (let i = 0; i < len; i++) {
      const ft = this.pool[i];
      if (ft.active) {
        ft.update();
      }
    }
  }

  drawBatch(ctx) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const len = this.pool.length;
    for (let i = 0; i < len; i++) {
      const ft = this.pool[i];
      if (!ft.active) continue;

      ctx.globalAlpha = Math.max(0, ft.alpha);

      if (ft.isCrit) {
        ctx.save();
        ctx.translate(ft.x, ft.y);
        if (ft.rotation !== 0) {
          ctx.rotate(ft.rotation);
        }
        ctx.font = `900 ${ft.size}px 'Segoe UI', sans-serif`;

        // Vibrant neon glow matching the weapon's color
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, 0, 0);

        // Bright white core highlight for punchy luminosity
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha = Math.max(0, ft.alpha * 0.7);
        ctx.font = `bold ${Math.max(10, ft.size - 4)}px 'Segoe UI', sans-serif`;
        ctx.fillText(ft.text, 0, 0);

        ctx.restore();
      } else {
        ctx.shadowBlur = 0;
        ctx.fillStyle = ft.color;
        ctx.font = `bold ${ft.size}px 'Segoe UI', sans-serif`;
        ctx.fillText(ft.text, ft.x, ft.y);
      }
    }

    ctx.restore();
  }
}

export const particlePool = new ParticlePool(1500);
export const projectilePool = new ProjectilePool(400);
export const gemPool = new GemPool(500);
export const floatingTextPool = new FloatingTextPool(300);


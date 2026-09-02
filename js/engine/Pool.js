// ============================================================================
// Pool.js - Zero-Allocation Object Pools for High Performance 60FPS
// ============================================================================

import { textures } from './TextureCache.js';
import { dist } from './Utils.js';

let particleTex;
function getParticleTexture() {
    if (!particleTex) {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(8, 8, 8, 0, Math.PI * 2);
        ctx.fill();
        particleTex = PIXI.Texture.from(canvas);
    }
    return particleTex;
}

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

    this.sprite = new PIXI.Sprite(getParticleTexture());
    this.sprite.anchor.set(0.5);
    this.sprite.visible = false;
    // worldLayer.addChild(this.sprite);
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

    this.sprite.tint = parseInt(this.color.replace('#', '0x'), 16);
    this.sprite.width = this.size;
    this.sprite.height = this.size;
    this.sprite.x = this.x;
    this.sprite.y = this.y;
    this.sprite.alpha = this.alpha;
    this.sprite.visible = true;
  }

  update() {
    if (!this.active) return;
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.96;
    this.vy *= 0.96;
    this.alpha -= this.decay;

    this.sprite.x = this.x;
    this.sprite.y = this.y;
    this.sprite.alpha = this.alpha;

    if (this.alpha <= 0) {
      this.active = false;
      this.sprite.visible = false;
    }
  }
}

export class ParticlePool {
  initSprites(layer) { for(let i=0; i<this.pool.length; i++) { layer.addChild(this.pool[i].sprite); } }
  constructor(size = 1500) {
    this.pool = new Array(size);
    for (let i = 0; i < size; i++) {
      this.pool[i] = new PooledParticle();
    }
    this.searchIndex = 0;
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
      this.pool[i].sprite.visible = false;
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

    this.sprite = new PIXI.Sprite();
    this.sprite.anchor.set(0.5);
    this.sprite.visible = false;
    // worldLayer.addChild(this.sprite);
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

    if (this.texture) {
      this.sprite.texture = this.texture;
      this.sprite.tint = 0xffffff;
    } else {
      this.sprite.texture = getParticleTexture();
      this.sprite.tint = parseInt(this.color.replace('#', '0x'), 16);
      this.sprite.width = this.radius * 2;
      this.sprite.height = this.radius * 2;
    }

    this.sprite.x = this.x;
    this.sprite.y = this.y;
    
    // Attempt to set rotation to face velocity (for missiles/etc) if texture exists
    if (this.texture && (this.vx !== 0 || this.vy !== 0)) {
       this.sprite.rotation = Math.atan2(this.vy, this.vx);
    } else {
       this.sprite.rotation = 0;
    }
    
    this.sprite.visible = true;
  }

  update(worldWidth = 1920, worldHeight = 1920) {
    if (!this.active) return false;

    this.x += this.vx;
    this.y += this.vy;
    this.life--;

    this.sprite.x = this.x;
    this.sprite.y = this.y;
    
    if (this.texture && (this.vx !== 0 || this.vy !== 0)) {
       this.sprite.rotation = Math.atan2(this.vy, this.vx);
    }

    const inBounds = this.x >= 0 && this.x <= worldWidth && this.y >= 0 && this.y <= worldHeight;
    if (this.isEnemy) {
      if (!inBounds) {
        this.active = false;
        this.sprite.visible = false;
        return false;
      }
    } else {
      if (this.life <= 0 || !inBounds) {
        this.active = false;
        this.sprite.visible = false;
        return false;
      }
    }
    return true;
  }
}

export class ProjectilePool {
  initSprites(layer) { for(let i=0; i<this.pool.length; i++) { layer.addChild(this.pool[i].sprite); } }
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
      this.pool[i].sprite.visible = false;
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

    this.sprite = new PIXI.Sprite();
    this.sprite.anchor.set(0.5);
    this.sprite.visible = false;
    // worldLayer.addChild(this.sprite);
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

    if (this.texture) {
      this.sprite.texture = this.texture;
    }
    
    this.sprite.x = this.x;
    this.sprite.y = this.y;
    this.sprite.rotation = this.angle;
    this.sprite.visible = true;
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
        this.sprite.visible = false;
        return false;
      }
    }
    this.sprite.x = this.x;
    this.sprite.y = this.y;
    this.sprite.rotation = this.angle;
    return true;
  }
}

export class GemPool {
  initSprites(layer) { for(let i=0; i<this.pool.length; i++) { layer.addChild(this.pool[i].sprite); } }
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
      this.pool[i].sprite.visible = false;
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

    this.sprite = new PIXI.Text("", {
      fontFamily: "'Segoe UI', sans-serif",
      fontWeight: '900',
      fontSize: 14,
      fill: 0xffffff,
      align: 'center'
    });
    this.sprite.anchor.set(0.5);
    this.sprite.visible = false;
    // worldLayer.addChild(this.sprite);
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

    this.sprite.text = text;
    this.sprite.style.fontSize = size;
    this.sprite.style.fill = color;

    if (isCrit) {
      this.sprite.style.dropShadow = true;
      this.sprite.style.dropShadowColor = color;
      this.sprite.style.dropShadowBlur = 12;
      this.sprite.style.dropShadowDistance = 0;
      this.sprite.style.dropShadowAlpha = 1;
    } else {
      this.sprite.style.dropShadow = false;
    }

    this.sprite.x = this.x;
    this.sprite.y = this.y;
    this.sprite.rotation = this.rotation;
    this.sprite.alpha = this.alpha;
    this.sprite.visible = true;
  }

  update() {
    if (!this.active) return;
    this.y += this.vy;
    this.alpha -= this.isCrit ? 0.015 : 0.02;
    
    this.sprite.x = this.x;
    this.sprite.y = this.y;
    this.sprite.alpha = this.alpha;

    if (this.alpha <= 0) {
      this.active = false;
      this.sprite.visible = false;
    }
  }
}

export class FloatingTextPool {
  initSprites(layer) { for(let i=0; i<this.pool.length; i++) { layer.addChild(this.pool[i].sprite); } }
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
      this.pool[i].sprite.visible = false;
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
}

export const particlePool = new ParticlePool(1500);
export const projectilePool = new ProjectilePool(400);
export const gemPool = new GemPool(500);
export const floatingTextPool = new FloatingTextPool(300);


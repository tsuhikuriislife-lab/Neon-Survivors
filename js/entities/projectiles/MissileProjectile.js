import { Projectile } from './Projectile.js';
import { state } from '../../engine/gameState.js';
import { dist } from '../../engine/Utils.js';
import { spawnExplosion } from '../effects/spawnExplosion.js';
import { audioManager } from '../../engine/AudioManager.js';
import { textures, drawCachedTexture } from '../../engine/TextureCache.js';

export class MissileProjectile extends Projectile {
  constructor(x, y, vx, vy, damage, homingStrength, aoeRadius) {
    super(x, y, vx, vy, damage, "#ff4400", 6, false, homingStrength);
    this.aoeRadius = aoeRadius;
    this.radius = 6;
    this.life = 240;
    this.color = "#ff4400";
    this.pierce = false;
    this.isEnemy = false;
    this.texture = textures['proj_missile'];
  }
  
  onHit() {
    spawnExplosion(this.x, this.y, this.color, 20, 2.5);
    audioManager.playSound('hit_missile', { volume: 0.5, throttleMs: 80 });
    
    const damagedParents = new Set();

    // Query enemies via spatial grid
    state.spatialGrid.queryRadius(this.x, this.y, this.aoeRadius, (target) => {
      if (target.hp <= 0) return;
      const actualTarget = target.parent || target;
      if (damagedParents.has(actualTarget)) return;

      actualTarget.takeDamage(this.damage, this.color);
      state.recordDamage('missiles', this.damage);
      damagedParents.add(actualTarget);
    });

    // Also check bosses
    for (let b of state.bosses) {
      for (let t of b.getTargetables()) {
        const actualTarget = t.parent || t;
        if (damagedParents.has(actualTarget)) continue;

        if (dist(this.x, this.y, t.x, t.y) <= this.aoeRadius + t.radius) {
          t.takeDamage(this.damage, this.color);
          state.recordDamage('missiles', this.damage);
          damagedParents.add(actualTarget);
        }
      }
    }
  }

  findTarget() {
    let closest = null;
    let minD = Infinity;

    // 1. Search regular enemies
    if (state.spatialGrid) {
      const nearestEnemy = state.spatialGrid.getNearest(this.x, this.y, 3000);
      if (nearestEnemy && !nearestEnemy.dead && nearestEnemy.hp > 0) {
        closest = nearestEnemy;
        minD = dist(this.x, this.y, nearestEnemy.x, nearestEnemy.y);
      }
    }

    if (!closest && state.enemies && state.enemies.length > 0) {
      const len = state.enemies.length;
      for (let i = 0; i < len; i++) {
        const e = state.enemies[i];
        if (e.dead || e.hp <= 0) continue;
        const d = dist(this.x, this.y, e.x, e.y);
        if (d < minD) {
          minD = d;
          closest = e;
        }
      }
    }

    // 2. Search all boss targetables
    if (state.bosses && state.bosses.length > 0) {
      const bossLen = state.bosses.length;
      for (let i = 0; i < bossLen; i++) {
        const b = state.bosses[i];
        const targetables = b.getTargetables ? b.getTargetables() : (b.dead ? [] : [b]);
        const tLen = targetables.length;
        for (let j = 0; j < tLen; j++) {
          const t = targetables[j];
          if (t.dead || t.hp <= 0) continue;
          const d = dist(this.x, this.y, t.x, t.y);
          if (d < minD) {
            minD = d;
            closest = t;
          }
        }
      }
    }

    return closest;
  }

  update() {
    if (this.homingStrength > 0) {
      const closest = this.findTarget();
      if (closest) {
        const speed = Math.hypot(this.vx, this.vy) || 7;
        const targetAngle = Math.atan2(closest.y - this.y, closest.x - this.x);
        const curAngle = Math.atan2(this.vy, this.vx);
        let diff = targetAngle - curAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        const newAngle = curAngle + Math.sign(diff) * Math.min(this.homingStrength, Math.abs(diff));
        this.vx = Math.cos(newAngle) * speed;
        this.vy = Math.sin(newAngle) * speed;
      }
    }

    this.x += this.vx;
    this.y += this.vy;
    this.life--;
    if (this.life <= 0) {
      this.onHit();
      return false;
    }
    
    if (this.life % 3 === 0 && state.particlePool) {
      state.particlePool.acquire(this.x, this.y, "#ff8800", 0.5, 0.1, 2);
    }

    return this.x >= 0 && this.x <= state.width && this.y >= 0 && this.y <= state.height;
  }

  draw(ctx) {
    if (this.x < 0 || this.x > state.width || this.y < 0 || this.y > state.height) return;
    if (this.texture) {
      const angle = Math.atan2(this.vy, this.vx);
      drawCachedTexture(ctx, this.texture, this.x, this.y, angle);
    }
  }
}

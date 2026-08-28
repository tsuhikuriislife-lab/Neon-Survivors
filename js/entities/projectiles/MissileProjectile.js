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

  update() {
    if (this.homingStrength > 0) {
      const closest = state.spatialGrid.getNearest(this.x, this.y, 800);
      if (closest) {
        const speed = Math.hypot(this.vx, this.vy);
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

    return this.x >= -50 && this.x <= state.width + 50 && this.y >= -50 && this.y <= state.height + 50;
  }

  draw(ctx) {
    if (this.texture) {
      const angle = Math.atan2(this.vy, this.vx);
      drawCachedTexture(ctx, this.texture, this.x, this.y, angle);
    }
  }
}

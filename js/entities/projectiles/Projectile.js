import { state } from '../../engine/gameState.js';
import { dist } from '../../engine/Utils.js';
import { textures, drawCachedTexture } from '../../engine/TextureCache.js';

export class Projectile {
  constructor(x, y, vx, vy, damage, color = "#00ffff", radius = 4, isEnemy = false, homingStrength = 0) {
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

    if (isEnemy) {
      if (color === '#00ccff') this.texture = textures['proj_enemy_ranger'];
      else if (color === '#00ff00') this.texture = textures['proj_enemy_child'];
      else if (color === '#ff0033') this.texture = textures['proj_enemy_amalgam'];
      else this.texture = textures['proj_enemy_ranger'] || textures['proj_blaster'];
    } else {
      this.texture = textures['proj_blaster'];
    }
  }

  update() {
    if (this.homingStrength > 0 && !this.isEnemy) {
      let closest = state.spatialGrid ? state.spatialGrid.getNearest(this.x, this.y, 800) : null;
      let minD = closest ? dist(this.x, this.y, closest.x, closest.y) : 800;

      if (state.bosses && state.bosses.length > 0) {
        for (let b of state.bosses) {
          for (let target of b.getTargetables()) {
            if (target.dead || target.hp <= 0) continue;
            const d = dist(this.x, this.y, target.x, target.y);
            if (d < minD) {
              minD = d;
              closest = target;
            }
          }
        }
      }

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
    const inBounds = this.x >= -50 && this.x <= state.width + 50 && this.y >= -50 && this.y <= state.height + 50;
    return this.isEnemy ? inBounds : (this.life > 0 && inBounds);
  }

  draw(ctx) {
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

import { state } from '../../engine/gameState.js';
import { spawnExplosion } from '../effects/spawnExplosion.js';
import { Projectile } from '../projectiles/Projectile.js';
import { audioManager } from '../../engine/AudioManager.js';
import { Boss } from './Boss.js';
import { textures, drawCachedTexture } from '../../engine/TextureCache.js';

export class CarlosMinion extends Boss {
  constructor(x, y, hp) {
    super(x, y, "Carlos", hp, 36, "#00ff88");
    this.segmentCount = 15;
    this.segmentLength = 36;
    this.radius = 36;
    this.hp = hp;
    this.maxHp = hp;
    this.segments = [];
    for (let i = 0; i < this.segmentCount; i++) {
      this.segments.push({ x: this.x, y: this.y - i * this.segmentLength, angle: 0 });
    }
    this.dead = false;
    this.salvoTimer = 0;
    this.texture = textures['boss_carlos_seg'];
  }

  getTargetables() {
    const list = [];
    if (!this.dead) {
      this.segments.forEach(seg => {
        list.push({
          x: seg.x,
          y: seg.y,
          radius: this.radius,
          parent: this,
          takeDamage: (amt, color) => this.takeDamage(amt, color, seg.x, seg.y)
        });
      });
    }
    return list;
  }

  takeDamage(amt, damageColor = "#00ff66", hitX = this.x, hitY = this.y) {
    if (this.dead || this.hp <= 0) return false;
    let finalAmount = amt;
    let isCrit = false;

    if (state.player && Math.random() < (state.player.critChance || 0)) {
      finalAmount *= (state.player.critDamage || 1.5);
      isCrit = true;
    }

    this.hp -= finalAmount;
    const offsetX = (Math.random() * 2 - 1) * (this.radius * 0.8);
    const offsetY = (Math.random() * 2 - 1) * (this.radius * 0.8);
    const dmgColor = isCrit ? "#ffff00" : damageColor;
    const fontSize = isCrit ? 20 : 14;

    if (state.floatingTextPool) {
      state.floatingTextPool.acquire(hitX + offsetX, hitY + offsetY, Math.round(finalAmount), dmgColor, fontSize);
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      audioManager.playSound('enemy_death_boss', { volume: 0.8, throttleMs: 200 });
      spawnExplosion(this.x, this.y, "#00ff66", 20, 4);
    }
  }

  update(player) {
    if (this.dead) return;

    const a = Math.atan2(player.y - this.y, player.x - this.x);
    this.x += Math.cos(a) * 2.2;
    this.y += Math.sin(a) * 2.2;

    this.segments[0].x = this.x;
    this.segments[0].y = this.y;
    this.segments[0].angle = a;

    for (let i = 1; i < this.segmentCount; i++) {
      const prev = this.segments[i - 1];
      const cur = this.segments[i];
      const ang = Math.atan2(prev.y - cur.y, prev.x - cur.x);
      cur.x = prev.x - Math.cos(ang) * this.segmentLength;
      cur.y = prev.y - Math.sin(ang) * this.segmentLength;
      cur.angle = ang;
    }

    this.salvoTimer++;
    if (this.salvoTimer % 180 < this.segmentCount * 6) {
      const idx = Math.floor((this.salvoTimer % 180) / 6);
      if ((this.salvoTimer % 180) % 6 === 0 && idx < this.segmentCount) {
        const seg = this.segments[idx];
        const perpA1 = seg.angle + Math.PI / 2;
        const perpA2 = seg.angle - Math.PI / 2;
        const spd = 3.5;

        if (state.projectilePool) {
          state.projectilePool.acquire(seg.x, seg.y, Math.cos(perpA1) * spd, Math.sin(perpA1) * spd, 12, "#00ff88", 4, true);
          state.projectilePool.acquire(seg.x, seg.y, Math.cos(perpA2) * spd, Math.sin(perpA2) * spd, 12, "#00ff88", 4, true);
        } else {
          state.enemyProjectiles.push(new Projectile(seg.x, seg.y, Math.cos(perpA1) * spd, Math.sin(perpA1) * spd, 12, "#00ff88", 4, true));
          state.enemyProjectiles.push(new Projectile(seg.x, seg.y, Math.cos(perpA2) * spd, Math.sin(perpA2) * spd, 12, "#00ff88", 4, true));
        }

        audioManager.playSound('enemy_projectile', { volume: 0.4, throttleMs: 80 });
      }
    }
  }

  draw(ctx) {
    if (this.dead) return;
    for (let i = this.segmentCount - 1; i >= 0; i--) {
      const seg = this.segments[i];
      if (this.texture) {
        drawCachedTexture(ctx, this.texture, seg.x, seg.y, seg.angle);
      }
    }
  }
}

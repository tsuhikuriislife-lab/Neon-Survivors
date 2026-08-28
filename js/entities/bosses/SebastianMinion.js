import { state } from '../../engine/gameState.js';
import { dist, drawPolygon } from '../../engine/Utils.js';
import { spawnExplosion } from '../effects/spawnExplosion.js';
import { FloatingText } from '../effects/FloatingText.js';
import { HazardArea } from '../effects/HazardArea.js';
import { Gem } from '../collectibles/Gem.js';
import { Projectile } from '../projectiles/Projectile.js';
import { AcceleratingProjectile } from '../projectiles/AcceleratingProjectile.js';
import { FallingProjectile } from '../projectiles/FallingProjectile.js';


import { Boss } from './Boss.js';

export class SebastianMinion extends Boss {
  constructor(x, y, hp) {
    super();
    this.name = "Sebastian";
    this.segmentCount = 15;
    this.segmentLength = 36;
    this.radius = 36;
    this.hp = hp;
    this.maxHp = hp;
    this.x = x;
    this.y = y;
    this.angle = Math.random() * Math.PI * 2;
    this.segments = [];
    for (let i = 0; i < this.segmentCount; i++) {
      this.segments.push({ x: this.x, y: this.y - i * this.segmentLength, angle: 0 });
    }
    this.dead = false;
    this.smokeTimer = 0;
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

  takeDamage(amt, damageColor = "#a855f7", hitX = this.x, hitY = this.y) {
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

    const fontSize = isCrit ? parseInt(14) + 6 : 14;

    state.floatingTexts.push(new FloatingText(hitX + offsetX, hitY + offsetY, Math.round(finalAmount), dmgColor, fontSize));
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true; import('../../engine/AudioManager.js').then(({ audioManager }) => audioManager.playSound('enemy_death_boss', { volume: 0.8, throttleMs: 200 }));
      spawnExplosion(this.x, this.y, "#a855f7", 20, 4);
    }
  }

  update(player) {
    if (this.dead) return;

    if (Math.random() < 0.04) {
      this.angle += (Math.random() - 0.5) * 1.5;
    }
    this.x += Math.cos(this.angle) * 3.5;
    this.y += Math.sin(this.angle) * 3.5;

    if (this.x < 30 || this.x > state.width - 30) this.angle = Math.PI - this.angle;
    if (this.y < 30 || this.y > state.height - 30) this.angle = -this.angle;

    this.segments[0].x = this.x;
    this.segments[0].y = this.y;
    this.segments[0].angle = this.angle;

    for (let i = 1; i < this.segmentCount; i++) {
      const prev = this.segments[i - 1];
      const cur = this.segments[i];
      const ang = Math.atan2(prev.y - cur.y, prev.x - cur.x);
      cur.x = prev.x - Math.cos(ang) * this.segmentLength;
      cur.y = prev.y - Math.sin(ang) * this.segmentLength;
      cur.angle = ang;
    }

    this.smokeTimer++;
    if (this.smokeTimer >= 140) {
      this.smokeTimer = 0;
      for (let seg of this.segments) {
        state.hazardAreas.push(new HazardArea(seg.x, seg.y, 40, 300, "rgb(168, 85, 247)", 0.25, false));
      }
    }

    for (let seg of this.segments) {
      if (dist(seg.x, seg.y, player.x, player.y) < this.radius + player.radius) {
        player.takeDamage(18, "#a855f7");
        break;
      }
    }
  }

  draw(ctx) {
    if (this.dead) return;
    for (let i = this.segmentCount - 1; i >= 0; i--) {
      const seg = this.segments[i];
      drawPolygon(ctx, seg.x, seg.y, this.radius, 3, seg.angle, "#a855f7", 8, "rgba(168, 85, 247, 0.2)");
    }
  }
}


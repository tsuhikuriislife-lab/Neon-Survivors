import { state } from '../../engine/gameState.js';
import { spawnExplosion } from '../effects/spawnExplosion.js';
import { HazardArea } from '../effects/HazardArea.js';
import { audioManager } from '../../engine/AudioManager.js';
import { Boss } from './Boss.js';
import { textures, drawCachedTexture } from '../../engine/TextureCache.js';

export class SebastianMinion extends Boss {
  constructor(x, y, hp) {
    super(x, y, "Sebastian", hp, 36, "#ff5500");
    this.segmentCount = 15;
    this.segmentLength = 36;
    this.radius = 36;
    this.hp = hp;
    this.maxHp = hp;
    this.angle = Math.random() * Math.PI * 2;
    this.segments = [];
    for (let i = 0; i < this.segmentCount; i++) {
      this.segments.push({ x: this.x, y: this.y - i * this.segmentLength, angle: 0 });
    }
    this.dead = false;
    this.smokeTimer = 0;
    this.texture = textures['boss_sebastian_seg'];
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
    const fontSize = isCrit ? 20 : 14;

    if (state.floatingTextPool) {
      state.floatingTextPool.acquire(hitX + offsetX, hitY + offsetY, Math.round(finalAmount), dmgColor, fontSize);
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      audioManager.playSound('enemy_death_boss', { volume: 0.8, throttleMs: 200 });
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
    if (this.smokeTimer >= 40) {
      this.smokeTimer = 0;
      const tail = this.segments[this.segmentCount - 1];
      state.hazardAreas.push(new HazardArea(tail.x, tail.y, 45, 300, "rgb(168, 85, 247)", 0.2, false));
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

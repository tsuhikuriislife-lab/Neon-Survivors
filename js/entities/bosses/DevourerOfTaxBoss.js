import { CarlosMinion } from './CarlosMinion.js';
import { SebastianMinion } from './SebastianMinion.js';
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

export class DevourerOfTaxBoss extends Boss {
  constructor() {
    super();
    this.name = "Devourer of Tax";
    this.segmentCount = 45;
    this.segmentLength = 56;
    this.radius = 56;
    const multiplier = state.bossScaling['DevourerOfTaxBoss'] || 1.0;
    this.maxHp = 33000 * multiplier;
    this.hp = this.maxHp;
    this.dead = false;

    this.x = state.width / 2;
    this.y = -100;
    this.vx = 0;
    this.vy = 2;
    this.speed = 2.7;
    this.maxSpeed = 4.8;
    this.accel = 0.01;

    this.segments = [];
    for (let i = 0; i < this.segmentCount; i++) {
      this.segments.push({ x: this.x, y: this.y - i * this.segmentLength, angle: 0 });
    }

    this.acidTimer = 0;
    this.dashTimer = 0;
    this.isDashing = false;
    this.dashDuration = 0;
    
    this.isSplit = false;
    this.carlos = null;
    this.sebastian = null;
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
    if (this.carlos && !this.carlos.dead) list.push(...this.carlos.getTargetables());
    if (this.sebastian && !this.sebastian.dead) list.push(...this.sebastian.getTargetables());
    return list;
  }

  takeDamage(amt, damageColor = "#39ff14", hitX = this.x, hitY = this.y) {
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

    const fontSize = isCrit ? parseInt(16) + 6 : 16;

    state.floatingTexts.push(new FloatingText(hitX + offsetX, hitY + offsetY, Math.round(finalAmount), dmgColor, fontSize));

    if (!this.isSplit && this.hp <= this.maxHp * 0.5) {
      this.split();
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true; import('../../engine/AudioManager.js').then(({ audioManager }) => audioManager.playSound('enemy_death_boss', { volume: 0.8, throttleMs: 200 }));
      spawnExplosion(this.x, this.y, "#00ff66", 45, 6);
      for (let i = 0; i < 18; i++) state.gems.push(new Gem(this.x + (Math.random()*40-20), this.y + (Math.random()*40-20), 10));
    }
  }

  split() {
    this.isSplit = true;
    const subHp = this.maxHp * 0.25;
    this.hp = this.hp * 0.5;

    this.carlos = new CarlosMinion(this.x - 60, this.y, subHp);
    this.sebastian = new SebastianMinion(this.x + 60, this.y, subHp);
  }

  update(player) {
    if (this.carlos && !this.carlos.dead) this.carlos.update(player);
    if (this.sebastian && !this.sebastian.dead) this.sebastian.update(player);

    if (this.dead) return;

    this.dashTimer++;
    if (!this.isDashing && this.dashTimer >= 300) {
      this.isDashing = true;
      this.dashDuration = 0;
      this.dashTimer = 0;
      import('../../engine/AudioManager.js').then(({ audioManager }) => {
          audioManager.playSound('enemy_dash', { volume: 0.8 });
      });
    }

    const targetAngle = Math.atan2(player.y - this.y, player.x - this.x);
    const curAngle = Math.atan2(this.vy, this.vx);

    let diff = targetAngle - curAngle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;

    let turnSpeed = 0.018;

    if (this.isDashing) {
      this.dashDuration++;
      turnSpeed = 0.002;
      this.speed = 10.0;
      
      if (Math.random() < 0.3) {
        import('../effects/spawnExplosion.js').then(({ spawnExplosion }) => {
          spawnExplosion(this.x, this.y, "#ff0000", 2, 1);
        });
      }

      if (this.dashDuration > 70) {
        this.isDashing = false;
        this.speed = this.maxSpeed;
      }
    } else {
      if (Math.abs(diff) > 0.05) {
        this.speed = Math.max(1.5, this.speed - Math.abs(diff) * 0.04);
      } else {
        this.speed = Math.min(this.maxSpeed, this.speed + this.accel * 8);
      }
    }

    const newAngle = curAngle + Math.sign(diff) * Math.min(turnSpeed, Math.abs(diff));

    this.vx = Math.cos(newAngle) * this.speed;
    this.vy = Math.sin(newAngle) * this.speed;

    this.x += this.vx;
    this.y += this.vy;

    this.segments[0].x = this.x;
    this.segments[0].y = this.y;
    this.segments[0].angle = newAngle;

    for (let i = 1; i < this.segmentCount; i++) {
      const prev = this.segments[i - 1];
      const cur = this.segments[i];
      const ang = Math.atan2(prev.y - cur.y, prev.x - cur.x);
      cur.x = prev.x - Math.cos(ang) * this.segmentLength;
      cur.y = prev.y - Math.sin(ang) * this.segmentLength;
      cur.angle = ang;
    }

    this.acidTimer++;
    if (this.acidTimer >= 180) {
      this.acidTimer = 0;
      state.hazardAreas.push(new HazardArea(this.x, this.y, 65, 400, "rgb(57, 255, 20)", 0.2, true));
    }

    for (let seg of this.segments) {
      if (dist(seg.x, seg.y, player.x, player.y) < this.radius + player.radius) {
        player.takeDamage(24, "#39ff14");
        break;
      }
    }
  }

  draw(ctx) {
    if (this.carlos && !this.carlos.dead) this.carlos.draw(ctx);
    if (this.sebastian && !this.sebastian.dead) this.sebastian.draw(ctx);

    if (this.dead) return;

    for (let i = this.segmentCount - 1; i >= 0; i--) {
      const seg = this.segments[i];
      const hue = (i / this.segmentCount) * 360;
      const color = `hsl(${hue}, 100%, 55%)`;
      drawPolygon(ctx, seg.x, seg.y, this.radius, 3, seg.angle, color, 10, color.replace('hsl', 'hsla').replace(')', ', 0.3)'));
    }
  }
}


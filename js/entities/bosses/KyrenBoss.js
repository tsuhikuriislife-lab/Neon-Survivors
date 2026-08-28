import { DenzelBoss } from './DenzelBoss.js';
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

export class KyrenBoss extends Boss {
  constructor(x, y) {
    super();
    this.name = "Kyren";
    const cx = state.width / 2;
    const cy = state.height / 2;
    this.orbitRadius = Math.min(state.width, state.height) * 0.35;

    if (x !== undefined && y !== undefined) {
      this.x = x;
      this.y = y;
      this.orbitAngle = Math.atan2(this.y - cy, this.x - cx);
    } else {
      this.orbitAngle = -Math.PI / 2;
      this.x = cx + Math.cos(this.orbitAngle) * this.orbitRadius;
      this.y = cy + Math.sin(this.orbitAngle) * this.orbitRadius;
    }

    this.radius = 150;
    const multiplier = state.bossScaling['KyrenBoss'] || 1.0;
    this.maxHp = 12000 * multiplier;
    this.hp = this.maxHp;
    this.color = "#00ffcc";
    this.angle = 0;
    this.innerAngle = 0;

    this.state = 0;
    this.stateTimer = 0;
    this.chargeTargetX = 0;
    this.chargeTargetY = 0;
    this.chargeStartX = 0;
    this.chargeStartY = 0;

    this.isSplit = false;
    this.denzel = null;
    this.dead = false;
  }

  getTargetables() {
    const list = [];
    if (!this.dead) list.push(this);
    if (this.denzel && !this.denzel.dead) list.push(this.denzel);
    return list;
  }

  takeDamage(amt, damageColor = "#00ffcc") {
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

    state.floatingTexts.push(new FloatingText(this.x + offsetX, this.y + offsetY, Math.round(finalAmount), dmgColor, fontSize));

    if (!this.isSplit && this.hp <= this.maxHp * 0.5) {
      this.split();
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true; import('../../engine/AudioManager.js').then(({ audioManager }) => audioManager.playSound('enemy_death_boss', { volume: 0.8, throttleMs: 200 }));
      spawnExplosion(this.x, this.y, this.color, 40, 6);
      for (let i = 0; i < 15; i++) state.gems.push(new Gem(this.x + (Math.random()*40-20), this.y + (Math.random()*40-20), 10));
    }
  }

  split() {
    this.isSplit = true;
    const sharedHp = this.hp / 2;
    this.hp = sharedHp;
    this.maxHp = this.maxHp / 2;
    this.denzel = new DenzelBoss(this.x, this.y, sharedHp, sharedHp);
  }

  update(player) {
    this.angle += 0.02;
    this.innerAngle -= 0.04;

    if (this.denzel && !this.denzel.dead) {
      this.denzel.update(player);
    }

    if (this.dead) return;

    this.stateTimer++;
    const cx = state.width / 2;
    const cy = state.height / 2;

    if (this.state === 0) {
      this.orbitAngle += 0.015;
      this.x = cx + Math.cos(this.orbitAngle) * this.orbitRadius;
      this.y = cy + Math.sin(this.orbitAngle) * this.orbitRadius;

      if (this.stateTimer % 75 === 0) {
        this.fireWave();
      }

      if (this.stateTimer >= 380) {
        this.state = 1;
        this.stateTimer = 0;
        const oppositeAngle = this.orbitAngle + Math.PI;
        this.chargeStartX = this.x;
        this.chargeStartY = this.y;
        this.chargeTargetX = cx + Math.cos(oppositeAngle) * this.orbitRadius;
        this.chargeTargetY = cy + Math.sin(oppositeAngle) * this.orbitRadius;
      }
    } else if (this.state === 1) {
      if (this.stateTimer >= 90) {
        this.state = 2;
        this.stateTimer = 0;
        import('../../engine/AudioManager.js').then(({ audioManager }) => {
            audioManager.playSound('enemy_dash', { volume: 0.8, throttleMs: 100 });
        });
      }
    } else if (this.state === 2) {
      const progress = Math.min(1, this.stateTimer / 25);
      this.x = this.chargeStartX + (this.chargeTargetX - this.chargeStartX) * progress;
      this.y = this.chargeStartY + (this.chargeTargetY - this.chargeStartY) * progress;

      if (progress >= 1) {
        this.state = 0;
        this.stateTimer = 0;
        this.orbitAngle = Math.atan2(this.y - cy, this.x - cx);
      }
    }

    if (dist(this.x, this.y, player.x, player.y) < this.radius + player.radius) {
      player.takeDamage(35, this.color);
    }
  }

  fireWave() {
    const count = 15;
    for (let i = 0; i < count; i++) {
      const a = (i * 2 * Math.PI) / count;
      state.enemyProjectiles.push(new Projectile(this.x, this.y, Math.cos(a) * 4, Math.sin(a) * 4, 15, "#00ffcc", 5, true));
    }
    import('../../engine/AudioManager.js').then(({ audioManager }) => {
        audioManager.playSound('enemy_projectile', { volume: 0.6, throttleMs: 100 });
    });
  }

  draw(ctx) {
    if (this.denzel && !this.denzel.dead) {
      this.denzel.draw(ctx);
    }

    if (this.dead) return;

    if (this.state === 1) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(this.chargeStartX, this.chargeStartY);
      ctx.lineTo(this.chargeTargetX, this.chargeTargetY);
      ctx.strokeStyle = `rgba(0, 255, 204, ${Math.abs(Math.sin(this.stateTimer * 0.15))})`;
      ctx.lineWidth = 6;
      ctx.setLineDash([12, 8]);
      ctx.shadowColor = "#00ffcc";
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.restore();
    }

    drawPolygon(ctx, this.x, this.y, this.radius, 8, this.angle, this.color, 18, "rgba(0, 255, 204, 0.1)");
    if (!this.isSplit) {
      drawPolygon(ctx, this.x, this.y, this.radius * 0.52, 8, this.innerAngle, "#ffffff", 10, "rgba(255, 255, 255, 0.2)");
    }
  }
}


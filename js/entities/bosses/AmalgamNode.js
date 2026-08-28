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

export class AmalgamNode extends Boss {
  constructor(name, x, y, hp, maxHp, stage, vx, vy) {
    super();
    this.name = name;
    this.x = x;
    this.y = y;
    this.hp = hp;
    this.maxHp = maxHp;
    this.stage = stage;
    this.dead = false;

    if (stage === 1) {
      this.radius = 160;
      this.speed = 1.6;
      this.sprayCount = 15;
    } else if (stage === 2) {
      this.radius = 56;
      this.speed = 3.7;
      this.sprayCount = 8;
    } else if (stage === 3) {
      this.radius = 33;
      this.speed = 4.5;
      this.sprayCount = 5;
    } else {
      this.radius = 14;
      this.speed = 6.6;
      this.sprayCount = 3;
    }

    const ang = Math.random() * Math.PI * 2;
    this.vx = vx || Math.cos(ang) * this.speed;
    this.vy = vy || Math.sin(ang) * this.speed;
    this.angle = 0;
    this.color = "#ff0033";
  }

  takeDamage(amt, damageColor = "#ff0033") {
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

    const fontSize = isCrit ? parseInt(15) + 6 : 15;

    state.floatingTexts.push(new FloatingText(this.x + offsetX, this.y + offsetY, Math.round(finalAmount), dmgColor, fontSize));

    if (this.stage === 1 && this.hp <= this.maxHp * 0.75) {
      this.subdivide();
    } else if ((this.stage === 2 || this.stage === 3) && this.hp <= this.maxHp * 0.75) {
      this.subdivide();
    } else if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true; import('../../engine/AudioManager.js').then(({ audioManager }) => audioManager.playSound('enemy_death_boss', { volume: 0.8, throttleMs: 200 }));
      spawnExplosion(this.x, this.y, this.color, 20, 4);
      for (let i = 0; i < 4; i++) state.gems.push(new Gem(this.x + (Math.random()*20-10), this.y + (Math.random()*20-10), 6));
    }
  }

  subdivide() {
    this.dead = true; import('../../engine/AudioManager.js').then(({ audioManager }) => audioManager.playSound('enemy_death_boss', { volume: 0.8, throttleMs: 200 }));
    const nextStage = this.stage + 1;
    if (nextStage > 4) return;

    const sharedHp = this.hp / 2;
    const child1 = new AmalgamNode(this.name, this.x - 20, this.y, sharedHp, sharedHp, nextStage, this.vx * 1.2, -this.vy * 1.2);
    const child2 = new AmalgamNode(this.name, this.x + 20, this.y, sharedHp, sharedHp, nextStage, -this.vx * 1.2, this.vy * 1.2);
    
    if (state.currentAmalgamBoss) {
      state.currentAmalgamBoss.nodes.push(child1, child2);
    }
    spawnExplosion(this.x, this.y, "#ff0055", 25, 5);
  }

  update(player) {
    if (this.dead) return;
    this.angle += 0.03;

    this.x += this.vx;
    this.y += this.vy;

    let hitWall = false;
    let sprayDirX = 0;
    let sprayDirY = 0;

    if (this.x <= this.radius) {
      this.x = this.radius;
      this.vx = Math.abs(this.vx);
      hitWall = true;
      sprayDirX = 1;
    } else if (this.x >= state.width - this.radius) {
      this.x = state.width - this.radius;
      this.vx = -Math.abs(this.vx);
      hitWall = true;
      sprayDirX = -1;
    }

    if (this.y <= this.radius) {
      this.y = this.radius;
      this.vy = Math.abs(this.vy);
      hitWall = true;
      sprayDirY = 1;
    } else if (this.y >= state.height - this.radius) {
      this.y = state.height - this.radius;
      this.vy = -Math.abs(this.vy);
      hitWall = true;
      sprayDirY = -1;
    }

    if (hitWall) {
      this.fireSpray(sprayDirX, sprayDirY);
    }

    if (dist(this.x, this.y, player.x, player.y) < this.radius + player.radius) {
      player.takeDamage(20, this.color);
    }
  }

  fireSpray(dx, dy) {
    const baseAngle = Math.atan2(dy, dx);
    for (let i = 0; i < this.sprayCount; i++) {
      const spread = (Math.random() - 0.5) * 1.2;
      const a = baseAngle + spread;
      const spd = 3.5 + Math.random() * 1.8;
      state.enemyProjectiles.push(new Projectile(this.x, this.y, Math.cos(a) * spd, Math.sin(a) * spd, 12, "#ff0033", 4, true));
    }
    import('../../engine/AudioManager.js').then(({ audioManager }) => {
        audioManager.playSound('enemy_projectile', { volume: 0.7, throttleMs: 80 });
    });
  }

  draw(ctx) {
    if (this.dead) return;
    drawPolygon(ctx, this.x, this.y, this.radius, 10, this.angle, this.color, 14, "rgba(255, 0, 51, 0.2)");
  }
}


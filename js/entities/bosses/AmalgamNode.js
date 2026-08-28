import { state } from '../../engine/gameState.js';
import { dist } from '../../engine/Utils.js';
import { spawnExplosion } from '../effects/spawnExplosion.js';
import { Projectile } from '../projectiles/Projectile.js';
import { AcceleratingProjectile } from '../projectiles/AcceleratingProjectile.js';
import { audioManager } from '../../engine/AudioManager.js';
import { Boss } from './Boss.js';
import { textures, drawCachedTexture } from '../../engine/TextureCache.js';

export class AmalgamNode extends Boss {
  constructor(name, x, y, hp, maxHp, stage, vx, vy) {
    const baseRadius = 160;
    const baseSpeed = 1.6;
    let radius = baseRadius;
    let speed = baseSpeed;
    let sprayCount = 20;

    if (stage === 1) {
      radius = baseRadius * 1.0;
      speed = baseSpeed * 1.0;
      sprayCount = 20;
    } else if (stage === 2) {
      radius = baseRadius * 0.5;
      speed = baseSpeed * 2.0;
      sprayCount = 15;
    } else if (stage === 3) {
      radius = baseRadius * 0.25;
      speed = baseSpeed * 3.0;
      sprayCount = 10;
    } else {
      radius = baseRadius * 0.125;
      speed = baseSpeed * 4.0;
      sprayCount = 5;
    }

    super(x, y, name, maxHp, radius, "#ff0033", hp);
    this.stage = stage;
    this.radius = radius;
    this.speed = speed;
    this.sprayCount = sprayCount;
    this.dead = false;
    this.color = "#ff0033";
    this.texture = textures[`boss_amalgam_${Math.min(4, Math.max(1, stage))}`];

    if (vx !== undefined && vy !== undefined) {
      const curSpd = Math.hypot(vx, vy) || 1;
      this.vx = (vx / curSpd) * this.speed;
      this.vy = (vy / curSpd) * this.speed;
    } else {
      const ang = this.calculateInitialAngle(x, y);
      this.vx = Math.cos(ang) * this.speed;
      this.vy = Math.sin(ang) * this.speed;
    }
    this.angle = 0;
  }

  calculateInitialAngle(x, y) {
    const W = (state && state.width) ? state.width : 1920;
    const H = (state && state.height) ? state.height : 1920;

    const corners = [
      { x: 0, y: 0 },
      { x: W, y: 0 },
      { x: W, y: H },
      { x: 0, y: H }
    ];

    const cornerAngles = corners.map(c => Math.atan2(c.y - y, c.x - x));
    const cornerExclusion = Math.PI / 9; // 20° de margen de exclusión alrededor de cada esquina
    const cardinalExclusion = Math.PI / 24; // 7.5° de margen para evitar trayectorias 1D estrictamente horizontales/verticales

    for (let attempt = 0; attempt < 200; attempt++) {
      const angle = (Math.random() * 2 - 1) * Math.PI;

      // Descartar ángulos que apunten hacia alguna de las 4 esquinas del mapa
      let tooClose = false;
      for (const ca of cornerAngles) {
        let diff = Math.abs(angle - ca) % (Math.PI * 2);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff < cornerExclusion) {
          tooClose = true;
          break;
        }
      }

      // Descartar trayectorias puramente cardinales
      if (!tooClose) {
        const cardinals = [0, Math.PI / 2, -Math.PI / 2, Math.PI, -Math.PI];
        for (const card of cardinals) {
          let diff = Math.abs(angle - card) % (Math.PI * 2);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          if (diff < cardinalExclusion) {
            tooClose = true;
            break;
          }
        }
      }

      if (!tooClose) {
        return angle;
      }
    }

    return Math.PI / 8;
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
    const fontSize = isCrit ? 21 : 15;

    if (state.floatingTextPool) {
      state.floatingTextPool.acquire(this.x + offsetX, this.y + offsetY, Math.round(finalAmount), dmgColor, fontSize);
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      if (this.stage < 4) {
        this.subdivide();
      } else {
        audioManager.playSound('enemy_death_boss', { volume: 0.8, throttleMs: 200 });
        spawnExplosion(this.x, this.y, this.color, 20, 4);
        for (let i = 0; i < 4; i++) {
          if (state.gemPool) {
            state.gemPool.acquire(this.x + (Math.random() * 20 - 10), this.y + (Math.random() * 20 - 10), 6);
          }
        }
      }
    }
  }

  subdivide() {
    this.dead = true;
    audioManager.playSound('enemy_death_boss', { volume: 0.8, throttleMs: 200 });
    const nextStage = this.stage + 1;
    if (nextStage > 4) return;

    const childHp = this.maxHp / 3;
    const baseAngle = Math.atan2(this.vy, this.vx);
    const children = [];

    for (let i = 0; i < 3; i++) {
      const ang = baseAngle + (i - 1) * ((Math.PI * 2) / 3);
      const offsetX = Math.cos(ang) * 20;
      const offsetY = Math.sin(ang) * 20;
      const vx = Math.cos(ang);
      const vy = Math.sin(ang);

      const child = new AmalgamNode(
        this.name,
        this.x + offsetX,
        this.y + offsetY,
        childHp,
        childHp,
        nextStage,
        vx,
        vy
      );
      children.push(child);
    }
    
    if (state.currentAmalgamBoss) {
      state.currentAmalgamBoss.nodes.push(...children);
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
    let contactX = this.x;
    let contactY = this.y;

    if (this.x <= this.radius) {
      this.x = this.radius;
      this.vx = Math.abs(this.vx);
      hitWall = true;
      sprayDirX = 1;
      contactX = 0;
    } else if (this.x >= state.width - this.radius) {
      this.x = state.width - this.radius;
      this.vx = -Math.abs(this.vx);
      hitWall = true;
      sprayDirX = -1;
      contactX = state.width;
    }

    if (this.y <= this.radius) {
      this.y = this.radius;
      this.vy = Math.abs(this.vy);
      hitWall = true;
      sprayDirY = 1;
      contactY = 0;
    } else if (this.y >= state.height - this.radius) {
      this.y = state.height - this.radius;
      this.vy = -Math.abs(this.vy);
      hitWall = true;
      sprayDirY = -1;
      contactY = state.height;
    }

    if (hitWall) {
      this.fireSpray(contactX, contactY, sprayDirX, sprayDirY);
    }

    if (dist(this.x, this.y, player.x, player.y) < this.radius + player.radius) {
      player.takeDamage(20, this.color);
    }
  }

  fireSpray(originX, originY, dx, dy) {
    const baseAngle = Math.atan2(dy, dx);
    for (let i = 0; i < this.sprayCount; i++) {
      const spread = (Math.random() - 0.5) * 1.2;
      const a = baseAngle + spread;
      const isAccelerating = Math.random() < 0.3;

      if (isAccelerating) {
        const targetX = originX + Math.cos(a) * 100;
        const targetY = originY + Math.sin(a) * 100;
        const initialSpeed = 1.2 + Math.random() * 0.8;
        const accel = 0.06 + Math.random() * 0.04;
        state.acceleratingProjectiles.push(
          new AcceleratingProjectile(originX, originY, targetX, targetY, 12, this.color, initialSpeed, accel)
        );
      } else {
        const spd = 3.5 + Math.random() * 1.8;
        const vx = Math.cos(a) * spd;
        const vy = Math.sin(a) * spd;

        if (state.projectilePool) {
          state.projectilePool.acquire(originX, originY, vx, vy, 12, this.color, 4, true);
        } else {
          state.enemyProjectiles.push(new Projectile(originX, originY, vx, vy, 12, this.color, 4, true));
        }
      }
    }
    audioManager.playSound('enemy_projectile', { volume: 0.7, throttleMs: 80 });
  }

  draw(ctx) {
    if (this.dead) return;
    if (this.texture) {
      drawCachedTexture(ctx, this.texture, this.x, this.y, this.angle);
    }
  }
}

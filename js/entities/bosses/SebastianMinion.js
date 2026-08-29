import { state } from '../../engine/gameState.js';
import { dist } from '../../engine/Utils.js';
import { spawnExplosion } from '../effects/spawnExplosion.js';
import { HazardArea } from '../effects/HazardArea.js';
import { audioManager } from '../../engine/AudioManager.js';
import { Boss } from './Boss.js';
import { textures, drawCachedTexture } from '../../engine/TextureCache.js';

export class SebastianMinion extends Boss {
  constructor(x, y, hp, initialAngle = Math.random() * Math.PI * 2, initialSpeed = 7.5, maxHp = hp) {
    super(x, y, "Sebastian", maxHp, 36, "#ff5500", hp);
    this.segmentCount = 15;
    this.segmentLength = 36;
    this.radius = 36;
    this.dead = false;
    this.smokeTimer = 0;
    this.texture = textures['boss_sebastian_seg'];

    // Físicas Estilo Eater of Worlds (Asemejadas al padre)
    this.outsideSpeed = 13.2;       // Velocidad máxima incrementada para persecución y embestidas
    this.minSpeed = 2.8;            // Velocidad mínima dentro del mapa
    this.friction = 0.045;          // Tasa de desaceleración dentro del mapa
    this.outsideAccel = 0.22;       // Aceleración rápida afuera
    this.speed = initialSpeed || this.outsideSpeed;
    this.aiState = 'ATTACK';        // Estados: 'ATTACK', 'SEEK_EXIT', 'OUTSIDE_ACCEL', 'OUTSIDE_REENTRY'

    this.outsideTurnRate = 0.075;   // Giro ágil fuera del mapa
    this.minTurnRate = 0.010;
    this.maxTurnRate = 0.048;
    this.turnRateFactor = 0.11;

    this.headDamage = 22;
    this.bodyDamage = 10;
    this.bodyHitRadius = this.radius * 0.7;
    this.bodyHitCooldown = 0;
    this.bodyHitCooldownMax = 30;

    this.proximityFadeRadius = 140;
    this.minAlphaOnPlayer = 0.22;

    this.vx = Math.cos(initialAngle) * this.speed;
    this.vy = Math.sin(initialAngle) * this.speed;

    this.segments = [];
    for (let i = 0; i < this.segmentCount; i++) {
      this.segments.push({ 
        x: this.x - Math.cos(initialAngle) * i * this.segmentLength, 
        y: this.y - Math.sin(initialAngle) * i * this.segmentLength, 
        angle: initialAngle 
      });
    }
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
    const fontSize = isCrit ? 24 : 14;

    if (state.floatingTextPool) {
      state.floatingTextPool.acquire(hitX + offsetX, hitY + offsetY, Math.round(finalAmount), damageColor, fontSize, isCrit);
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      audioManager.playSound('enemy_death_boss', { volume: 0.8, throttleMs: 200 });
      spawnExplosion(this.x, this.y, "#a855f7", 20, 4);
    }
  }

  getNearbySnakes(passedSnakes) {
    if (passedSnakes && passedSnakes.length > 0) return passedSnakes;
    const list = [];
    if (!this.dead) list.push(this);
    for (let b of state.bosses) {
      if (b && !b.dead) {
        if (!list.includes(b)) list.push(b);
        if (b.carlos && !b.carlos.dead && !list.includes(b.carlos)) list.push(b.carlos);
        if (b.sebastian && !b.sebastian.dead && !list.includes(b.sebastian)) list.push(b.sebastian);
      }
    }
    return list;
  }

  applySnakeRepulsion(otherSnakes) {
    let repelX = 0;
    let repelY = 0;
    const separationDist = this.radius * 3.0;

    for (const other of otherSnakes) {
      if (!other || other.dead || other === this) continue;

      // 1. Repulsión Cabeza contra Cabeza
      const dHead = dist(this.x, this.y, other.x, other.y);
      if (dHead < separationDist && dHead > 0.1) {
        const force = (1 - dHead / separationDist) * 4.0;
        const nx = (this.x - other.x) / dHead;
        const ny = (this.y - other.y) / dHead;
        repelX += nx * force;
        repelY += ny * force;
      }

      // 2. Repulsión Cabeza contra Segmentos de la otra serpiente
      if (other.segments) {
        const checkCount = Math.min(8, other.segments.length);
        for (let i = 1; i < checkCount; i++) {
          const seg = other.segments[i];
          const dSeg = dist(this.x, this.y, seg.x, seg.y);
          const segSepDist = this.radius * 2.4;
          if (dSeg < segSepDist && dSeg > 0.1) {
            const force = (1 - dSeg / segSepDist) * 2.5;
            const nx = (this.x - seg.x) / dSeg;
            const ny = (this.y - seg.y) / dSeg;
            repelX += nx * force;
            repelY += ny * force;
          }
        }
      }
    }

    this.x += repelX;
    this.y += repelY;
    return { repelX, repelY };
  }

  update(player, otherSnakes = null) {
    if (this.dead) return;

    // Aplicar repulsión física y de trayectoria entre serpientes
    const activeSnakes = this.getNearbySnakes(otherSnakes);
    const { repelX, repelY } = this.applySnakeRepulsion(activeSnakes);

    const isOutside = (this.x < 0 || this.x > state.width || this.y < 0 || this.y > state.height);
    const curAngle = Math.atan2(this.vy, this.vx);
    let targetAngle = curAngle;
    let turnSpeed = this.minTurnRate;

    // Flanqueo de Sebastián (desplaza su punto de mira hacia el costado opuesto del jugador)
    const basePlayerAngle = Math.atan2(player.y - this.y, player.x - this.x);
    const flankOffsetAngle = basePlayerAngle - Math.PI * 0.4;
    const flankDist = 120;
    const targetX = player.x + Math.cos(flankOffsetAngle) * flankDist;
    const targetY = player.y + Math.sin(flankOffsetAngle) * flankDist;

    // 1. Control de Estado y Navegación por Zonas
    if (isOutside) {
      if (this.speed < this.outsideSpeed - 0.3) {
        // Fuera del mapa acelerando: sigue hacia afuera hasta alcanzar velocidad máxima
        this.speed = Math.min(this.outsideSpeed, this.speed + this.outsideAccel);
        this.aiState = 'OUTSIDE_ACCEL';
        targetAngle = curAngle;
        turnSpeed = 0.01;
      } else {
        // Ya alcanzó su velocidad máxima: activa el reingreso hacia el jugador flanqueando
        this.speed = this.outsideSpeed;
        this.aiState = 'OUTSIDE_REENTRY';
        targetAngle = Math.atan2(targetY - this.y, targetX - this.x);
        turnSpeed = this.outsideTurnRate;
      }

      // Failsafe de seguridad si se aleja demasiado
      const centerDist = dist(this.x, this.y, state.width / 2, state.height / 2);
      if (centerDist > 2200) {
        this.speed = this.outsideSpeed;
        this.aiState = 'OUTSIDE_REENTRY';
        targetAngle = Math.atan2(player.y - this.y, player.x - this.x);
        turnSpeed = 0.12;
      }
    } else {
      // Dentro del mapa:
      if (this.aiState === 'OUTSIDE_REENTRY' || this.aiState === 'OUTSIDE_ACCEL') {
        this.aiState = 'ATTACK';
      }

      if (this.aiState === 'ATTACK') {
        // Desaceleración progresiva (fricción) hasta minSpeed
        if (this.speed > this.minSpeed) {
          this.speed = Math.max(this.minSpeed, this.speed - this.friction);
        }

        // Si ya perdió toda su inercia y llegó a baja velocidad -> cambiar objetivo a buscar la salida del mapa
        if (this.speed <= this.minSpeed + 0.3) {
          this.aiState = 'SEEK_EXIT';
        }

        targetAngle = Math.atan2(targetY - this.y, targetX - this.x);
        const rawTurnRate = this.turnRateFactor / Math.max(1.0, this.speed);
        turnSpeed = Math.min(this.maxTurnRate, Math.max(this.minTurnRate, rawTurnRate));
      } else if (this.aiState === 'SEEK_EXIT') {
        // Aceleración ligera hacia la salida con offset diferenciado
        this.speed = Math.min(5.5, this.speed + 0.04);

        // Apuntar a la salida de perímetro más cercana (offset de Sebastián hacia -X / +Y)
        let exitX = this.x - 180;
        let exitY = this.y + 180;
        const distLeft = this.x;
        const distRight = state.width - this.x;
        const distTop = this.y;
        const distBottom = state.height - this.y;
        const minDist = Math.min(distLeft, distRight, distTop, distBottom);

        if (minDist === distLeft) exitX = -250;
        else if (minDist === distRight) exitX = state.width + 250;
        else if (minDist === distTop) exitY = -250;
        else exitY = state.height + 250;

        targetAngle = Math.atan2(exitY - this.y, exitX - this.x);
        turnSpeed = this.maxTurnRate;
      }
    }

    // Desviar targetAngle suavemente por fuerza de repulsión
    if (Math.hypot(repelX, repelY) > 0.1) {
      const repelAngle = Math.atan2(repelY, repelX);
      let diffRepel = repelAngle - targetAngle;
      while (diffRepel < -Math.PI) diffRepel += Math.PI * 2;
      while (diffRepel > Math.PI) diffRepel -= Math.PI * 2;
      targetAngle += diffRepel * 0.4;
    }

    // 2. Navegación limitada estrictamente por turnSpeed por frame
    let diff = targetAngle - curAngle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;

    const newAngle = curAngle + Math.sign(diff) * Math.min(turnSpeed, Math.abs(diff));
    this.vx = Math.cos(newAngle) * this.speed;
    this.vy = Math.sin(newAngle) * this.speed;

    this.x += this.vx;
    this.y += this.vy;

    // 4. Cinemática de segmentos
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

    // 5. Ataques: ONLY when inside the map
    this.smokeTimer++;
    if (!isOutside && this.smokeTimer >= 40) {
      this.smokeTimer = 0;
      const tail = this.segments[this.segmentCount - 1];
      if (tail.x >= 0 && tail.x <= state.width && tail.y >= 0 && tail.y <= state.height) {
        state.hazardAreas.push(new HazardArea(tail.x, tail.y, 45, 300, "rgb(168, 85, 247)", 0.2, false));
      }
    }

    // 6. Colisiones y balance de daño
    if (this.bodyHitCooldown > 0) this.bodyHitCooldown--;

    const headDistance = dist(this.x, this.y, player.x, player.y);
    if (headDistance < this.radius + player.radius) {
      player.takeDamage(this.headDamage, "#ff5500");
    }

    if (this.bodyHitCooldown <= 0) {
      for (let i = 1; i < this.segmentCount; i++) {
        const seg = this.segments[i];
        if (dist(seg.x, seg.y, player.x, player.y) < this.bodyHitRadius + player.radius) {
          player.takeDamage(this.bodyDamage, "#ff5500");
          this.bodyHitCooldown = this.bodyHitCooldownMax;
          break;
        }
      }
    }
  }

  draw(ctx) {
    if (this.dead) return;
    const player = state.player;

    for (let i = this.segmentCount - 1; i >= 0; i--) {
      const seg = this.segments[i];
      if (this.texture) {
        let alpha = 1.0;
        if (player && i > 0) {
          const d = dist(seg.x, seg.y, player.x, player.y);
          if (d < this.proximityFadeRadius) {
            alpha = Math.max(this.minAlphaOnPlayer, d / this.proximityFadeRadius);
          }
        }

        if (alpha < 1.0) {
          ctx.save();
          ctx.globalAlpha = alpha;
          drawCachedTexture(ctx, this.texture, seg.x, seg.y, seg.angle);
          ctx.restore();
        } else {
          drawCachedTexture(ctx, this.texture, seg.x, seg.y, seg.angle);
        }
      }
    }
  }
}

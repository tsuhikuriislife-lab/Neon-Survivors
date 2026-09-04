import { CarlosMinion } from './CarlosMinion.js';
import { SebastianMinion } from './SebastianMinion.js';
import { state } from '../../engine/gameState.js';
import { dist } from '../../engine/Utils.js';
import { spawnExplosion } from '../effects/spawnExplosion.js';
import { HazardArea } from '../effects/HazardArea.js';
import { audioManager } from '../../engine/AudioManager.js';
import { Boss } from './Boss.js';

import { getOrCachePolygon, textures } from '../../engine/TextureCache.js';
import { worldLayer } from '../../main.js';

function hslToHex(h, s, l) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return parseInt('0x' + f(0) + f(8) + f(4));
}

export class DevourerOfTaxBoss extends Boss {
  constructor(x, y, hp, maxHp) {
    const multiplier = state.bossScaling['DevourerOfTaxBoss'] || 1.0;
    const defaultMaxHp = 15000 * multiplier;
    const finalMaxHp = maxHp !== undefined ? maxHp : defaultMaxHp;
    const finalHp = hp !== undefined ? hp : finalMaxHp;
    super(0, 0, "Devourer of Tax", finalMaxHp, 36, "#39ff14", finalHp);
    if (this.sprite) {
      if (this.sprite.parent) this.sprite.parent.removeChild(this.sprite);
      this.sprite.destroy();
      this.sprite = null;
    }
    this.segmentCount = 90;
    this.segmentLength = 36;
    this.radius = 36;
    this.color = "#39ff14";
    this.dead = false;

    this.x = x !== undefined ? x : state.width / 2;
    this.y = y !== undefined ? y : 250;
    this.vx = 0;
    this.vy = 2;

    // segmentRgb precalculation removed for WebGL

    // Fisicas y Mecanicas Estilo Eater of Worlds
    this.outsideSpeed = 14.0;       // Velocidad maxima incrementada para embestidas
    this.minSpeed = 3.6;            // Velocidad minima de inercia dentro de la arena
    this.friction = 0.045;          // Tasa de desaceleracion por frame dentro del mapa
    this.outsideAccel = 0.22;       // Aceleracion rapida fuera del mapa hacia outsideSpeed
    this.speed = this.outsideSpeed; // Inicia a maxima velocidad
    this.aiState = 'ATTACK';        // Estados: 'ATTACK', 'SEEK_EXIT', 'OUTSIDE_ACCEL', 'OUTSIDE_REENTRY'
    
    // Relacion de Giro
    this.outsideTurnRate = 0.075;   // Giro agil fuera del mapa para reingreso veloz
    this.minTurnRate = 0.009;       // Velocidad angular minima a alta velocidad dentro del mapa (arco amplio)
    this.maxTurnRate = 0.045;       // Velocidad angular maxima a baja velocidad dentro del mapa (giro cerrado)
    this.turnRateFactor = 0.11;     // Factor de escala turnRate = turnRateFactor / speed dentro del mapa

    // Balance de Colisiones y Dano
    this.headDamage = 28;           // Dano directo de impacto de la cabeza
    this.bodyDamage = 12;           // Dano reducido del cuerpo
    this.bodyHitRadius = this.radius * 0.7; // Radio permisivo de los segmentos del cuerpo
    this.bodyHitCooldown = 0;       // Temporizador de cooldown de dano del cuerpo
    this.bodyHitCooldownMax = 30;   // Cooldown en frames (0.5s) entre impactos del cuerpo

    // Visibilidad Dinamica
    this.proximityFadeRadius = 140; // Radio de desvanecimiento cerca del jugador
    this.minAlphaOnPlayer = 0.22;   // Transparencia minima cuando se superpone al jugador

    this.segments = [];
    for (let i = 0; i < this.segmentCount; i++) {
      this.segments.push({ x: this.x, y: this.y - i * this.segmentLength, angle: 0 });
    }
    this.texture = textures['boss_devourer_seg'];
    this.segmentSprites = [];
    for (let i = 0; i < this.segmentCount; i++) {
      let spr = new PIXI.Sprite();
      if (textures['boss_devourer_seg']) {
          spr.texture = textures['boss_devourer_seg'];
      }
      spr.anchor.set(0.5);
      worldLayer.addChild(spr);
      this.segmentSprites.push(spr);
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
    const fontSize = isCrit ? 26 : 16;

    if (state.floatingTextPool) {
      state.floatingTextPool.acquire(hitX + offsetX, hitY + offsetY, Math.round(finalAmount), damageColor, fontSize, isCrit);
    }

    if (!this.isSplit && this.hp <= this.maxHp * 0.5) {
      this.split();
    }

    if (this.hp <= 0) {
      this.hp = 0;
      if (!this.dead) {
        this.dead = true;
        this.die();
        audioManager.playSound('enemy_death_boss', { volume: 0.8, throttleMs: 200 });
        spawnExplosion(this.x, this.y, "#00ff66", 45, 6);
        for (let i = 0; i < 18; i++) {
          if (state.gemPool) {
            state.gemPool.acquire(this.x + (Math.random() * 40 - 20), this.y + (Math.random() * 40 - 20), 10);
          }
        }
      }
    }
  }

  split() {
    this.isSplit = true;
    const subHp = this.maxHp * 0.25;

    const angleCarlos = Math.random() * Math.PI * 2;
    const angleSebastian = angleCarlos + Math.PI + (Math.random() - 0.5) * 1.0;
    const impulseSpeed = 12.0;

    this.carlos = new CarlosMinion(this.x, this.y, subHp, angleCarlos, impulseSpeed);
    this.sebastian = new SebastianMinion(this.x, this.y, subHp, angleSebastian, impulseSpeed);

    const minionSegments = (this.carlos ? this.carlos.segmentCount : 0) + (this.sebastian ? this.sebastian.segmentCount : 0);
    this.segmentCount = Math.max(1, this.segmentCount - minionSegments);
    this.segments = this.segments.slice(0, this.segmentCount);

    if (this.segmentSprites) {
      const orphanedSprites = this.segmentSprites.slice(this.segmentCount);
      orphanedSprites.forEach(spr => {
        if (spr.parent) spr.parent.removeChild(spr);
        spr.destroy();
      });
      this.segmentSprites = this.segmentSprites.slice(0, this.segmentCount);
    }
    spawnExplosion(this.x, this.y, "#39ff14", 30, 4);
  }

  restoreState(saveData) {
    this.x = saveData.x;
    this.y = saveData.y;
    this.hp = saveData.hp;
    this.maxHp = saveData.maxHp;
    this.dead = saveData.hp <= 0;
    
    if (saveData.isSplit || this.hp <= this.maxHp * 0.5) {
      if (!this.isSplit) this.split();
      if (this.carlos && saveData.carlosHp !== undefined) this.carlos.hp = saveData.carlosHp;
      if (this.sebastian && saveData.sebastianHp !== undefined) this.sebastian.hp = saveData.sebastianHp;
    }
  }


  getNearbySnakes(passedSnakes) {
    if (passedSnakes && passedSnakes.length > 0) return passedSnakes;
    const list = [];
    if (!this.dead) list.push(this);
    if (this.carlos && !this.carlos.dead) list.push(this.carlos);
    if (this.sebastian && !this.sebastian.dead) list.push(this.sebastian);
    for (let b of state.bosses) {
      if (b && !b.dead && b !== this) {
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

      // 1. Repulsion Cabeza contra Cabeza
      const dHead = dist(this.x, this.y, other.x, other.y);
      if (dHead < separationDist && dHead > 0.1) {
        const force = (1 - dHead / separationDist) * 4.0;
        const nx = (this.x - other.x) / dHead;
        const ny = (this.y - other.y) / dHead;
        repelX += nx * force;
        repelY += ny * force;
      }

      // 2. Repulsion Cabeza contra Segmentos de la otra serpiente
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
    const activeSnakes = this.getNearbySnakes(otherSnakes);

    if (this.carlos && !this.carlos.dead) this.carlos.update(player, activeSnakes);
    if (this.sebastian && !this.sebastian.dead) this.sebastian.update(player, activeSnakes);

    if (this.dead) return;

    // Aplicar repulsion entre serpientes para evitar superposicion
    const { repelX, repelY } = this.applySnakeRepulsion(activeSnakes);

    const isOutside = (this.x < 0 || this.x > state.width || this.y < 0 || this.y > state.height);
    const curAngle = Math.atan2(this.vy, this.vx);
    let targetAngle = curAngle;
    let turnSpeed = this.minTurnRate;

    // 1. Control de Estado y Navegacion por Zonas
    if (isOutside) {
      if (this.speed < this.outsideSpeed - 0.3) {
        // Fuera del mapa acelerando: sigue hacia afuera hasta alcanzar velocidad maxima
        this.speed = Math.min(this.outsideSpeed, this.speed + this.outsideAccel);
        this.aiState = 'OUTSIDE_ACCEL';
        targetAngle = curAngle;
        turnSpeed = 0.01;
      } else {
        // Ya alcanzo su velocidad maxima: activa el reingreso hacia el jugador
        this.speed = this.outsideSpeed;
        this.aiState = 'OUTSIDE_REENTRY';
        targetAngle = Math.atan2(player.y - this.y, player.x - this.x);
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
        // Desaceleracion progresiva (friccion) hasta minSpeed
        if (this.speed > this.minSpeed) {
          this.speed = Math.max(this.minSpeed, this.speed - this.friction);
        }

        // Si ya perdio toda su inercia y llego a baja velocidad -> cambiar objetivo a buscar la salida del mapa
        if (this.speed <= this.minSpeed + 0.3 && !this.isDashing) {
          this.aiState = 'SEEK_EXIT';
        }

        targetAngle = Math.atan2(player.y - this.y, player.x - this.x);
        const rawTurnRate = this.turnRateFactor / Math.max(1.0, this.speed);
        turnSpeed = Math.min(this.maxTurnRate, Math.max(this.minTurnRate, rawTurnRate));

        if (this.isDashing) {
          turnSpeed = this.minTurnRate * 0.4;
        }

        // Temporizador de embestida periodica
        this.dashTimer++;
        if (this.dashTimer >= 360) {
          this.isDashing = true;
          this.dashDuration = 0;
          this.dashTimer = 0;
          this.speed = this.outsideSpeed;
          audioManager.playSound('enemy_dash', { volume: 0.8 });
        }
      } else if (this.aiState === 'SEEK_EXIT') {
        // Aceleracion ligera hacia la salida
        this.speed = Math.min(5.5, this.speed + 0.04);

        // Apuntar a la salida de perimetro mas cercana
        let exitX = this.x;
        let exitY = this.y;
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

    if (this.isDashing && !isOutside) {
      this.dashDuration++;
      if (Math.random() < 0.3 && state.particlePool) {
        state.particlePool.acquire(this.x, this.y, "#39ff14", 2, 0.05, 3);
      }
      if (this.dashDuration >= 80) {
        this.isDashing = false;
      }
    }

    // Desviar targetAngle suavemente por fuerza de repulsion
    if (Math.hypot(repelX, repelY) > 0.1) {
      const repelAngle = Math.atan2(repelY, repelX);
      let diffRepel = repelAngle - targetAngle;
      while (diffRepel < -Math.PI) diffRepel += Math.PI * 2;
      while (diffRepel > Math.PI) diffRepel -= Math.PI * 2;
      targetAngle += diffRepel * 0.4;
    }

    // 2. Navegacion limitada estrictamente por turnSpeed por frame
    let diff = targetAngle - curAngle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;

    const newAngle = curAngle + Math.sign(diff) * Math.min(turnSpeed, Math.abs(diff));
    this.vx = Math.cos(newAngle) * this.speed;
    this.vy = Math.sin(newAngle) * this.speed;

    this.x += this.vx;
    this.y += this.vy;

    // 4. Actualizacion cinematica de segmentos
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

    // 5. Ataques restringidos al interior del mapa
    this.acidTimer++;
    if (!isOutside && this.acidTimer >= 180) {
      this.acidTimer = 0;
      state.hazardAreas.push(new HazardArea(this.x, this.y, 65, 400, "rgb(57, 255, 20)", 0.2, true));
    }

    // 6. Balance de colisiones y cooldown de dano corporal
    if (this.bodyHitCooldown > 0) this.bodyHitCooldown--;

    // Impacto directo de la cabeza
    const headDistance = dist(this.x, this.y, player.x, player.y);
    if (headDistance < this.radius + player.radius) {
      player.takeDamage(this.headDamage, "#39ff14");
    }

    // Colision de los segmentos del cuerpo con radio permisivo y cooldown
    if (this.bodyHitCooldown <= 0) {
      for (let i = 1; i < this.segmentCount; i++) {
        const seg = this.segments[i];
        if (dist(seg.x, seg.y, player.x, player.y) < this.bodyHitRadius + player.radius) {
          player.takeDamage(this.bodyDamage, "#39ff14");
          this.bodyHitCooldown = this.bodyHitCooldownMax;
          break;
        }
      }
    }

    const time = performance.now() * 0.15;
    if (this.segmentSprites && this.segments) {
      for (let i = 0; i < this.segments.length; i++) {
        if (this.segmentSprites[i]) {
          this.segmentSprites[i].x = this.segments[i].x;
          this.segmentSprites[i].y = this.segments[i].y;
          this.segmentSprites[i].rotation = this.segments[i].angle || 0;
          if (this.alpha !== undefined) this.segmentSprites[i].alpha = this.alpha;
          
          const hue = (time + i * 8) % 360;
          this.segmentSprites[i].tint = hslToHex(hue, 100, 50);
        }
      }
    }
    
    if (this.sprite) {
      this.sprite.tint = hslToHex(time % 360, 100, 50);
    }

  }

  die() {
    super.die();
    if (this.segmentSprites) {
      this.segmentSprites.forEach(spr => {
        if (spr && spr.parent) spr.parent.removeChild(spr);
        if (spr && spr.destroy) spr.destroy();
      });
      this.segmentSprites = [];
    }
  }

  destroy() {
    this.die();
    if (this.carlos) {
      if (typeof this.carlos.die === 'function') this.carlos.die();
      if (typeof this.carlos.destroy === 'function') this.carlos.destroy();
    }
    if (this.sebastian) {
      if (typeof this.sebastian.die === 'function') this.sebastian.die();
      if (typeof this.sebastian.destroy === 'function') this.sebastian.destroy();
    }
    super.destroy();
  }
}

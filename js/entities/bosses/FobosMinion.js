import { state } from '../../engine/gameState.js';
import { dist } from '../../engine/Utils.js';
import { spawnExplosion } from '../effects/spawnExplosion.js';
import { HazardArea } from '../effects/HazardArea.js';
import { audioManager } from '../../engine/AudioManager.js';
import { Boss } from './Boss.js';

import { getOrCachePolygon, textures } from '../../engine/TextureCache.js';
import { worldLayer } from '../../main.js';


export class FobosMinion extends Boss {
  constructor(x, y, hp, initialAngle = Math.random() * Math.PI * 2, initialSpeed = 7.5, maxHp = hp) {
    super(x, y, "Fobos", maxHp, 45, "#ff5500", hp);
    if (this.sprite) {
      if (this.sprite.parent) this.sprite.parent.removeChild(this.sprite);
      this.sprite.destroy();
      this.sprite = null;
    }
    this.segmentCount = 15;
    this.segmentLength = 45;
    this.radius = 45;
    this.dead = false;
    this.smokeTimer = 0;
    this.dashTimer = 0;
    this.isDashing = false;
    this.dashDuration = 0;
    this.rgb = { r: 255, g: 85, b: 0 };

    // Fisicas Estilo Eater of Worlds (Asemejadas al padre)
    this.outsideSpeed = 13.2;       // Velocidad maxima incrementada para persecucion y embestidas
    this.minSpeed = 2.8;            // Velocidad minima dentro del mapa
    this.friction = 0.045;          // Tasa de desaceleracion dentro del mapa
    this.outsideAccel = 0.22;       // Aceleracion rapida afuera
    this.speed = initialSpeed || this.outsideSpeed;
    this.aiState = 'ATTACK';        // Estados: 'ATTACK', 'SEEK_EXIT', 'OUTSIDE_ACCEL', 'OUTSIDE_REENTRY'

    this.outsideTurnRate = 0.075;   // Giro agil fuera del mapa
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

    this.texture = textures['boss_fobos_seg'];
    this.segmentSprites = [];
    for (let i = 0; i < this.segmentCount; i++) {
      let spr = new PIXI.Sprite();
      if (textures['boss_fobos_seg']) {
          spr.texture = textures['boss_fobos_seg'];
      }
      spr.anchor.set(0.5);
      worldLayer.addChild(spr);
      this.segmentSprites.push(spr);
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
      if (!this.dead) {
        this.dead = true;
        this.die();
        audioManager.playSound('enemy_death_boss', { volume: 0.8, throttleMs: 200 });
        spawnExplosion(this.x, this.y, "#a855f7", 20, 4);
      }
    }
  }

  getNearbySnakes(passedSnakes) {
    if (passedSnakes && passedSnakes.length > 0) return passedSnakes;
    const list = [];
    if (!this.dead) list.push(this);
    for (let b of state.bosses) {
      if (b && !b.dead) {
        if (!list.includes(b)) list.push(b);
        if (b.deimos && !b.deimos.dead && !list.includes(b.deimos)) list.push(b.deimos);
        if (b.fobos && !b.fobos.dead && !list.includes(b.fobos)) list.push(b.fobos);
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
    if (this.dead) return;

    // Aplicar repulsion fisica y de trayectoria entre serpientes
    const activeSnakes = this.getNearbySnakes(otherSnakes);
    const { repelX, repelY } = this.applySnakeRepulsion(activeSnakes);

    const isOutside = (this.x < 0 || this.x > state.width || this.y < 0 || this.y > state.height);
    const curAngle = Math.atan2(this.vy, this.vx);
    let targetAngle = Math.atan2(player.y - this.y, player.x - this.x);
    let turnSpeed = 0.045; // Giro base

    // Calcular diferencia de angulo actual respecto al jugador
    let diffToPlayer = targetAngle - curAngle;
    while (diffToPlayer < -Math.PI) diffToPlayer += Math.PI * 2;
    while (diffToPlayer > Math.PI) diffToPlayer -= Math.PI * 2;

    // Logica de Embestida (Dash Real) de Fobos
    if (this.isDashing) {
      this.dashDuration = (this.dashDuration || 0) + 1;
      turnSpeed = 0.0; // Completamente recto durante el dash
      this.speed = 24.0; // Velocidad explosiva del dash

      // El dash dura exactamente 40 frames (un estallido rápido como el del jugador)
      if (this.dashDuration >= 40) {
        this.isDashing = false;
        this.dashTimer = 0; // Comienza el cooldown
      }
    } else {
      turnSpeed = 0.055; // Vuelve a intentar apuntar al jugador
      this.dashTimer = (this.dashTimer || 0) + 1;
      
      // Inercia/Desaceleración pobre después del dash
      if (this.speed > 2.6) {
        this.speed = Math.max(2.6, this.speed - 0.25); // Frena lentamente (derrape lejano)
      } else {
        this.speed = 2.6; // Velocidad base
      }
      
      // Inicia un nuevo dash solo si pasaron 5s, va a velocidad normal, y mira al jugador
      if (this.dashTimer >= 300 && this.speed === 2.6 && Math.abs(diffToPlayer) < 0.15) {
        this.isDashing = true;
        this.dashDuration = 0;
        if (typeof audioManager !== 'undefined') {
          audioManager.playSound('enemy_dash', { volume: 0.8 });
        }
      }
    }

    // Failsafe por si derrapa excesivamente fuera del mapa
    const centerDist = dist(this.x, this.y, state.width / 2, state.height / 2);
    if (centerDist > 2200) {
      targetAngle = Math.atan2(state.height / 2 - this.y, state.width / 2 - this.x);
      turnSpeed = 0.1;
      if (this.isDashing) {
        this.isDashing = false; // Corta el dash bruscamente
        this.dashTimer = 0; 
      }
    }

    // Desviar targetAngle suavemente por fuerza de repulsion entre serpientes
    if (Math.hypot(repelX, repelY) > 0.1 && !this.isDashing) {
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

    // 4. Cinematica de segmentos
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

    // 5. Ataques: Solo deja charcos (HazardArea) mientras está embistiendo (dashing)
    if (this.isDashing && !isOutside) {
      this.smokeTimer = (this.smokeTimer || 0) + 1;
      if (this.smokeTimer >= 6) {
        this.smokeTimer = 0;
        const tail = this.segments[this.segmentCount - 1];
        if (tail.x >= 0 && tail.x <= state.width && tail.y >= 0 && tail.y <= state.height) {
          state.hazardAreas.push(new HazardArea(tail.x, tail.y, 45, 300, "#ff0000", 0.2, false));
        }
      }
    } else {
      this.smokeTimer = 0;
    }

    // 6. Colisiones y balance de dano
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

    if (this.segmentSprites && this.segments) {
      for (let i = 0; i < this.segments.length; i++) {
        if (this.segmentSprites[i]) {
          this.segmentSprites[i].x = this.segments[i].x;
          this.segmentSprites[i].y = this.segments[i].y;
          this.segmentSprites[i].rotation = this.segments[i].angle || 0;

          // Ocultar si está fuera del mapa para generar incertidumbre
          const segRadius = this.radius || 36;
          const isInside = this.segments[i].x >= -segRadius && this.segments[i].x <= state.width + segRadius &&
                           this.segments[i].y >= -segRadius && this.segments[i].y <= state.height + segRadius;
          this.segmentSprites[i].visible = isInside;

          if (this.alpha !== undefined) this.segmentSprites[i].alpha = this.alpha;
        }
      }
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
  }
}

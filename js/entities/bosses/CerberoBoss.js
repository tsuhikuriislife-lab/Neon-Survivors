import { state } from '../../engine/gameState.js';
import { dist } from '../../engine/Utils.js';
import { audioManager } from '../../engine/AudioManager.js';
import { Boss } from './Boss.js';
import { Projectile } from '../projectiles/Projectile.js';
import { CerberoFlameProjectile } from '../projectiles/CerberoFlameProjectile.js';
import { CerberoSpiralProjectile } from '../projectiles/CerberoSpiralProjectile.js';
import { CerberoVortexProjectile } from '../projectiles/CerberoVortexProjectile.js';
import { spawnExplosion } from '../effects/spawnExplosion.js';
import { worldLayer } from '../../main.js';
import { getOrCachePolygon } from '../../engine/TextureCache.js';

// ============================================================================
// CerberoFuturoMinion (Retinazer - Francotirador)
// ============================================================================
export class CerberoFuturoMinion extends Boss {
  constructor(x, y, hp, angleOffset) {
    super(x, y, "Future", hp, 40, "#ff0000", hp); // Retinazer is Red
    this.type = "futuro";
    
    const poly = getOrCachePolygon(this.radius, 8, this.color);
    if (this.sprite) {
      if (this.sprite.parent) this.sprite.parent.removeChild(this.sprite);
      this.sprite.destroy();
    }
    this.sprite = new PIXI.Sprite(poly);
    this.sprite.anchor.set(0.5);
    this.sprite.x = this.x;
    this.sprite.y = this.y;
    
    this.pupil = new PIXI.Graphics();
    this.pupil.beginFill(0xffffff);
    this.pupil.drawCircle(0, 0, 8);
    this.pupil.endFill();
    this.sprite.addChild(this.pupil);
    
    this.rayGraphics = new PIXI.Graphics();
    worldLayer.addChild(this.rayGraphics);

    worldLayer.addChild(this.sprite);

    this.aiState = 'PHASE1_HOVER';
    this.timer = 0;
    this.angleOffset = angleOffset;
    this.burstCount = 0;
    this.burstTimer = 0;
    this.lastPlayerX = x;
    this.lastPlayerY = y;
    this.phase2 = false;
    this.rayAngle = 0;
    this.aimAngle = 0;
    this.vx = 0;
    this.vy = 0;
  }

  update(player) {
    if (this.dead) return;
    if (this.hp <= 0) {
      this.dead = true;
      this.die();
      return;
    }

    if (this.rayGraphics) this.rayGraphics.clear();
    
    const pVx = player.x - this.lastPlayerX;
    const pVy = player.y - this.lastPlayerY;
    this.lastPlayerX = player.x;
    this.lastPlayerY = player.y;

    if (!this.phase2 && this.hp < this.maxHp * 0.4) {
      this.phase2 = true;
      this.aiState = 'TRANSITION';
      this.timer = 0;
      audioManager.playSound('enemy_death_boss', { volume: 0.5 });
      spawnExplosion(this.x, this.y, "#ff0000", 50, 5);
      this.pupil.tint = 0xff0000;
    }

    const angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);
    let currentDist = dist(this.x, this.y, player.x, player.y);

    if (this.aiState === 'PHASE1_HOVER') {
      const targetDist = 450;
      let moveAngle = angleToPlayer + Math.PI / 2 + Math.sin(Date.now() * 0.001) * 0.5;
      if (currentDist < targetDist - 30) moveAngle = angleToPlayer + Math.PI;
      else if (currentDist > targetDist + 30) moveAngle = angleToPlayer;

      const targetVx = Math.cos(moveAngle) * 2.5;
      const targetVy = Math.sin(moveAngle) * 2.5;
      this.vx += (targetVx - this.vx) * 0.05; // Interpolación para inercia de flotación suave
      this.vy += (targetVy - this.vy) * 0.05;
      
      this.aimAngle = this.getPredictiveAim(player, pVx, pVy, 12.0);
      
      this.timer++;
      if (this.burstCount > 0) {
        this.burstTimer++;
        if (this.burstTimer >= 10) { // Mayor espacio entre balas de la misma ráfaga
          this.burstTimer = 0;
          this.burstCount--;
          this.firePredictive(this.aimAngle, true); // Mantiene la pequeña desviación (spread)
        }
      } else {
        if (this.burstsFired >= 3) {
          if (this.timer >= 60) { // Pequeña pausa antes de embestir
            this.timer = 0;
            this.aiState = 'PHASE1_DASH_AIM';
            this.dashCount = 0;
            this.burstsFired = 0;
          }
        } else if (this.timer >= 120) { // Recarga entre ráfagas
          this.timer = 0;
          this.burstCount = 3;
          this.burstsFired = (this.burstsFired || 0) + 1;
        }
      }
    } 
    else if (this.aiState === 'PHASE1_DASH_AIM') {
      this.vx *= 0.85; 
      this.vy *= 0.85;
      this.timer++;
      
      if (this.timer < 15) { 
        const d = dist(this.x, this.y, player.x, player.y);
        const dashSpeed = 12.0; 
        const ticks = d / dashSpeed;
        const predictedX = player.x + pVx * ticks;
        const predictedY = player.y + pVy * ticks;
        this.aimAngle = Math.atan2(predictedY - this.y, predictedX - this.x);
      } else if (this.timer >= 25) { 
        this.aiState = 'PHASE1_DASHING';
        this.timer = 0;
        
        const dashSpeed = 12.0;
        this.vx = Math.cos(this.aimAngle) * dashSpeed;
        this.vy = Math.sin(this.aimAngle) * dashSpeed;
        audioManager.playSound('enemy_dash', { volume: 0.4, throttleMs: 50 }); 
      }
    }
    else if (this.aiState === 'PHASE1_DASHING') {
      this.vx *= 0.96; 
      this.vy *= 0.96;
      this.timer++;
      
      if (this.timer >= 30) {
        this.dashCount++;
        if (this.dashCount >= 8) { 
          this.aiState = 'PHASE1_HOVER';
          this.timer = 0;
          // Dejar burstCount en 0 para que espere y recargue incrementando burstsFired
        } else {
          this.aiState = 'PHASE1_DASH_AIM';
          this.timer = 0;
        }
      }
    }
    else if (this.aiState === 'TRANSITION') {
      this.vx *= 0.9;
      this.vy *= 0.9;
      this.timer++;
      if (this.timer > 60) {
        this.aiState = 'PHASE2_BURST';
        this.timer = 0;
      }
    }
    else if (this.aiState === 'PHASE2_BURST') {
      const targetDist = 400;
      let moveAngle = angleToPlayer + Math.PI / 2;
      if (currentDist < targetDist - 20) moveAngle = angleToPlayer + Math.PI;
      else if (currentDist > targetDist + 20) moveAngle = angleToPlayer;

      const targetVx = Math.cos(moveAngle) * 3.0;
      const targetVy = Math.sin(moveAngle) * 3.0;
      this.vx += (targetVx - this.vx) * 0.08;
      this.vy += (targetVy - this.vy) * 0.08;
      this.aimAngle = angleToPlayer;
      
      this.timer++;
      if (this.timer % 6 === 0) {
        const spread = this.aimAngle + (Math.random() - 0.5) * 0.2;
        this.firePredictive(spread, false);
      }
      
      if (this.timer >= 120) {
        this.timer = 0;
        this.aiState = 'PHASE2_DASH_AIM';
        this.dashCount = 0;
      }
    }
    else if (this.aiState === 'PHASE2_DASH_AIM') {
      this.vx *= 0.85;
      this.vy *= 0.85;
      this.timer++;
      
      if (this.timer < 20) {
        const d = dist(this.x, this.y, player.x, player.y);
        const dashSpeed = 18.0;
        const ticks = d / dashSpeed;
        const predictedX = player.x + pVx * ticks;
        const predictedY = player.y + pVy * ticks;
        this.aimAngle = Math.atan2(predictedY - this.y, predictedX - this.x);
      } else if (this.timer === 20) {
        if (this.sprite) this.sprite.tint = 0xffffff;
        if (this.pupil) this.pupil.tint = 0xffffff;
      } else if (this.timer >= 35) {
        this.aiState = 'PHASE2_DASHING';
        this.timer = 0;
        if (this.sprite) this.sprite.tint = 0xff0000; 
        if (this.pupil) this.pupil.tint = 0xff0000;
        
        const dashSpeed = 18.0;
        this.vx = Math.cos(this.aimAngle) * dashSpeed;
        this.vy = Math.sin(this.aimAngle) * dashSpeed;
        audioManager.playSound('enemy_dash', { volume: 0.7, throttleMs: 50 });
      }
    }
    else if (this.aiState === 'PHASE2_DASHING') {
      this.vx *= 0.98;
      this.vy *= 0.98;
      this.timer++;
      if (this.timer >= 35) {
        this.dashCount++;
        if (this.dashCount >= 4) {
          this.aiState = 'PHASE2_DEATHRAY';
          this.timer = 0;
          this.rayAngle = angleToPlayer;
        } else {
          this.aiState = 'PHASE2_DASH_AIM';
          this.timer = 0;
        }
      }
    }
    else if (this.aiState === 'PHASE2_DEATHRAY') {
      this.vx *= 0.85;
      this.vy *= 0.85;
      this.timer++;
      
      if (this.timer < 60) {
        const targetAng = angleToPlayer;
        let diff = targetAng - this.rayAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.rayAngle += diff * 0.1;
        if (this.timer < 48) { // Sigue al jugador durante los primeros 48 frames, se congela los últimos 12 (0.2s)
          const targetAng = angleToPlayer;
          let diff = targetAng - this.rayAngle;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          this.rayAngle += diff * 0.1;
        }
        
        this.aimAngle = this.rayAngle;
        
        this.rayGraphics.lineStyle(2, 0xff0000, 0.5);
        this.rayGraphics.moveTo(this.x, this.y);
        this.rayGraphics.lineTo(this.x + Math.cos(this.rayAngle) * 2000, this.y + Math.sin(this.rayAngle) * 2000);
      } else {
        let diff = angleToPlayer - this.rayAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        let sweepDir = Math.sign(diff);
        if (sweepDir === 0) sweepDir = 1;
        
        // Velocidad angular basada en la distancia para mantener una velocidad tangencial constante.
        const linearSweepSpeed = 2.8; // px/frame (menor que la vel. base del jugador para permitir huida)
        let omega = linearSweepSpeed / Math.max(currentDist, 100); 
        omega = Math.min(omega, 0.015); // Tope de rotación en corto alcance
        
        if (Math.abs(diff) < omega) {
            this.rayAngle += diff;
        } else {
            this.rayAngle += sweepDir * omega;
        }
        
        this.aimAngle = this.rayAngle;

        const rayEndX = this.x + Math.cos(this.rayAngle) * 2000;
        const rayEndY = this.y + Math.sin(this.rayAngle) * 2000;
        
        this.rayGraphics.lineStyle(15 + Math.random()*5, 0xff0000, 0.9);
        this.rayGraphics.moveTo(this.x, this.y);
        this.rayGraphics.lineTo(rayEndX, rayEndY);
        
        this.rayGraphics.lineStyle(6, 0xffffff, 1.0);
        this.rayGraphics.moveTo(this.x, this.y);
        this.rayGraphics.lineTo(rayEndX, rayEndY);

        const d = this.distToSegment(player.x, player.y, this.x, this.y, rayEndX, rayEndY);
        if (d < 15 + player.radius) {
          player.takeDamage(15, "#ff0000", this);
        }
      }

      if (this.timer >= 200) {
        this.timer = 0;
        this.aiState = 'PHASE2_DASH_AIM';
        this.dashCount = 0;
      }
    }

    this.x += this.vx;
    this.y += this.vy;

    if (this.sprite) {
      this.sprite.x = this.x;
      this.sprite.y = this.y;
      this.sprite.rotation = this.aimAngle; 
    }
    if (this.pupil) {
      this.pupil.x = 15;
      this.pupil.y = 0;
    }
  }

  getPredictiveAim(player, pVx, pVy, bulletSpeed) {
    const d = dist(this.x, this.y, player.x, player.y);
    const ticks = d / bulletSpeed;
    const predictedX = player.x + pVx * ticks;
    const predictedY = player.y + pVy * ticks;
    return Math.atan2(predictedY - this.y, predictedX - this.x);
  }

  firePredictive(angle, addSpread) {
    const bulletSpeed = 12.0;
    let finalAngle = angle;
    if (addSpread) {
       finalAngle += (Math.random() - 0.5) * 0.2;
    }
    const vx = Math.cos(finalAngle) * bulletSpeed;
    const vy = Math.sin(finalAngle) * bulletSpeed;
    
    state.enemyProjectiles.push(new Projectile(this.x, this.y, vx, vy, 25, "#ff0000", 6, true));
    audioManager.playSound('fire_main_gun', { volume: 0.4, throttleMs: 50 });
  }

  distToSegment(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    if (len_sq !== 0) param = dot / len_sq;
    let xx, yy;
    if (param < 0) { xx = x1; yy = y1; }
    else if (param > 1) { xx = x2; yy = y2; }
    else { xx = x1 + param * C; yy = y1 + param * D; }
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  die() {
    super.die();
    if (this.rayGraphics) {
      this.rayGraphics.clear();
    }
    spawnExplosion(this.x, this.y, this.color, 40, 5);
  }

  destroy() {
    if (this.rayGraphics) {
      if (this.rayGraphics.parent) this.rayGraphics.parent.removeChild(this.rayGraphics);
      this.rayGraphics.destroy();
      this.rayGraphics = null;
    }
    super.destroy();
  }
}

// ============================================================================
// CerberoPasadoMinion (Spazmatism - Brawler)
// ============================================================================
export class CerberoPasadoMinion extends Boss {
  constructor(x, y, hp) {
    super(x, y, "Past", hp, 45, "#33ff33", hp); // Spazmatism is Green
    this.type = "pasado";
    
    const poly = getOrCachePolygon(this.radius, 3, this.color);
    if (this.sprite) {
      if (this.sprite.parent) this.sprite.parent.removeChild(this.sprite);
      this.sprite.destroy();
    }
    this.sprite = new PIXI.Sprite(poly);
    this.sprite.anchor.set(0.5);
    this.sprite.x = this.x;
    this.sprite.y = this.y;
    worldLayer.addChild(this.sprite);

    this.aiState = 'PHASE1_CHASE';
    this.timer = 0;
    this.dashCount = 0;
    this.targetAngle = 0;
    this.vx = 0;
    this.vy = 0;
    this.phase2 = false;
    this.lastPlayerX = x;
    this.lastPlayerY = y;
  }

  update(player) {
    if (this.dead) return;
    if (this.hp <= 0) {
      this.dead = true;
      this.die();
      return;
    }

    const pVx = player.x - this.lastPlayerX;
    const pVy = player.y - this.lastPlayerY;
    this.lastPlayerX = player.x;
    this.lastPlayerY = player.y;
    
    if (!this.phase2 && this.hp < this.maxHp * 0.4) {
      this.phase2 = true;
      this.aiState = 'TRANSITION';
      this.timer = 0;
      audioManager.playSound('enemy_death_boss', { volume: 0.5 });
      spawnExplosion(this.x, this.y, "#33ff33", 50, 5);
      if (this.sprite) this.sprite.tint = 0x33ff33;
    }
    
    const angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);
    const currentDist = dist(this.x, this.y, player.x, player.y);

    if (this.aiState === 'PHASE1_CHASE') {
      if (this.shotCount === undefined) this.shotCount = 0;

      const targetDist = 250;
      let moveAngle = angleToPlayer + Math.PI / 4; 
      if (currentDist < targetDist - 30) moveAngle = angleToPlayer + Math.PI;
      else if (currentDist > targetDist + 30) moveAngle = angleToPlayer;

      const targetVx = Math.cos(moveAngle) * 3.5;
      const targetVy = Math.sin(moveAngle) * 3.5;
      this.vx += (targetVx - this.vx) * 0.06; // Movimiento orgánico con inercia
      this.vy += (targetVy - this.vy) * 0.06;
      this.targetAngle = angleToPlayer;

      this.timer++;
      if (this.timer >= 40) {
        this.timer = 0;
        this.shotCount++;
        const flameSpeed = 7.0;
        const vx = Math.cos(this.targetAngle) * flameSpeed;
        const vy = Math.sin(this.targetAngle) * flameSpeed;
        const p = new CerberoSpiralProjectile(this.x, this.y, vx, vy, 15, "#33ff33", 10);
        state.enemyProjectiles.push(p);

        if (this.shotCount >= 5) {
          this.shotCount = 0;
          this.aiState = 'PHASE1_DASH_AIM';
          this.dashCount = 0;
          this.timer = 0;
        }
      }
    }
    else if (this.aiState === 'PHASE1_DASH_AIM') {
      this.vx *= 0.85; // Frena suavemente para apuntar
      this.vy *= 0.85;
      this.timer++;
      
      if (this.timer < 15) { // Apuntado predictivo veloz
        const d = dist(this.x, this.y, player.x, player.y);
        const dashSpeed = 12.0; // Intensidad reducida (Fase 2 es 18.0)
        const ticks = d / dashSpeed;
        const predictedX = player.x + pVx * ticks;
        const predictedY = player.y + pVy * ticks;
        this.targetAngle = Math.atan2(predictedY - this.y, predictedX - this.x);
      } else if (this.timer >= 25) { // Da una ventana de 10 frames al jugador
        this.aiState = 'PHASE1_DASHING';
        this.timer = 0;
        
        const dashSpeed = 12.0;
        this.vx = Math.cos(this.targetAngle) * dashSpeed;
        this.vy = Math.sin(this.targetAngle) * dashSpeed;
        audioManager.playSound('enemy_dash', { volume: 0.4, throttleMs: 50 }); // Sonido amortiguado
      }
    }
    else if (this.aiState === 'PHASE1_DASHING') {
      this.vx *= 0.96; // Frena un poco más rápido que en Fase 2
      this.vy *= 0.96;
      this.timer++;
      
      if (this.timer >= 30) {
        this.dashCount++;
        if (this.dashCount >= 8) { // 8 embestidas completadas
          this.aiState = 'PHASE1_CHASE';
          this.timer = 0;
          this.dashCount = 0;
        } else {
          this.aiState = 'PHASE1_DASH_AIM';
          this.timer = 0;
        }
      }
    }
    else if (this.aiState === 'TRANSITION') {
      this.vx *= 0.9;
      this.vy *= 0.9;
      this.timer++;
      if (this.timer > 60) {
        this.aiState = 'PHASE2_DASH_AIM';
        this.timer = 0;
        this.dashCount = 0;
      }
    }
    else if (this.aiState === 'PHASE2_DASH_AIM') {
      this.vx *= 0.85;
      this.vy *= 0.85;
      this.timer++;
      
      if (this.timer < 20) {
        // Seguimiento y cálculo de predicción continuo
        const d = dist(this.x, this.y, player.x, player.y);
        const dashSpeed = 18.0;
        const ticks = d / dashSpeed;
        const predictedX = player.x + pVx * ticks;
        const predictedY = player.y + pVy * ticks;
        this.targetAngle = Math.atan2(predictedY - this.y, predictedX - this.x);
      } else if (this.timer === 20) {
        // Fija el objetivo y da retroalimentación visual (telegraph)
        if (this.sprite) this.sprite.tint = 0xffffff;
      } else if (this.timer >= 35) {
        // Ejecuta el dash con el ángulo fijado anteriormente
        this.aiState = 'PHASE2_DASHING';
        this.timer = 0;
        if (this.sprite) this.sprite.tint = 0x33ff33; // Restaura su color
        
        const dashSpeed = 18.0;
        this.vx = Math.cos(this.targetAngle) * dashSpeed;
        this.vy = Math.sin(this.targetAngle) * dashSpeed;
        audioManager.playSound('enemy_dash', { volume: 0.7, throttleMs: 50 });
      }
    }
    else if (this.aiState === 'PHASE2_DASHING') {
      this.vx *= 0.98;
      this.vy *= 0.98;
      this.timer++;
      if (this.timer >= 35) {
        this.dashCount++;
        if (this.dashCount >= 4) {
          this.aiState = 'PHASE2_FLAMETHROWER';
          this.timer = 0;
        } else {
          this.aiState = 'PHASE2_DASH_AIM';
          this.timer = 0;
        }
      }
    }
    else if (this.aiState === 'PHASE2_FLAMETHROWER') {
      const targetDist = 220;
      let moveAngle = angleToPlayer + Math.PI / 2; 
      if (currentDist < targetDist - 20) moveAngle = angleToPlayer + Math.PI;
      else if (currentDist > targetDist + 20) moveAngle = angleToPlayer;

      const targetVx = Math.cos(moveAngle) * 5.0; 
      const targetVy = Math.sin(moveAngle) * 5.0;
      this.vx += (targetVx - this.vx) * 0.1; // Fricción ligeramente mayor para curvas cerradas
      this.vy += (targetVy - this.vy) * 0.1;

      let diff = angleToPlayer - this.targetAngle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.targetAngle += diff * 0.08;

      this.timer++;
      
      if (this.timer % 2 === 0) {
        const spread = this.targetAngle + (Math.random() - 0.5) * 0.1;
        const flameSpeed = 14.0 + Math.random() * 2.0;
        const vx = Math.cos(spread) * flameSpeed;
        const vy = Math.sin(spread) * flameSpeed;
        
        const flameProj = new CerberoFlameProjectile(this.x, this.y, vx, vy, 18, "#33ff33", 14);
        state.enemyProjectiles.push(flameProj);

        if (state.particlePool) {
          const p = state.particlePool.acquire(this.x, this.y, "#99ff33", 6, 0.05, 8);
          if (p) {
            p.vx = vx * 0.7;
            p.vy = vy * 0.7;
          }
        }
      }

      if (this.timer >= 240) {
        this.timer = 0;
        this.aiState = 'PHASE2_DASH_AIM';
        this.dashCount = 0;
      }
    }

    this.x += this.vx;
    this.y += this.vy;
    
    if (this.sprite) {
      this.sprite.x = this.x;
      this.sprite.y = this.y;
      this.sprite.rotation = this.targetAngle;
    }
  }

  die() {
    super.die();
    spawnExplosion(this.x, this.y, this.color, 45, 5);
  }
}

// ============================================================================
// CerberoBossRoot (Presente - Ancla y Vórtice)
// ============================================================================
export class CerberoBossRoot extends Boss {
  constructor(x, y, hp = 30000, maxHp = 30000) {
    const multiplier = state.bossScaling['CerberoBossRoot'] || 1.0;
    const finalMaxHp = maxHp * multiplier;
    super(960, 960, "Present", finalMaxHp, 90, "#ffffff", finalMaxHp);
    
    const poly = getOrCachePolygon(this.radius, 6, "#ffffff");
    if (this.sprite) {
      if (this.sprite.parent) this.sprite.parent.removeChild(this.sprite);
      this.sprite.destroy();
    }
    this.sprite = new PIXI.Sprite(poly);
    this.sprite.anchor.set(0.5);
    this.sprite.x = this.x;
    this.sprite.y = this.y;
    worldLayer.addChild(this.sprite);

    this.tetherGraphics = new PIXI.Graphics();
    worldLayer.addChild(this.tetherGraphics);

    this.tetherMaxDist = 800;
    this.tetherSnapCooldown = 0;

    const childHp = finalMaxHp * 0.4;
    this.pasado = new CerberoPasadoMinion(this.x - 300, this.y, childHp);
    this.futuro = new CerberoFuturoMinion(this.x + 300, this.y, childHp);
    
    this.phase2 = false;
    this.vortexTimer = 0;
    this.dead = false;
  }

  getTargetables() {
    const list = [];
    // Presente solo tiene hitbox (puede recibir daño) cuando entra en fase 2
    if (!this.dead && this.phase2) {
      list.push(this);
    }
    if (this.pasado && !this.pasado.dead) list.push(...this.pasado.getTargetables());
    if (this.futuro && !this.futuro.dead) list.push(...this.futuro.getTargetables());
    return list;
  }

  takeDamage(amt, damageColor = "#ffffff", hitX = this.x, hitY = this.y) {
    if (this.dead || this.hp <= 0) return false;
    
    let finalAmount = amt;
    if (state.player && state.player.bossDamageMult) finalAmount *= (1 + state.player.bossDamageMult);
    if (!this.phase2) {
      finalAmount *= 0.01; 
      damageColor = "#aaaaaa";
    }

    if (state.player && Math.random() < (state.player.critChance || 0)) {
      finalAmount *= (state.player.critDamage || 1.5);
    }

    this.hp -= finalAmount;
    
    if (state.floatingTextPool) {
      const offsetX = (Math.random() * 2 - 1) * 40;
      const offsetY = (Math.random() * 2 - 1) * 40;
      state.floatingTextPool.acquire(hitX + offsetX, hitY + offsetY, Math.round(finalAmount), damageColor, 16);
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
    }
  }

  die() {
    if (this.dead) return;
    super.die();
    this.dead = true;
    audioManager.playSound('enemy_death_boss', { volume: 1.0, throttleMs: 200 });
    spawnExplosion(this.x, this.y, "#cc00ff", 80, 8);
    
    if (this.tetherGraphics) {
      this.tetherGraphics.clear();
      this.tetherGraphics.destroy();
      this.tetherGraphics = null;
    }

    for (let i = 0; i < 25; i++) {
      if (state.gemPool) state.gemPool.acquire(this.x + (Math.random()*80-40), this.y + (Math.random()*80-40), 15);
    }
  }

  update(player) {
    if (this.dead) return;

    if (this.sprite) {
      this.sprite.rotation += 0.01;
      this.sprite.x = this.x;
      this.sprite.y = this.y;
    }

    if (this.pasado && !this.pasado.dead) this.pasado.update(player);
    if (this.futuro && !this.futuro.dead) this.futuro.update(player);

    const childrenDead = (!this.pasado || this.pasado.dead) && (!this.futuro || this.futuro.dead);
    
    if (!this.phase2 && childrenDead) {
      this.phase2 = true;
      spawnExplosion(this.x, this.y, "#cc00ff", 60, 5);
      if (this.sprite) this.sprite.tint = 0xcc00ff;
      if (state.camera && typeof state.camera.shake === 'function') {
        state.camera.shake({ strength: 20, duration: 1.0, rotation: 0.05 });
      }
    }

    if (!this.phase2) {
      const d = dist(this.x, this.y, player.x, player.y);
      const intensity = Math.min(1.0, d / this.tetherMaxDist);
      
      const r = Math.floor(255);
      const g = Math.floor(255 * (1 - intensity));
      const b = Math.floor(255 * (1 - intensity) + 85 * intensity);
      const tetherColor = (r << 16) + (g << 8) + b;
      
      if (this.sprite) this.sprite.tint = tetherColor;

      if (this.tetherGraphics) {
        this.tetherGraphics.clear();
        this.tetherGraphics.lineStyle(2 + intensity * 4, tetherColor, 0.4 + intensity * 0.6);
        this.tetherGraphics.moveTo(this.x, this.y);
        this.tetherGraphics.lineTo(player.x, player.y);
      }

      if (!this.isSnapping && d > this.tetherMaxDist) {
        this.isSnapping = true;
        player.takeDamage(25, "#ff0055", this);
        
        if (state.camera && typeof state.camera.shake === 'function') {
          state.camera.shake({ strength: 15, duration: 0.5 });
        }
        audioManager.playSound('hit_satellite', { volume: 0.9, pitch: 0.6 });
      }

      if (this.isSnapping) {
        const pullSpeed = 16.0; // Fuerte velocidad de arrastre
        const angToBoss = Math.atan2(this.y - player.y, this.x - player.x);
        player.x += Math.cos(angToBoss) * pullSpeed;
        player.y += Math.sin(angToBoss) * pullSpeed;

        if (this.tetherGraphics) {
          this.tetherGraphics.clear(); // Sobrescribe el lazo tenue por uno brillante
          this.tetherGraphics.lineStyle(8 + Math.random() * 4, 0xffffff, 1.0);
          this.tetherGraphics.moveTo(this.x, this.y);
          this.tetherGraphics.lineTo(player.x, player.y);
        }

        // Suelta al jugador cuando ya fue arrastrado al centro
        if (d < 250) {
          this.isSnapping = false;
        }
      }
    } else {
      if (this.tetherGraphics) {
        this.tetherGraphics.clear();
      }

      const hpRatio = this.hp / this.maxHp;
      const severity = 1.0 - hpRatio;

      const pullForce = 0.5 + severity * 2.5;
      const angToCenter = Math.atan2(this.y - player.y, this.x - player.x);
      player.x += Math.cos(angToCenter) * pullForce;
      player.y += Math.sin(angToCenter) * pullForce;

      this.vortexTimer++;
      const spawnInterval = Math.max(3, 15 - severity * 12); // De 15 a 3 frames (sin multiplicadores locos)
      
      if (this.vortexTimer >= spawnInterval) {
        this.vortexTimer = 0;
        
        // Lógica de spawn de perímetro (esquinas y bordes al azar)
        let startX, startY;
        const side = Math.floor(Math.random() * 4);
        if (side === 0) { startX = Math.random() * 1920; startY = -50; } // Arriba
        else if (side === 1) { startX = Math.random() * 1920; startY = 1970; } // Abajo
        else if (side === 2) { startX = -50; startY = Math.random() * 1920; } // Izquierda
        else { startX = 1970; startY = Math.random() * 1920; } // Derecha
        
        const aimAng = Math.atan2(this.y - startY, this.x - startX);
        const speed = 4 + severity * 4;
        const vx = Math.cos(aimAng) * speed;
        const vy = Math.sin(aimAng) * speed;

        const homingStr = 0.02 + severity * 0.04;
        const vortexProj = new CerberoVortexProjectile(startX, startY, vx, vy, 20, "#cc00ff", 6, homingStr, this);
        
        state.enemyProjectiles.push(vortexProj);
      }
    }
  }

  destroy() {
    this.die();
    if (this.pasado && typeof this.pasado.destroy === 'function') this.pasado.destroy();
    if (this.futuro && typeof this.futuro.destroy === 'function') this.futuro.destroy();
    if (this.tetherGraphics) {
      if (this.tetherGraphics.parent) this.tetherGraphics.parent.removeChild(this.tetherGraphics);
      this.tetherGraphics.destroy();
    }
    super.destroy();
  }
}

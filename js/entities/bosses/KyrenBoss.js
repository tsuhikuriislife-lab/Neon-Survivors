import { DenzelBoss } from './DenzelBoss.js';
import { state } from '../../engine/gameState.js';
import { dist } from '../../engine/Utils.js';
import { spawnExplosion } from '../effects/spawnExplosion.js';
import { Projectile } from '../projectiles/Projectile.js';
import { audioManager } from '../../engine/AudioManager.js';
import { Boss } from './Boss.js';
import { getOrCachePolygon, textures, drawCachedTexture } from '../../engine/TextureCache.js';
import { worldLayer } from '../../main.js';


export class KyrenBoss extends Boss {
  constructor(x, y, hp, maxHp) {
    const multiplier = state.bossScaling['KyrenBoss'] || 1.0;
    const defaultMaxHp = 12000 * multiplier;
    const finalMaxHp = maxHp !== undefined ? maxHp : defaultMaxHp;
    const finalHp = hp !== undefined ? hp : finalMaxHp;
    super(0, 0, "Kyren", finalMaxHp, 150, "#00ffcc", finalHp);
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

        this.textureOuter = textures['boss_kyren_outer'];
    this.textureInner = textures['boss_kyren_inner'];
    
    this.texture = this.textureOuter;
    this.innerSprite = new PIXI.Sprite(this.textureInner);
    this.innerSprite.anchor.set(0.5);
    worldLayer.addChild(this.innerSprite);
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
    const fontSize = isCrit ? 26 : 16;

    if (state.floatingTextPool) {
      state.floatingTextPool.acquire(this.x + offsetX, this.y + offsetY, Math.round(finalAmount), damageColor, fontSize, isCrit);
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
        spawnExplosion(this.x, this.y, this.color, 40, 6);
        for (let i = 0; i < 15; i++) {
          if (state.gemPool) {
            state.gemPool.acquire(this.x + (Math.random() * 40 - 20), this.y + (Math.random() * 40 - 20), 10);
          }
        }
      }
    }
  }

  split() {
    this.isSplit = true;
    const sharedHp = this.hp / 2;
    this.denzel = new DenzelBoss(this.x, this.y, sharedHp, sharedHp);
    
    // Eliminar el centro falso cuando Denzel spawnea
    if (this.innerSprite) {
      if (this.innerSprite.parent) this.innerSprite.parent.removeChild(this.innerSprite);
      this.innerSprite.destroy();
      this.innerSprite = null;
    }
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

      if (this.stateTimer % 100 === 0) {
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
        audioManager.playSound('enemy_dash', { volume: 0.8, throttleMs: 100 });
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
        if (this.innerSprite) {
      this.innerSprite.x = this.x;
      this.innerSprite.y = this.y;
      this.innerSprite.rotation = this.innerAngle;
      if (this.alpha !== undefined) this.innerSprite.alpha = this.alpha;
    }
    super.update(player);
  }

  fireWave() {
    const count = 15;
    for (let i = 0; i < count; i++) {
      const a = (i * 2 * Math.PI) / count;
      const vx = Math.cos(a) * 4;
      const vy = Math.sin(a) * 4;
      if (state.projectilePool) {
        state.projectilePool.acquire(this.x, this.y, vx, vy, 15, "#00ffcc", 5, true);
      } else {
        state.enemyProjectiles.push(new Projectile(this.x, this.y, vx, vy, 15, "#00ffcc", 5, true));
      }
    }
    audioManager.playSound('enemy_projectile', { volume: 0.6, throttleMs: 100 });
  }

  die() {
    if (this.innerSprite) {
      if (this.innerSprite.parent) this.innerSprite.parent.removeChild(this.innerSprite);
      this.innerSprite.destroy();
      this.innerSprite = null;
    }
    super.die();
  }

  destroy() {
    if (this.denzel) {
      if (typeof this.denzel.die === 'function') this.denzel.die();
      if (typeof this.denzel.destroy === 'function') this.denzel.destroy();
    }
  }
}


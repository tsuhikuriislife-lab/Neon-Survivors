import { state } from '../../engine/gameState.js';
import { ENEMY_BASE_BALANCE } from '../../data/enemyBalance.js';
import { dist } from '../../engine/Utils.js';
import { spawnExplosion } from '../effects/spawnExplosion.js';
import { audioManager } from '../../engine/AudioManager.js';

import { getOrCachePolygon, textures } from '../../engine/TextureCache.js';
import { worldLayer } from '../../main.js';


export class Enemy {
  constructor(x, y) {
    if (x === undefined || y === undefined) {
      const margin = 100;
      const edge = Math.floor(Math.random() * 4);
      if (edge === 0) { 
        this.x = Math.random() * state.width; 
        this.y = -margin; 
      } else if (edge === 1) { 
        this.x = state.width + margin; 
        this.y = Math.random() * state.height; 
      } else if (edge === 2) { 
        this.x = Math.random() * state.width; 
        this.y = state.height + margin; 
      } else { 
        this.x = -margin; 
        this.y = Math.random() * state.height; 
      }
    } else {
      this.x = x;
      this.y = y;
    }
    
    this.angle = 0;
    
    // Default stats to be overridden by subclasses
    this.radius = 15;
    this.sides = 3;
    this.speed = ENEMY_BASE_BALANCE.speedMultiplier;
    this.maxHp = 10 * ENEMY_BASE_BALANCE.healthMultiplier;
    this.hp = this.maxHp;
    this.color = "#ffffff";
    this.rgb = { r: 255, g: 255, b: 255 };
    this.xpValue = 1;
    this.damage = 10 * ENEMY_BASE_BALANCE.damageMultiplier;
    this.deathSoundKey = 'enemy_death_small';
    this.hitCooldowns = new Map();
    this.sprite = new PIXI.Sprite();
    this.sprite.anchor.set(0.5);
    worldLayer.addChild(this.sprite);
    this._texture = null;
    Object.defineProperty(this, "texture", {
      get() { return this._texture; },
      set(val) { this._texture = val; if(this.sprite) this.sprite.texture = val; }
    });
    this._spatialStamp = 0;
  }

  canBeHitBy(source, cooldownSeconds) {
    const lastHit = this.hitCooldowns.get(source) || -9999;
    if (state.gameTime - lastHit >= cooldownSeconds) {
      this.hitCooldowns.set(source, state.gameTime);
      return true;
    }
    return false;
  }


  update(player) {
    this.angle += 0.02;
    if (dist(this.x, this.y, player.x, player.y) < this.radius + player.radius) {
      player.takeDamage(this.damage, this.color);
      player.takeDamage(this.damage, this.color, this);
    }
    if (this.sprite) {
      this.sprite.x = this.x;
      this.sprite.y = this.y;
      this.sprite.rotation = this.angle;
      if (this.alpha !== undefined) this.sprite.alpha = this.alpha;
    }
  }

  takeDamage(amount, damageColor = "#fff") {
    if (this.hp <= 0) return false;
    let finalAmount = amount;
    let isCrit = false;

    if (state.player) {
      const critChance = state.player.critChance || 0;
      if (Math.random() < (critChance > 1.0 ? 1.0 : critChance)) {
        finalAmount *= (state.player.critDamage || 1.5);
        isCrit = true;
        
        if (critChance > 1.0) {
          const overCrit = critChance - 1.0;
          const extraRolls = Math.floor(overCrit) + (Math.random() < (overCrit % 1) ? 1 : 0);
          if (extraRolls > 0) {
            finalAmount *= Math.pow(3, extraRolls);
            isCrit = "super";
          }
        }
      }
    }

    this.hp -= finalAmount;
    const offsetX = (Math.random() * 2 - 1) * (this.radius * 0.8);
    const offsetY = (Math.random() * 2 - 1) * (this.radius * 0.8);
    const fontSize = isCrit ? 22 : 12;

    if (state.floatingTextPool) {
      state.floatingTextPool.acquire(this.x + offsetX, this.y + offsetY, Math.round(finalAmount), damageColor, fontSize, isCrit);
    }

    if (this.hp <= 0) {
      this.die();
      return false;
    }
    return true;
  }

  destroy() {
    if (this.sprite) {
      if (this.sprite.parent) {
        this.sprite.parent.removeChild(this.sprite);
      }
      this.sprite.destroy();
      this.sprite = null;
    }
  }

  die() {
    state.killCount++;
    spawnExplosion(this.x, this.y, this.color, 14, 3);
    
    // 5% Base + Upgrades
    const chipChance = 0.05 + (state.player && state.player.chipDropChance ? state.player.chipDropChance : 0);
    if (Math.random() < chipChance) {
      let chipsToGive = 1;
      if (state.player && state.player.doubleChipChance && Math.random() < state.player.doubleChipChance) {
        chipsToGive = 2;
      }
      
      const isOutsideMap = this.x < 0 || this.x > state.width || this.y < 0 || this.y > state.height;
      let gx, gy;
      if (isOutsideMap) {
        const margin = 80;
        gx = margin + Math.random() * (state.width - margin * 2);
        gy = margin + Math.random() * (state.height - margin * 2);
      } else {
        gx = this.x + (Math.random() * 2 - 1) * this.radius;
        gy = this.y + (Math.random() * 2 - 1) * this.radius;
      }
      
      if (state.gemPool) {
        const isMagnetized = Math.random() < (state.player?.autoMagnetChance || 0);
        state.gemPool.acquire(gx, gy, chipsToGive, isMagnetized, 'chip');
      }
    }

    this.dropLoot();
    this.playDeathSound();
    this.destroy();
  }

  dropLoot() {
    if (this.xpValue <= 0) return;
    const isOutsideMap = this.x < 0 || this.x > state.width || this.y < 0 || this.y > state.height;

    const dropGem = () => {
      let gx, gy;
      if (isOutsideMap) {
        const margin = 80;
        gx = margin + Math.random() * (state.width - margin * 2);
        gy = margin + Math.random() * (state.height - margin * 2);
      } else {
        const offsetX = (Math.random() * 2 - 1) * this.radius;
        const offsetY = (Math.random() * 2 - 1) * this.radius;
        gx = this.x + offsetX;
        gy = this.y + offsetY;
      }

      if (state.gemPool) {
        const isMagnetized = Math.random() < (state.player?.autoMagnetChance || 0);
        state.gemPool.acquire(gx, gy, this.xpValue, isMagnetized);
      }
    };
    
    dropGem();
    if (state.player && state.player.healDropChance > 0 && Math.random() < state.player.healDropChance) {
      if (state.gemPool) {
        let gx, gy;
        if (isOutsideMap) {
          const margin = 80;
          gx = margin + Math.random() * (state.width - margin * 2);
          gy = margin + Math.random() * (state.height - margin * 2);
        } else {
          gx = this.x;
          gy = this.y;
        }
        state.gemPool.acquire(gx, gy, 15, false, 'health'); // 15 is standard health amount
      }
    }

    if (state.player && state.player.doubleGemChance > 0) {
      const chance = state.player.doubleGemChance;
      const extraGems = Math.floor(chance) + (Math.random() < (chance % 1) ? 1 : 0);
      for (let i = 0; i < extraGems; i++) {
        dropGem();
      }
    }
  }

  playDeathSound() {
    audioManager.playSound(this.deathSoundKey, { volume: 0.5, throttleMs: 80 });
  }

}

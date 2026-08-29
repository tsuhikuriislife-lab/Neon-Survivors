import { state } from '../../engine/gameState.js';
import { dist } from '../../engine/Utils.js';
import { spawnExplosion } from '../effects/spawnExplosion.js';
import { audioManager } from '../../engine/AudioManager.js';
import { textures, drawCachedTexture, getOrCachePolygon } from '../../engine/TextureCache.js';

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
    this.speed = 1;
    this.maxHp = 10;
    this.hp = 10;
    this.color = "#ffffff";
    this.xpValue = 1;
    this.damage = 10;
    this.deathSoundKey = 'enemy_death_small';
    this.texture = null;
    this._spatialStamp = 0;
  }

  update(player) {
    this.angle += 0.02;
    if (dist(this.x, this.y, player.x, player.y) < this.radius + player.radius) {
      player.takeDamage(this.damage, this.color);
    }
  }

  takeDamage(amount, damageColor = "#fff") {
    if (this.hp <= 0) return false;
    let finalAmount = amount;
    let isCrit = false;

    if (state.player && Math.random() < (state.player.critChance || 0)) {
      finalAmount *= (state.player.critDamage || 1.5);
      isCrit = true;
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

  die() {
    state.killCount++;
    spawnExplosion(this.x, this.y, this.color, 14, 3);
    this.dropLoot();
    this.playDeathSound();
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
        state.gemPool.acquire(gx, gy, this.xpValue);
      }
    };
    
    dropGem();
    if (Math.random() < (state.player?.doubleGemChance || 0)) {
      dropGem();
    }
  }

  playDeathSound() {
    audioManager.playSound(this.deathSoundKey, { volume: 0.5, throttleMs: 80 });
  }

  draw(ctx) {
    if (this.x + this.radius < 0 || this.x - this.radius > state.width ||
        this.y + this.radius < 0 || this.y - this.radius > state.height) {
      return;
    }
    if (!this.texture) {
      this.texture = getOrCachePolygon(this.radius, this.sides, this.color, 8, "rgba(20,0,30,0.3)");
    }
    drawCachedTexture(ctx, this.texture, this.x, this.y, this.angle);
  }
}

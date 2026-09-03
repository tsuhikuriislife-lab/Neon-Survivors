import { state } from '../../engine/gameState.js';
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
    this.speed = 1;
    this.maxHp = 10;
    this.hp = 10;
    this.color = "#ffffff";
    this.rgb = { r: 255, g: 255, b: 255 };
    this.xpValue = 1;
    this.damage = 10;
    this.deathSoundKey = 'enemy_death_small';
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

  update(player) {
    this.angle += 0.02;
    if (dist(this.x, this.y, player.x, player.y) < this.radius + player.radius) {
      player.takeDamage(this.damage, this.color);
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
    if (this.sprite) {
      worldLayer.removeChild(this.sprite);
      this.sprite.destroy();
      this.sprite = null;
    }
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
    if (Math.random() < (state.player?.doubleGemChance || 0)) {
      dropGem();
    }
  }

  playDeathSound() {
    audioManager.playSound(this.deathSoundKey, { volume: 0.5, throttleMs: 80 });
  }

}

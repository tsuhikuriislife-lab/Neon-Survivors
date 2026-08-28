import { state } from '../../engine/gameState.js';
import { dist, drawPolygon } from '../../engine/Utils.js';
import { spawnExplosion } from '../effects/spawnExplosion.js';
import { FloatingText } from '../effects/FloatingText.js';
import { Gem } from '../collectibles/Gem.js';

export class Enemy {
  constructor(x, y) {
    if (x === undefined || y === undefined) {
      const edge = Math.floor(Math.random() * 4);
      if (edge === 0) { this.x = Math.random() * state.width; this.y = -30; }
      else if (edge === 1) { this.x = state.width + 30; this.y = Math.random() * state.height; }
      else if (edge === 2) { this.x = Math.random() * state.width; this.y = state.height + 30; }
      else { this.x = -30; this.y = Math.random() * state.height; }
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
    const dmgColor = isCrit ? "#ffff00" : damageColor;
    const fontSize = isCrit ? parseInt(12) + 6 : 12;

    state.floatingTexts.push(new FloatingText(this.x + offsetX, this.y + offsetY, Math.round(finalAmount), dmgColor, fontSize));
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
    const dropGem = () => {
      const offsetX = (Math.random() * 2 - 1) * this.radius;
      const offsetY = (Math.random() * 2 - 1) * this.radius;
      state.gems.push(new Gem(this.x + offsetX, this.y + offsetY, this.xpValue));
    };
    
    dropGem();
    if (Math.random() < (state.player.doubleGemChance || 0)) {
      dropGem();
    }
  }

  playDeathSound() {
    import('../../engine/AudioManager.js').then(({ audioManager }) => {
      audioManager.playSound(this.deathSoundKey, { volume: 0.5, throttleMs: 80 });
    });
  }

  draw(ctx) {
    drawPolygon(ctx, this.x, this.y, this.radius, this.sides, this.angle, this.color, 8, "rgba(20,0,30,0.3)");
  }
}

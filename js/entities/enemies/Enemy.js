import { state } from '../../engine/gameState.js';
import { dist, drawPolygon } from '../../engine/Utils.js';
import { spawnExplosion } from '../effects/spawnExplosion.js';
import { FloatingText } from '../effects/FloatingText.js';
import { Gem } from '../collectibles/Gem.js';

export class Enemy {
  constructor(type) {
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0) { this.x = Math.random() * state.width; this.y = -30; }
    else if (edge === 1) { this.x = state.width + 30; this.y = Math.random() * state.height; }
    else if (edge === 2) { this.x = Math.random() * state.width; this.y = state.height + 30; }
    else { this.x = -30; this.y = Math.random() * state.height; }

    this.type = type;
    this.angle = 0;

    if (type === 'small') {
      this.radius = 15;
      this.sides = 3;
      this.speed = 2.4 + Math.random() * 0.4;
      this.maxHp = 16 + state.gameTime * 0.05;
      this.color = "#ff3366";
      this.xpValue = 2;
      this.damage = 10;
    } else if (type === 'medium') {
      this.radius = 21;
      this.sides = 5;
      this.speed = 1.7 + Math.random() * 0.3;
      this.maxHp = 50 + (state.gameTime - 180) * 0.15;
      this.color = "#ffbb00";
      this.xpValue = 6;
      this.damage = 20;
    } else {
      this.radius = 45;
      this.sides = 6;
      this.speed = 1.1;
      this.maxHp = 180 + (state.gameTime - 480) * 0.3;
      this.color = "#a855f7";
      this.xpValue = 15;
      this.damage = 40;
    }
    this.hp = this.maxHp;
  }

  update(player) {
    this.angle += 0.02;
    const a = Math.atan2(player.y - this.y, player.x - this.x);
    this.x += Math.cos(a) * this.speed;
    this.y += Math.sin(a) * this.speed;

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
    
    const dropGem = () => {
      const offsetX = (Math.random() * 2 - 1) * this.radius;
      const offsetY = (Math.random() * 2 - 1) * this.radius;
      state.gems.push(new Gem(this.x + offsetX, this.y + offsetY, this.xpValue));
    };
    
    dropGem();
    if (Math.random() < (state.player.doubleGemChance || 0)) {
      dropGem();
    }
    import('../../engine/AudioManager.js').then(({ audioManager }) => {
      let soundKey = 'enemy_death_small';
      if (this.type === 'medium') soundKey = 'enemy_death_medium';
      if (this.type === 'large') soundKey = 'enemy_death_big';
      audioManager.playSound(soundKey, { volume: 0.5, throttleMs: 80 });
    });
  }

  draw(ctx) {
    drawPolygon(ctx, this.x, this.y, this.radius, this.sides, this.angle, this.color, 8, "rgba(20,0,30,0.3)");
  }
}

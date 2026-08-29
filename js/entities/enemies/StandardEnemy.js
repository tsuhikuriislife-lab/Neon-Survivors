import { state } from '../../engine/gameState.js';
import { Enemy } from './Enemy.js';
import { textures } from '../../engine/TextureCache.js';

export class StandardEnemy extends Enemy {
  constructor(type, x, y) {
    super(x, y);
    this.type = type;

    if (type === 'small') {
      this.radius = 15;
      this.sides = 3;
      this.speed = 2.4 + Math.random() * 0.4;
      this.maxHp = 16 + state.gameTime * 0.05;
      this.color = "#ff3366";
      this.rgb = { r: 255, g: 51, b: 102 };
      this.xpValue = 2;
      this.damage = 10;
      this.deathSoundKey = 'enemy_death_small';
      this.texture = textures['enemy_standard_small'];
    } else if (type === 'medium') {
      this.radius = 21;
      this.sides = 5;
      this.speed = 1.7 + Math.random() * 0.3;
      this.maxHp = 50 + (state.gameTime - 180) * 0.15;
      this.color = "#ffbb00";
      this.rgb = { r: 255, g: 187, b: 0 };
      this.xpValue = 6;
      this.damage = 20;
      this.deathSoundKey = 'enemy_death_medium';
      this.texture = textures['enemy_standard_medium'];
    } else { // large
      this.radius = 45;
      this.sides = 6;
      this.speed = 1.1;
      this.maxHp = 180 + (state.gameTime - 480) * 0.3;
      this.color = "#a855f7";
      this.rgb = { r: 168, g: 85, b: 247 };
      this.xpValue = 15;
      this.damage = 40;
      this.deathSoundKey = 'enemy_death_big';
      this.texture = textures['enemy_standard_large'];
    }
    this.hp = this.maxHp;
  }

  update(player) {
    const a = Math.atan2(player.y - this.y, player.x - this.x);
    this.x += Math.cos(a) * this.speed;
    this.y += Math.sin(a) * this.speed;
    super.update(player);
  }
}

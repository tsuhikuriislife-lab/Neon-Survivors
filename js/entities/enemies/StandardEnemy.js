import { state } from '../../engine/gameState.js';
import { ENEMY_BASE_BALANCE } from '../../data/enemyBalance.js';
import { Enemy } from './Enemy.js';
import { getOrCachePolygon, textures } from '../../engine/TextureCache.js';
import { worldLayer } from '../../main.js';


export class StandardEnemy extends Enemy {
  constructor(type, x, y) {
    super(x, y);
    this.type = type;

    if (type === 'small') {
      this.radius = 15;
      this.sides = 3;
      this.speed = (2.4 + Math.random() * 0.4) * ENEMY_BASE_BALANCE.speedMultiplier;
      this.maxHp = 16 * ENEMY_BASE_BALANCE.healthMultiplier;
      this.color = "#ff3366";
      this.rgb = { r: 255, g: 51, b: 102 };
      this.xpValue = 5;
      this.damage = 10 * ENEMY_BASE_BALANCE.damageMultiplier;
      this.deathSoundKey = 'enemy_death_small';
      this.texture = textures['enemy_standard_small'];
    } else if (type === 'medium') {
      this.radius = 21;
      this.sides = 5;
      this.speed = (1.7 + Math.random() * 0.3) * ENEMY_BASE_BALANCE.speedMultiplier;
      this.maxHp = 50 * ENEMY_BASE_BALANCE.healthMultiplier;
      this.color = "#ffbb00";
      this.rgb = { r: 255, g: 187, b: 0 };
      this.xpValue = 20;
      this.damage = 20 * ENEMY_BASE_BALANCE.damageMultiplier;
      this.deathSoundKey = 'enemy_death_medium';
      this.texture = textures['enemy_standard_medium'];
    } else { // large
      this.radius = 45;
      this.sides = 6;
      this.speed = 1.1 * ENEMY_BASE_BALANCE.speedMultiplier;
      this.maxHp = 180 * ENEMY_BASE_BALANCE.healthMultiplier;
      this.color = "#a855f7";
      this.rgb = { r: 168, g: 85, b: 247 };
      this.xpValue = 100;
      this.damage = 40 * ENEMY_BASE_BALANCE.damageMultiplier;
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

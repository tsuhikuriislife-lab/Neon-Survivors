import { state } from '../../engine/gameState.js';
import { Enemy } from './Enemy.js';

export class SwarmerEnemy extends Enemy {
  constructor(x, y) {
    super(x, y);
    this.type = 'swarmer';
    this.radius = 12;
    this.sides = 3;
    this.speed = 3.2 + Math.random() * 0.8;
    this.maxHp = 10 + state.gameTime * 0.04;
    this.hp = this.maxHp;
    this.color = "#ff9900"; // Orange
    this.xpValue = 2;
    this.damage = 12;
    this.deathSoundKey = 'enemy_death_small';
    
    // Direction initialized in constructor
    if (state.player) {
      const a = Math.atan2(state.player.y - this.y, state.player.x - this.x);
      this.vx = Math.cos(a) * this.speed;
      this.vy = Math.sin(a) * this.speed;
    } else {
      this.vx = this.speed; this.vy = 0;
    }
  }

  update(player) {
    this.x += this.vx;
    this.y += this.vy;
    
    // Check bounds before taking normal damage checks
    if (this.x < -200 || this.x > state.width + 200 || this.y < -200 || this.y > state.height + 200) {
      this.hp = 0; // silently die (handled in Game loop, without spawning effects since it just disappears)
      return;
    }
    
    super.update(player);
  }

  die() {
    if (this.x < -100 || this.x > state.width + 100 || this.y < -100 || this.y > state.height + 100) {
       // Died out of bounds, no drops or explosions or sound
       return;
    }
    super.die();
  }
}


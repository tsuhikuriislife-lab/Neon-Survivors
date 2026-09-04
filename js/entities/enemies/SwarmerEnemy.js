import { state } from '../../engine/gameState.js';
import { Enemy } from './Enemy.js';
import { getOrCachePolygon, textures } from '../../engine/TextureCache.js';
import { worldLayer } from '../../main.js';


export class SwarmerEnemy extends Enemy {
  constructor(x, y) {
    super(x, y);
    this.type = 'swarmer';
    this.radius = 12;
    this.sides = 3;
    this.speed = 3.2 + Math.random() * 0.8;
    this.maxHp = 10 + state.gameTime * 0.04;
    this.hp = this.maxHp;
    this.color = "#ff9900";
    this.rgb = { r: 255, g: 153, b: 0 };
    this.xpValue = 2;
    this.damage = 12;
    this.deathSoundKey = 'enemy_death_small';
    this.texture = textures['enemy_swarmer'];
    this.hasEnteredArena = (this.x >= 0 && this.x <= state.width && this.y >= 0 && this.y <= state.height);
    
    // Direction initialized in constructor
    if (state.player) {
      const a = Math.atan2(state.player.y - this.y, state.player.x - this.x);
      this.vx = Math.cos(a) * this.speed;
      this.vy = Math.sin(a) * this.speed;
      this.angle = a;
    } else {
      this.vx = this.speed; this.vy = 0;
    }
  }

  update(player) {
    this.x += this.vx;
    this.y += this.vy;
    
    // Check arena entry and exit
    if (!this.hasEnteredArena) {
      if (this.x >= 0 && this.x <= state.width && this.y >= 0 && this.y <= state.height) {
        this.hasEnteredArena = true;
      }
    } else {
      // Once it has crossed through the arena, despawn cleanly when exiting the borders
      if (this.x < -80 || this.x > state.width + 80 || this.y < -80 || this.y > state.height + 80) {
        this.hp = 0;
        this.destroy();
        return;
      }
    }

    // Safety fallback for swarmers that spawn far out-of-bounds or miss the arena
    if (this.x < -300 || this.x > state.width + 300 || this.y < -300 || this.y > state.height + 300) {
      this.hp = 0;
      this.destroy();
      return;
    }
    
    super.update(player);
  }

  die() {
    if (this.x < -80 || this.x > state.width + 80 || this.y < -80 || this.y > state.height + 80) {
      this.destroy();
      return;
    }
    super.die();
  }
}

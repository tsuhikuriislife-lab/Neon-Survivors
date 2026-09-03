import { state } from '../../engine/gameState.js';
import { Enemy } from './Enemy.js';
import { dist } from '../../engine/Utils.js';
import { Projectile } from '../projectiles/Projectile.js';
import { audioManager } from '../../engine/AudioManager.js';
import { getOrCachePolygon, textures } from '../../engine/TextureCache.js';
import { worldLayer } from '../../main.js';


export class RangerEnemy extends Enemy {
  constructor(x, y) {
    super(x, y);
    this.type = 'ranger';
    this.radius = 18;
    this.sides = 4;
    const scaleLevel = state.bossDefeatTimes.kyren ? Math.floor((state.gameTime - state.bossDefeatTimes.kyren) / 150) : 0;
    this.speed = 1.0 + (scaleLevel * 0.2);
    this.maxHp = 60 + state.gameTime * 0.1;
    this.hp = this.maxHp;
    this.color = "#00ccff";
    this.rgb = { r: 0, g: 204, b: 255 };
    this.xpValue = 6; 
    this.damage = 15;
    this.fireRate = Math.max(30, 90 - (scaleLevel * 10)); 
    this.fireTimer = this.fireRate;
    this.projectileSpeed = 4 + (scaleLevel * 0.5);
    this.projectileDamage = 20 + (scaleLevel * 5);
    this.deathSoundKey = 'enemy_death_medium';
    this.texture = textures['enemy_ranger'];
  }

  update(player) {
    const d = dist(this.x, this.y, player.x, player.y);
    const a = Math.atan2(player.y - this.y, player.x - this.x);
    
    if (d > 300) {
      this.x += Math.cos(a) * this.speed;
      this.y += Math.sin(a) * this.speed;
    } else if (d < 150) {
      this.x -= Math.cos(a) * this.speed;
      this.y -= Math.sin(a) * this.speed;
    }

    if (d < 400) {
      this.fireTimer--;
      if (this.fireTimer <= 0) {
        this.fireTimer = this.fireRate;
        const pa = Math.atan2(player.y - this.y, player.x - this.x);
        const vx = Math.cos(pa) * this.projectileSpeed;
        const vy = Math.sin(pa) * this.projectileSpeed;

        if (state.projectilePool) {
          state.projectilePool.acquire(this.x, this.y, vx, vy, this.projectileDamage, this.color, 5, true);
        } else {
          state.enemyProjectiles.push(new Projectile(this.x, this.y, vx, vy, this.projectileDamage, this.color, 5, true));
        }

        audioManager.playSound('enemy_projectile', { volume: 0.3, throttleMs: 50 });
      }
    }
    super.update(player);
  }
}

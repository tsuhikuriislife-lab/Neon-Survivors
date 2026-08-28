import { state } from '../../engine/gameState.js';
import { Enemy } from './Enemy.js';
import { dist } from '../../engine/Utils.js';

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
    this.color = "#00ccff"; // Light blue
    this.xpValue = 6; 
    this.damage = 15;
    this.fireRate = Math.max(30, 90 - (scaleLevel * 10)); 
    this.fireTimer = this.fireRate;
    this.projectileSpeed = 4 + (scaleLevel * 0.5);
    this.projectileDamage = 20 + (scaleLevel * 5);
    this.deathSoundKey = 'enemy_death_medium';
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
        import('../projectiles/Projectile.js').then(({ Projectile }) => {
           const pa = Math.atan2(player.y - this.y, player.x - this.x);
           state.enemyProjectiles.push(new Projectile(
             this.x, this.y,
             Math.cos(pa) * this.projectileSpeed,
             Math.sin(pa) * this.projectileSpeed,
             this.projectileDamage,
             this.color,
             5,
             true
           ));
        });
        import('../../engine/AudioManager.js').then(({ audioManager }) => {
          audioManager.playSound('enemy_projectile', { volume: 0.3, throttleMs: 50 });
        });
      }
    }
    super.update(player);
  }
}


import { state } from '../../engine/gameState.js';
import { Enemy } from './Enemy.js';

export class MotherChildEnemy extends Enemy {
  constructor(x, y) {
    super(x, y);
    this.type = 'mother_child';
    this.radius = 10;
    this.sides = 3;
    this.speed = 3.5;
    this.maxHp = 25 + state.gameTime * 0.05;
    this.hp = this.maxHp;
    this.color = "#00ff00"; // Bright green
    this.xpValue = 2; 
    this.damage = 15;
    this.directionChangeTimer = 0;
    this.targetAngle = 0;
    this.fireRate = 60 + Math.random() * 60;
    this.fireTimer = this.fireRate;
    this.deathSoundKey = 'enemy_death_small';
  }

  update(player) {
    this.directionChangeTimer--;
    if (this.directionChangeTimer <= 0) {
      this.directionChangeTimer = 30 + Math.random() * 60;
      this.targetAngle = Math.random() * Math.PI * 2;
    }
    this.x += Math.cos(this.targetAngle) * this.speed;
    this.y += Math.sin(this.targetAngle) * this.speed;

    if (this.x < 0) { this.x = 0; this.targetAngle = Math.PI - this.targetAngle; }
    if (this.x > state.width) { this.x = state.width; this.targetAngle = Math.PI - this.targetAngle; }
    if (this.y < 0) { this.y = 0; this.targetAngle = -this.targetAngle; }
    if (this.y > state.height) { this.y = state.height; this.targetAngle = -this.targetAngle; }

    this.fireTimer--;
    if (this.fireTimer <= 0) {
      this.fireTimer = this.fireRate;
      import('../projectiles/Projectile.js').then(({ Projectile }) => {
           const pa = Math.random() * Math.PI * 2;
           state.enemyProjectiles.push(new Projectile(
             this.x, this.y,
             Math.cos(pa) * 4,
             Math.sin(pa) * 4,
             15,
             this.color,
             4,
             true
           ));
      });
    }
    super.update(player);
  }
}


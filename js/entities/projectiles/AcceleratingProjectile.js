import { Projectile } from './Projectile.js';
import { state } from '../../engine/gameState.js';
import { dist, drawPolygon } from '../../engine/Utils.js';
import { Particle } from '../effects/Particle.js';


export class AcceleratingProjectile extends Projectile {
  constructor(x, y, targetX, targetY, damage, color = "#00ff66") {
    super();
    this.x = x;
    this.y = y;
    this.damage = damage;
    this.color = color;
    this.radius = 5;
    this.life = 200;
    const angle = Math.atan2(targetY - y, targetX - x);
    this.dirX = Math.cos(angle);
    this.dirY = Math.sin(angle);
    this.currentSpeed = 1.2;
    this.accel = 0.06;
  }
  update() {
    this.currentSpeed += this.accel;
    this.x += this.dirX * this.currentSpeed;
    this.y += this.dirY * this.currentSpeed;
    return this.x >= -50 && this.x <= state.width + 50 && this.y >= -50 && this.y <= state.height + 50;
  }
  draw(ctx) {
    ctx.save();
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}


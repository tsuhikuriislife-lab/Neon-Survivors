import { Projectile } from './Projectile.js';
import { state } from '../../engine/gameState.js';
import { dist, drawPolygon } from '../../engine/Utils.js';
import { Particle } from '../effects/Particle.js';


export class FallingProjectile extends Projectile {
  constructor(x, y, vx, vy, damage, color = "#00ffff") {
    super();
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.color = color;
    this.radius = 5;
    this.gravity = 0.12;
    this.history = [];
  }
  update() {
    this.history.push({ x: this.x, y: this.y });
    if (this.history.length > 8) this.history.shift();
    
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    return this.y <= state.height + 50;
  }
  draw(ctx) {
    ctx.save();
    
    if (this.history.length > 1) {
      ctx.beginPath();
      ctx.moveTo(this.history[0].x, this.history[0].y);
      for (let i = 1; i < this.history.length; i++) {
        ctx.lineTo(this.history[i].x, this.history[i].y);
      }
      ctx.lineTo(this.x, this.y);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.radius * 1.5;
      ctx.lineCap = "round";
      ctx.globalAlpha = 0.4;
      ctx.stroke();
    }
    
    ctx.globalAlpha = 1.0;
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


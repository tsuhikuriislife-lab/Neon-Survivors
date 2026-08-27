import { state } from '../../engine/gameState.js';
import { dist, drawPolygon } from '../../engine/Utils.js';
import { Particle } from '../effects/Particle.js';


export class Projectile {
  constructor(x, y, vx, vy, damage, color = "#00ffff", radius = 4, isEnemy = false, homingStrength = 0) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.color = color;
    this.radius = radius;
    this.isEnemy = isEnemy;
    this.homingStrength = homingStrength;
    this.life = 120;
  }
  update() {
    if (this.homingStrength > 0 && !this.isEnemy) {
      let closest = null;
      let minD = 800; // Tracking range
      const targets = [...state.enemies, ...state.bosses.flatMap(b => b.getTargetables())];
      for (let t of targets) {
        const d = dist(this.x, this.y, t.x, t.y);
        if (d < minD) {
          minD = d;
          closest = t;
        }
      }
      
      if (closest) {
        const speed = Math.hypot(this.vx, this.vy);
        const targetAngle = Math.atan2(closest.y - this.y, closest.x - this.x);
        const curAngle = Math.atan2(this.vy, this.vx);
        
        let diff = targetAngle - curAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        
        const newAngle = curAngle + Math.sign(diff) * Math.min(this.homingStrength, Math.abs(diff));
        this.vx = Math.cos(newAngle) * speed;
        this.vy = Math.sin(newAngle) * speed;
      }
    }

    this.x += this.vx;
    this.y += this.vy;
    this.life--;
    const inBounds = this.x >= -50 && this.x <= state.width + 50 && this.y >= -50 && this.y <= state.height + 50;
    return this.isEnemy ? inBounds : (this.life > 0 && inBounds);
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


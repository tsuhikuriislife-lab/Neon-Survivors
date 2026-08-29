import { Projectile } from './Projectile.js';
import { state } from '../../engine/gameState.js';
import { textures, drawCachedTexture } from '../../engine/TextureCache.js';

export class FallingProjectile extends Projectile {
  constructor(x, y, vx, vy, damage, color = "#00ffff") {
    super(x, y, vx, vy, damage, color, 5, true);
    this.radius = 5;
    this.gravity = 0.12;
    this.history = [];
    this.texture = textures['proj_enemy_falling'];
  }
  update() {
    this.history.push({ x: this.x, y: this.y });
    if (this.history.length > 8) this.history.shift();
    
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    return this.x >= 0 && this.x <= state.width && this.y >= 0 && this.y <= state.height;
  }
  draw(ctx) {
    if (this.x < 0 || this.x > state.width || this.y < 0 || this.y > state.height) return;
    if (this.history.length > 1) {
      ctx.save();
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
      ctx.shadowBlur = 0;
      ctx.stroke();
      ctx.restore();
    }
    
    if (this.texture) {
      drawCachedTexture(ctx, this.texture, this.x, this.y);
    } else {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

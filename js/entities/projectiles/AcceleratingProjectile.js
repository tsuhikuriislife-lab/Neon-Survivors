import { Projectile } from './Projectile.js';
import { state } from '../../engine/gameState.js';
import { textures, drawCachedTexture } from '../../engine/TextureCache.js';

export class AcceleratingProjectile extends Projectile {
  constructor(x, y, targetX, targetY, damage, color = "#00ff66", initialSpeed = 1.2, accel = 0.06) {
    super(x, y, 0, 0, damage, color, 5, true);
    this.radius = 5;
    this.life = 200;
    const angle = Math.atan2(targetY - y, targetX - x);
    this.dirX = Math.cos(angle);
    this.dirY = Math.sin(angle);
    this.currentSpeed = initialSpeed;
    this.accel = accel;
    this.texture = textures['proj_accelerating'];
  }
  update() {
    this.currentSpeed += this.accel;
    this.x += this.dirX * this.currentSpeed;
    this.y += this.dirY * this.currentSpeed;
    return this.x >= -50 && this.x <= state.width + 50 && this.y >= -50 && this.y <= state.height + 50;
  }
  draw(ctx) {
    const tex = this.texture || textures['proj_accelerating'];
    if (tex) {
      drawCachedTexture(ctx, tex, this.x, this.y);
    } else {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

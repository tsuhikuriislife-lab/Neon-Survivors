import { Projectile } from './Projectile.js';
import { state } from '../../engine/gameState.js';
import { textures, drawCachedTexture } from '../../engine/TextureCache.js';

export class NovaProjectile extends Projectile {
  constructor(x, y, vx, vy, damage, isSpiral = false) {
    super(x, y, vx, vy, damage, "#0088ff", 12, false, 0);
    this.isSpiral = isSpiral;
    this.radius = 12;
    this.life = 4000;
    this.color = "#0088ff";

    // For spiral motion
    this.startX = x;
    this.startY = y;
    this.baseX = x;
    this.baseY = y;
    this.time = 0;
    this.spiralRadius = 0;
    this.initialAngle = Math.atan2(vy, vx);
    this.speed = Math.hypot(vx, vy);
    this.pierce = true;
    this.hitCooldowns = new Map();
    this.texture = textures['proj_nova'];
  }

  canHit(target) {
    const actualTarget = target.parent || target;
    const lastHit = this.hitCooldowns.get(actualTarget) || 0;
    if (state.gameTime - lastHit >= 0.1) {
      this.hitCooldowns.set(actualTarget, state.gameTime);
      return true;
    }
    return false;
  }

  update() {
    this.life--;
    this.time++;

    if (this.isSpiral) {
      this.spiralRadius += this.speed; 
      const angularVelocity = 0.05;
      const angle = this.initialAngle + this.time * angularVelocity; 
      this.x = this.startX + Math.cos(angle) * this.spiralRadius;
      this.y = this.startY + Math.sin(angle) * this.spiralRadius;
    } else {
      this.baseX += this.vx;
      this.baseY += this.vy;
      this.x = this.baseX;
      this.y = this.baseY;
    }

    if (this.time % 2 === 0 && state.particlePool) {
      state.particlePool.acquire(this.x, this.y, this.color, 0.2, 0.08, 3);
    }

    return this.life > 0 && this.x >= -50 && this.x <= state.width + 50 && this.y >= -50 && this.y <= state.height + 50;
  }

  draw(ctx) {
    if (this.texture) {
      drawCachedTexture(ctx, this.texture, this.x, this.y, this.time * 0.2);
    }
  }
}

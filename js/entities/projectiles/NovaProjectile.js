import { Projectile } from './Projectile.js';
import { state } from '../../engine/gameState.js';
import { textures } from '../../engine/TextureCache.js';
import { worldLayer } from '../../main.js';

export class NovaProjectile extends Projectile {
  constructor(x, y, vx, vy, damage, isSpiral = false) {
    super(x, y, vx, vy, damage, "#0088ff", 12, false, 0);
    this.isSpiral = isSpiral;
    this.radius = 12;
    this.life = 4000;
    this.color = "#0088ff";

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
    
    if (this.sprite) {
      worldLayer.removeChild(this.sprite);
      this.sprite.destroy();
      this.sprite = null;
    }
    
    this.texture = textures['proj_nova'];
    if (this.texture) {
      this.sprite = new PIXI.Sprite(this.texture);
      this.sprite.anchor.set(0.5);
    } else {
      this.sprite = new PIXI.Graphics();
      let hexColor = 0x0088ff;
      this.sprite.beginFill(hexColor);
      this.sprite.drawCircle(0, 0, this.radius);
      this.sprite.endFill();
    }
    this.sprite.x = this.x;
    this.sprite.y = this.y;
    worldLayer.addChild(this.sprite);
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
    
    if (this.sprite) {
      this.sprite.x = this.x;
      this.sprite.y = this.y;
      this.sprite.rotation = this.time * 0.2;
    }

    if (this.time % 2 === 0 && state.particlePool) {
      state.particlePool.acquire(this.x, this.y, this.color, 0.2, 0.08, 3);
    }

    return this.life > 0 && this.x >= 0 && this.x <= state.width && this.y >= 0 && this.y <= state.height;
  }
}

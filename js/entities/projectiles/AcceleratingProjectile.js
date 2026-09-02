import { Projectile } from './Projectile.js';
import { state } from '../../engine/gameState.js';
import { textures } from '../../engine/TextureCache.js';
import { worldLayer } from '../../main.js';

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
    
    if (this.sprite) {
      worldLayer.removeChild(this.sprite);
      this.sprite.destroy();
      this.sprite = null;
    }
    
    if (color === '#ff0033' || color === '#ff0055') {
      this.texture = textures['proj_accelerating_amalgam'] || textures['proj_enemy_amalgam'];
    } else {
      this.texture = textures['proj_accelerating'];
    }
    
    if (this.texture) {
      this.sprite = new PIXI.Sprite(this.texture);
    } else {
      this.sprite = new PIXI.Graphics();
      let hexColor = 0xffffff;
      if (typeof this.color === 'string' && this.color.startsWith('#')) {
        hexColor = parseInt(this.color.replace('#', ''), 16);
      }
      this.sprite.beginFill(hexColor);
      this.sprite.drawCircle(0, 0, this.radius);
      this.sprite.endFill();
    }
    
    if (this.sprite instanceof PIXI.Sprite) {
      this.sprite.anchor.set(0.5);
    }
    this.sprite.x = this.x;
    this.sprite.y = this.y;
    worldLayer.addChild(this.sprite);
  }
  update() {
    this.currentSpeed += this.accel;
    this.x += this.dirX * this.currentSpeed;
    this.y += this.dirY * this.currentSpeed;
    
    if (this.sprite) {
      this.sprite.x = this.x;
      this.sprite.y = this.y;
      this.sprite.rotation = Math.atan2(this.dirY, this.dirX);
    }
    
    return this.x >= 0 && this.x <= state.width && this.y >= 0 && this.y <= state.height;
  }
}

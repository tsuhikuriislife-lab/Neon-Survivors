import { Projectile } from './Projectile.js';
import { state } from '../../engine/gameState.js';
import { textures } from '../../engine/TextureCache.js';
import { worldLayer } from '../../main.js';

export class FallingProjectile extends Projectile {
  constructor(x, y, vx, vy, damage, color = "#00ffff") {
    super(x, y, vx, vy, damage, color, 5, true);
    this.radius = 5;
    this.gravity = 0.12;
    this.history = [];
    
    if (this.sprite) {
      worldLayer.removeChild(this.sprite);
      this.sprite.destroy();
      this.sprite = null;
    }
    
    this.texture = textures['proj_enemy_falling'];
    
    // We will use a Container to hold both the tail trail (graphics) and the sprite
    this.container = new PIXI.Container();
    
    this.trailGraphics = new PIXI.Graphics();
    this.container.addChild(this.trailGraphics);
    
    if (this.texture) {
      this.sprite = new PIXI.Sprite(this.texture);
      this.sprite.anchor.set(0.5);
    } else {
      this.sprite = new PIXI.Graphics();
      let hexColor = 0x00ffff;
      if (typeof this.color === 'string' && this.color.startsWith('#')) {
        hexColor = parseInt(this.color.replace('#', ''), 16);
      }
      this.sprite.beginFill(hexColor);
      this.sprite.drawCircle(0, 0, this.radius);
      this.sprite.endFill();
    }
    
    this.container.addChild(this.sprite);
    this.container.x = 0;
    this.container.y = 0;
    worldLayer.addChild(this.container);
  }
  update() {
    this.history.push({ x: this.x, y: this.y });
    if (this.history.length > 8) this.history.shift();
    
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    
    if (this.sprite) {
      this.sprite.x = this.x;
      this.sprite.y = this.y;
      this.sprite.rotation = Math.atan2(this.vy, this.vx);
    }
    
    if (this.trailGraphics && this.history.length > 1) {
      this.trailGraphics.clear();
      let hexColor = 0x00ffff;
      if (typeof this.color === 'string' && this.color.startsWith('#')) {
        hexColor = parseInt(this.color.replace('#', ''), 16);
      }
      this.trailGraphics.lineStyle(this.radius * 1.5, hexColor, 0.4);
      this.trailGraphics.moveTo(this.history[0].x, this.history[0].y);
      for (let i = 1; i < this.history.length; i++) {
        this.trailGraphics.lineTo(this.history[i].x, this.history[i].y);
      }
      this.trailGraphics.lineTo(this.x, this.y);
    }
    
    return this.x >= 0 && this.x <= state.width && this.y >= 0 && this.y <= state.height;
  }
  
  destroy() {
    if (this.container) {
      worldLayer.removeChild(this.container);
      this.container.destroy({ children: true });
      this.container = null;
      this.sprite = null;
      this.trailGraphics = null;
    }
  }
}

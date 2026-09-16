import { Projectile } from './Projectile.js';
import { state } from '../../engine/gameState.js';
import { textures } from '../../engine/TextureCache.js';
import { worldLayer } from '../../main.js';
import { spawnExplosion } from '../effects/spawnExplosion.js';
import { audioManager } from '../../engine/AudioManager.js';

export class ClusterProjectile extends Projectile {
  constructor(x, y, vx, vy, damage, color, options = {}) {
    // Basic initialization as a projectile
    super(x, y, vx, vy, damage, color, options.radius || 15, true);
    
    // Customize logic based on options
    this.gravity = options.gravity || 0;
    this.accel = options.accel || 0;
    this.fuseTimer = options.fuseTimer || 120;
    this.clusterCount = options.clusterCount || 12;
    this.currentSpeed = Math.sqrt(vx * vx + vy * vy);
    
    if (this.currentSpeed > 0) {
      this.dirX = vx / this.currentSpeed;
      this.dirY = vy / this.currentSpeed;
    } else {
      this.dirX = 0;
      this.dirY = 1;
    }

    if (this.sprite) {
      worldLayer.removeChild(this.sprite);
      this.sprite.destroy();
      this.sprite = null;
    }
    
    this.texture = textures['proj_enemy_falling'] || textures['proj_enemy_ranger'];
    
    // We will use a Container to hold both the tail trail (graphics) and the sprite
    this.container = new PIXI.Container();
    this.trailGraphics = new PIXI.Graphics();
    this.container.addChild(this.trailGraphics);
    
    if (this.texture) {
      this.sprite = new PIXI.Sprite(this.texture);
      this.sprite.anchor.set(0.5);
      // Make cluster projectiles visibly larger
      this.sprite.scale.set(1.5);
    } else {
      this.sprite = new PIXI.Graphics();
      let hexColor = 0xff0000;
      if (typeof this.color === 'string' && this.color.startsWith('#')) {
        const parsed = parseInt(this.color.replace('#', ''), 16); if (!isNaN(parsed)) hexColor = parsed;
      }
      this.sprite.beginFill(hexColor);
      this.sprite.drawCircle(0, 0, this.radius);
      this.sprite.endFill();
    }
    
    this.container.addChild(this.sprite);
    this.container.x = 0;
    this.container.y = 0;
    worldLayer.addChild(this.container);
    
    this.history = [];
  }

  update() {
    this.fuseTimer--;

    // Move logic based on behaviors
    if (this.gravity > 0) {
      this.vy += this.gravity;
      this.x += this.vx;
      this.y += this.vy;
      this.history.push({ x: this.x, y: this.y });
    } else if (this.accel > 0) {
      this.currentSpeed += this.accel;
      this.x += this.dirX * this.currentSpeed;
      this.y += this.dirY * this.currentSpeed;
      this.history.push({ x: this.x, y: this.y });
    } else {
      this.x += this.vx;
      this.y += this.vy;
    }
    
    if (this.history.length > 8) this.history.shift();

    if (this.sprite) {
      this.sprite.x = this.x;
      this.sprite.y = this.y;
      
      if (this.gravity > 0) {
          this.sprite.rotation = Math.atan2(this.vy, this.vx);
      } else if (this.accel > 0) {
          this.sprite.rotation = Math.atan2(this.dirY, this.dirX);
      } else {
          this.sprite.rotation += 0.05; // Default spin
      }
    }
    
    // Draw trail
    if (this.trailGraphics && this.history.length > 1) {
      this.trailGraphics.clear();
      let hexColor = 0xff0000;
      if (typeof this.color === 'string' && this.color.startsWith('#')) {
        const parsed = parseInt(this.color.replace('#', ''), 16); if (!isNaN(parsed)) hexColor = parsed;
      }
      this.trailGraphics.lineStyle(this.radius * 1.5, hexColor, 0.4);
      this.trailGraphics.moveTo(this.history[0].x, this.history[0].y);
      for (let i = 1; i < this.history.length; i++) {
        this.trailGraphics.lineTo(this.history[i].x, this.history[i].y);
      }
      this.trailGraphics.lineTo(this.x, this.y);
    }
    
    if (this.fuseTimer <= 0) {
      this.explode();
      return false; // Tells the game loop to destroy this projectile
    }

    return this.x >= -100 && this.x <= state.width + 100 && this.y >= -100 && this.y <= state.height + 100;
  }
  
  explode() {
    spawnExplosion(this.x, this.y, this.color, 25, 4);
    audioManager.playSound('enemy_death', { volume: 0.6, throttleMs: 50 });
    
    // Spawn cluster fragments
    for (let i = 0; i < this.clusterCount; i++) {
        // Randomize directions for a chaotic shrapnel effect
        const angle = Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * 3;
        const pVx = Math.cos(angle) * speed;
        const pVy = Math.sin(angle) * speed;
        
        if (state.projectilePool) {
            state.projectilePool.acquire(this.x, this.y, pVx, pVy, this.damage * 0.7, this.color, 6, true);
        } else {
            state.enemyProjectiles.push(new Projectile(this.x, this.y, pVx, pVy, this.damage * 0.7, this.color, 6, true));
        }
    }
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

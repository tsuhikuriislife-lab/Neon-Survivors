import { dist } from '../../engine/Utils.js';
import { audioManager } from '../../engine/AudioManager.js';
import { worldLayer } from '../../main.js';

export class HazardArea {
  constructor(x, y, radius, duration, color, damage, isAcid = false) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.maxDuration = duration;
    this.duration = duration;
    this.color = color;
    this.damage = damage;
    this.isAcid = isAcid;
    this.pulse = 0;
    
    this.graphics = new PIXI.Graphics();
    this.graphics.x = this.x;
    this.graphics.y = this.y;
    worldLayer.addChild(this.graphics);
    
    audioManager.playSound('enemy_aoe', { volume: 0.6 });
  }
  
  update(player) {
    this.duration--;
    this.pulse += 0.05;
    if (dist(this.x, this.y, player.x, player.y) < this.radius + player.radius) {
      player.takeDamage(this.damage, this.color);
      if (this.isAcid) {
        player.slowTimer = Math.max(player.slowTimer, 10);
      }
    }
    
    if (this.graphics) {
      const alpha = Math.min(0.6, (this.duration / this.maxDuration) * 0.6);
      this.graphics.clear();
      this.graphics.alpha = alpha;
      
      let hexColor = 0xffffff;
      if (typeof this.color === 'string') {
        if (this.color.startsWith('#')) {
          const parsed = parseInt(this.color.replace('#', ''), 16);
          if (!isNaN(parsed)) hexColor = parsed;
        } else if (this.color.startsWith('rgb')) {
          const matches = this.color.match(/\d+/g);
          if (matches && matches.length >= 3) {
            hexColor = (parseInt(matches[0]) << 16) | (parseInt(matches[1]) << 8) | parseInt(matches[2]);
          }
        }
      }
      
      this.graphics.beginFill(hexColor, 1);
      this.graphics.lineStyle(1.5, hexColor, 1);
      this.graphics.drawCircle(0, 0, this.radius + Math.sin(this.pulse) * 3);
      this.graphics.endFill();
    }
    
    const isAlive = this.duration > 0;
    if (!isAlive) this.destroy();
    return isAlive;
  }
  
  destroy() {
    if (this.graphics) {
      worldLayer.removeChild(this.graphics);
      this.graphics.destroy();
      this.graphics = null;
    }
  }
}

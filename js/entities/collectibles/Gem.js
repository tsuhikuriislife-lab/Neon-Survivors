import { dist } from '../../engine/Utils.js';
import { textures } from '../../engine/TextureCache.js';
import { worldLayer } from '../../main.js';

export class Gem {
  constructor(x, y, value) {
    this.x = x;
    this.y = y;
    this.value = value;
    this.radius = 6;
    this.angle = 0;
    
    let tex;
    if (value > 15) {
      this.color = "#ff0055";
      tex = textures['gem_red'];
    } else if (value > 5) {
      this.color = "#ff00ff";
      tex = textures['gem_magenta'];
    } else if (value > 2) {
      this.color = "#00ffff";
      tex = textures['gem_cyan'];
    } else {
      this.color = "#39ff14";
      tex = textures['gem_green'];
    }

    this.sprite = new PIXI.Sprite(tex);
    this.sprite.anchor.set(0.5);
    this.sprite.x = this.x;
    this.sprite.y = this.y;
    worldLayer.addChild(this.sprite);
  }
  
  update(player) {
    this.angle += 0.05;
    const d = dist(this.x, this.y, player.x, player.y);
    if (d < player.pickupRadius) {
      const speed = 7.5;
      const a = Math.atan2(player.y - this.y, player.x - this.x);
      this.x += Math.cos(a) * speed;
      this.y += Math.sin(a) * speed;
      if (d < player.radius + 8) {
        player.gainXP(this.value);
        worldLayer.removeChild(this.sprite);
        this.sprite.destroy();
        return false;
      }
    }
    
    this.sprite.x = this.x;
    this.sprite.y = this.y;
    this.sprite.rotation = this.angle;
    return true;
  }
}

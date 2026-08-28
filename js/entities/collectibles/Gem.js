import { dist } from '../../engine/Utils.js';
import { textures, drawCachedTexture } from '../../engine/TextureCache.js';

export class Gem {
  constructor(x, y, value) {
    this.x = x;
    this.y = y;
    this.value = value;
    this.radius = 6;
    this.angle = 0;
    
    if (value > 15) {
      this.color = "#ff0055";
      this.texture = textures['gem_red'];
    } else if (value > 5) {
      this.color = "#ff00ff";
      this.texture = textures['gem_magenta'];
    } else if (value > 2) {
      this.color = "#00ffff";
      this.texture = textures['gem_cyan'];
    } else {
      this.color = "#39ff14";
      this.texture = textures['gem_green'];
    }
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
        return false;
      }
    }
    return true;
  }
  draw(ctx) {
    if (this.texture) {
      drawCachedTexture(ctx, this.texture, this.x, this.y, this.angle);
    }
  }
}

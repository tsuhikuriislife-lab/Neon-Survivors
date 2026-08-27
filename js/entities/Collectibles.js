import { dist, drawPolygon } from '../engine/Utils.js';

export class Gem {
  constructor(x, y, value) {
    this.x = x;
    this.y = y;
    this.value = value;
    this.radius = 6;
    this.angle = 0;
    this.color = value > 15 ? "#ff0055" : (value > 5 ? "#ff00ff" : (value > 2 ? "#00ffff" : "#39ff14"));
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
    drawPolygon(ctx, this.x, this.y, this.radius, 4, this.angle, this.color, 8, "rgba(255,255,255,0.2)");
  }
}


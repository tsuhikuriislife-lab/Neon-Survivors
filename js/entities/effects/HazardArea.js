import { dist } from '../../engine/Utils.js';
import { audioManager } from '../../engine/AudioManager.js';

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
    return this.duration > 0;
  }
  draw(ctx) {
    const alpha = Math.min(0.6, (this.duration / this.maxDuration) * 0.6);
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + Math.sin(this.pulse) * 3, 0, Math.PI * 2);
    ctx.fillStyle = this.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
    ctx.fill();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.restore();
  }
}
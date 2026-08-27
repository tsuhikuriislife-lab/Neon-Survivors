import { state } from '../engine/gameState.js';
import { dist } from '../engine/Utils.js';

export class Particle {
  constructor(x, y, color, speed = 2, decay = 0.02, size = 3) {
    this.x = x;
    this.y = y;
    this.color = color;
    const angle = Math.random() * Math.PI * 2;
    const s = (Math.random() * 0.7 + 0.3) * speed;
    this.vx = Math.cos(angle) * s;
    this.vy = Math.sin(angle) * s;
    this.alpha = 1;
    this.decay = decay * (Math.random() * 0.5 + 0.75);
    this.size = size;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.96;
    this.vy *= 0.96;
    this.alpha -= this.decay;
  }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    ctx.restore();
  }
}

export function spawnExplosion(x, y, color, count = 16, speed = 4) {
  for (let i = 0; i < count; i++) {
    state.particles.push(new Particle(x, y, color, speed, 0.025, Math.random() * 3 + 2));
  }
}

export class FloatingText {
  constructor(x, y, text, color = "#fff", size = 14) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.size = size;
    this.alpha = 1;
    this.vy = -1.2;
  }
  update() {
    this.y += this.vy;
    this.alpha -= 0.02;
  }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.fillStyle = this.color;
    ctx.font = `bold ${this.size}px 'Segoe UI', sans-serif`;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

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
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.restore();
  }
}


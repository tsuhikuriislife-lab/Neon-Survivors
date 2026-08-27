import { state } from '../../engine/gameState.js';
import { drawPolygon } from '../../engine/Utils.js';

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
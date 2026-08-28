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
    ctx.shadowBlur = 0;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    ctx.restore();
  }
}
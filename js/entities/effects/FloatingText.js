export class FloatingText {
  constructor(x, y, text, color = "#fff", size = 14, isCrit = false) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.size = size;
    this.isCrit = isCrit;
    this.rotation = isCrit ? (Math.random() - 0.5) * 0.35 : 0;
    this.alpha = 1;
    this.vy = isCrit ? -1.6 : -1.2;
  }
  update() {
    this.y += this.vy;
    this.alpha -= this.isCrit ? 0.015 : 0.02;
  }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (this.isCrit) {
      ctx.translate(this.x, this.y);
      if (this.rotation !== 0) ctx.rotate(this.rotation);
      ctx.font = `900 ${this.size}px 'Segoe UI', sans-serif`;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = this.color;
      ctx.fillText(this.text, 0, 0);

      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = Math.max(0, this.alpha * 0.7);
      ctx.font = `bold ${Math.max(10, this.size - 4)}px 'Segoe UI', sans-serif`;
      ctx.fillText(this.text, 0, 0);
    } else {
      ctx.shadowBlur = 0;
      ctx.fillStyle = this.color;
      ctx.font = `bold ${this.size}px 'Segoe UI', sans-serif`;
      ctx.fillText(this.text, this.x, this.y);
    }
    ctx.restore();
  }
}
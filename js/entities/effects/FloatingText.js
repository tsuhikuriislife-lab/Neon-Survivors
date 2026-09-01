import { bitmapFont } from "../../engine/BitmapFont.js";

export class FloatingText {
  constructor(text, x, y, size = 20, color = "#ff0000", isCrit = false) {
    this.text = text;
    this.x = x;
    this.y = y;
    this.size = size;
    this.color = color;
    this.alpha = 1.0;
    this.life = 60;
    this.maxLife = 60;
    this.vy = -1;
    this.isCrit = isCrit;
    if (this.isCrit) {
      this.vy = -2;
      this.maxLife = 80;
      this.life = 80;
    }
  }
  update() {
    this.y += this.vy;
    this.life--;
    if (this.life < 20) {
      this.alpha = this.life / 20;
    }
  }
  draw(ctx) {
    if (this.isCrit) {
      bitmapFont.drawCachedText(ctx, this.text, this.x, this.y, this.size, this.color, true, "center", "middle", this.alpha);
    } else {
      bitmapFont.drawCachedText(ctx, this.text, this.x, this.y, this.size, this.color, true, "center", "middle", this.alpha);
    }
  }
}

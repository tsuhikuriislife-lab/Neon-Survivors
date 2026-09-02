import { uiLayer } from "../../main.js";

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

    this.pixiText = new PIXI.Text(text, {
      fontFamily: 'monospace',
      fontSize: size,
      fill: color,
      align: 'center',
      fontWeight: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.pixiText.anchor.set(0.5);
    this.pixiText.x = this.x;
    this.pixiText.y = this.y;
    uiLayer.addChild(this.pixiText);
  }
  
  update() {
    this.y += this.vy;
    this.life--;
    if (this.life < 20) {
      this.alpha = this.life / 20;
    }
    this.pixiText.y = this.y;
    this.pixiText.alpha = this.alpha;
    
    if (this.life <= 0) {
        uiLayer.removeChild(this.pixiText);
        this.pixiText.destroy();
    }
  }
}

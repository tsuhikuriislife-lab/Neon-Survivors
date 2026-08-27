import { state } from '../../engine/gameState.js';
import { FloatingText } from '../effects/FloatingText.js'; // Will update to specific file later

export class Boss {
  constructor(x, y, name, maxHp, radius, color) {
    this.name = name;
    this.x = x;
    this.y = y;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.radius = radius;
    this.color = color;
    this.dead = false;
  }

  getTargetables() {
    return this.dead ? [] : [this];
  }

  takeDamage(amt, damageColor = this.color, hitX = this.x, hitY = this.y) {
    if (this.dead || this.hp <= 0) return false;
    let finalAmount = amt;

    let isCrit = false;

    if (state.player && Math.random() < (state.player.critChance || 0)) {

        finalAmount *= (state.player.critDamage || 1.5);

        isCrit = true;

    }

    this.hp -= finalAmount;
    const offsetX = (Math.random() * 2 - 1) * (this.radius * 0.8);
    const offsetY = (Math.random() * 2 - 1) * (this.radius * 0.8);
    const dmgColor = isCrit ? "#ffff00" : damageColor;

    const fontSize = isCrit ? parseInt(16) + 6 : 16;

    state.floatingTexts.push(new FloatingText(hitX + offsetX, hitY + offsetY, Math.round(finalAmount), dmgColor, fontSize));
  }

  update(player) {
    // To be implemented by subclasses
  }

  draw(ctx) {
    // To be implemented by subclasses
  }
}


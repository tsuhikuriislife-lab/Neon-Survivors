import { state } from '../../engine/gameState.js';

export class Boss {
  constructor(x, y, name, maxHp, radius, color, hp = maxHp) {
    this.name = name;
    this.x = x;
    this.y = y;
    this.maxHp = maxHp;
    this.hp = hp !== undefined ? hp : maxHp;
    this.radius = radius;
    this.color = color;
    this.dead = false;
    this.texture = null;
    this._spatialStamp = 0;
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
    const fontSize = isCrit ? 22 : 16;

    if (state.floatingTextPool) {
      state.floatingTextPool.acquire(hitX + offsetX, hitY + offsetY, Math.round(finalAmount), dmgColor, fontSize);
    }
  }

  update(player) {
    // Implemented by subclasses
  }

  draw(ctx) {
    // Implemented by subclasses
  }
}

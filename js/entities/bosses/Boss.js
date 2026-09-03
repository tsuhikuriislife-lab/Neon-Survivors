import { state } from '../../engine/gameState.js';
import { getOrCachePolygon, textures } from '../../engine/TextureCache.js';
import { worldLayer } from '../../main.js';


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
    this.sprite = new PIXI.Sprite();
    this.sprite.anchor.set(0.5);
    worldLayer.addChild(this.sprite);
    this._texture = null;
    Object.defineProperty(this, "texture", {
      get() { return this._texture; },
      set(val) { this._texture = val; if(this.sprite) this.sprite.texture = val; }
    });
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
    const fontSize = isCrit ? 26 : 16;

    if (state.floatingTextPool) {
      state.floatingTextPool.acquire(hitX + offsetX, hitY + offsetY, Math.round(finalAmount), damageColor, fontSize, isCrit);
    }
  }

  update(player) {
    if (this.sprite) {
      this.sprite.x = this.x;
      this.sprite.y = this.y;
      this.sprite.rotation = this.angle || 0;
      if (this.alpha !== undefined) this.sprite.alpha = this.alpha;
    }
  }

  die() {
    if (this.sprite) {
      worldLayer.removeChild(this.sprite);
      this.sprite.destroy();
      this.sprite = null;
    }
  }
}

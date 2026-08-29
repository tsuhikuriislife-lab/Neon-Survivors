import { state } from '../../engine/gameState.js';
import { dist } from '../../engine/Utils.js';
import { Projectile } from './Projectile.js';

export class Shockwave extends Projectile {
  constructor(x, y, maxRadius, damage, color = "#00ffb4", weaponType = 'shockwave') {
    super(x, y, 0, 0, damage, color, 10, false, 0);
    this.currentRadius = 10;
    this.maxRadius = maxRadius;
    this.damage = damage;
    this.color = color;
    this.weaponType = weaponType;
    this.alpha = 1;
    this.hitTargets = new Set();
  }
  update() {
    this.currentRadius += 7.5;
    this.alpha = Math.max(0, 1 - (this.currentRadius / this.maxRadius));

    // Query enemies via spatial grid
    state.spatialGrid.queryRadius(this.x, this.y, this.currentRadius, (e) => {
      if (e.hp <= 0) return;
      if (!this.hitTargets.has(e)) {
        e.takeDamage(this.damage, this.color);
        state.recordDamage(this.weaponType, this.damage);
        this.hitTargets.add(e);
        const ang = Math.atan2(e.y - this.y, e.x - this.x);
        e.x += Math.cos(ang) * 22;
        e.y += Math.sin(ang) * 22;
      }
    });

    // Check bosses
    for (let b of state.bosses) {
      for (let t of b.getTargetables()) {
        const actualTarget = t.parent || t;
        if (!this.hitTargets.has(actualTarget) && dist(this.x, this.y, t.x, t.y) <= this.currentRadius + t.radius) {
          t.takeDamage(this.damage, this.color);
          state.recordDamage(this.weaponType, this.damage);
          this.hitTargets.add(actualTarget);
        }
      }
    }

    return this.currentRadius < this.maxRadius;
  }
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, this.alpha));
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 4;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.restore();
  }
}

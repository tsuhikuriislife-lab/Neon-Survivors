import { state } from '../../engine/gameState.js';
import { dist } from '../../engine/Utils.js';
import { Projectile } from './Projectile.js';

export class Shockwave extends Projectile {
  constructor(x, y, maxRadius, damage) {
    super(x, y, 0, 0, damage, "#00ffb4", 10, false, 0);
    this.currentRadius = 10;
    this.maxRadius = maxRadius;
    this.damage = damage;
    this.alpha = 1;
    this.hitTargets = new Set();
  }
  update() {
    this.currentRadius += 7.5;
    this.alpha = 1 - (this.currentRadius / this.maxRadius);

    // Query enemies via spatial grid
    state.spatialGrid.queryRadius(this.x, this.y, this.currentRadius, (e) => {
      if (!this.hitTargets.has(e)) {
        e.takeDamage(this.damage, "#00ffb4");
        state.recordDamage('shockwave', this.damage);
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
          t.takeDamage(this.damage, "#00ffb4");
          state.recordDamage('shockwave', this.damage);
          this.hitTargets.add(actualTarget);
        }
      }
    }

    return this.currentRadius < this.maxRadius;
  }
  draw(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0, 255, 180, ${this.alpha})`;
    ctx.lineWidth = 4;
    ctx.shadowColor = "#00ffb4";
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.restore();
  }
}

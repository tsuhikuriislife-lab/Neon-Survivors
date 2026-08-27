import { state } from '../../engine/gameState.js';
import { dist, drawPolygon } from '../../engine/Utils.js';
import { Particle } from '../effects/Particle.js';

import { Projectile } from './Projectile.js';

export class Shockwave extends Projectile {
  constructor(x, y, maxRadius, damage) {
    super();
    this.x = x;
    this.y = y;
    this.currentRadius = 10;
    this.maxRadius = maxRadius;
    this.damage = damage;
    this.alpha = 1;
    this.hitTargets = new Set();
  }
  update() {
    this.currentRadius += 7.5;
    this.alpha = 1 - (this.currentRadius / this.maxRadius);

    state.enemies.forEach(e => {
      if (!this.hitTargets.has(e) && dist(this.x, this.y, e.x, e.y) <= this.currentRadius + e.radius) {
        e.takeDamage(this.damage, "#00ffb4");
        state.recordDamage('shockwave', this.damage);
        this.hitTargets.add(e);
        const ang = Math.atan2(e.y - this.y, e.x - this.x);
        e.x += Math.cos(ang) * 22;
        e.y += Math.sin(ang) * 22;
      }
    });

    state.bosses.forEach(b => {
      b.getTargetables().forEach(t => {
        const actualTarget = t.parent || t;
        if (!this.hitTargets.has(actualTarget) && dist(this.x, this.y, t.x, t.y) <= this.currentRadius + t.radius) {
          t.takeDamage(this.damage, "#00ffb4");
          state.recordDamage('shockwave', this.damage);
          this.hitTargets.add(actualTarget);
        }
      });
    });

    return this.currentRadius < this.maxRadius;
  }
  draw(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0, 255, 180, ${this.alpha})`;
    ctx.lineWidth = 4;
    ctx.shadowColor = "#00ffb4";
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.restore();
  }
}


import { Projectile } from './Projectile.js';
import { state } from '../../engine/gameState.js';
import { dist, drawPolygon } from '../../engine/Utils.js';
import { Particle } from '../effects/Particle.js';


export class MissileProjectile extends Projectile {
  constructor(x, y, vx, vy, damage, homingStrength, aoeRadius) {
    super();
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.homingStrength = homingStrength;
    this.aoeRadius = aoeRadius;
    this.radius = 6;
    this.life = 240;
    this.color = "#ff4400";
    this.pierce = false;
    this.isEnemy = false;
  }
  
  onHit() {
    import('../effects/spawnExplosion.js').then(({ spawnExplosion }) => {
        spawnExplosion(this.x, this.y, this.color, 20, 2.5);
    });
    import('../../engine/AudioManager.js').then(({ audioManager }) => {
        audioManager.playSound('hit_missile', { volume: 0.5, throttleMs: 80 });
    });
    
    const targets = [...state.enemies, ...state.bosses.flatMap(b => b.getTargetables())];
    const damagedParents = new Set();
    for (let t of targets) {
        const actualTarget = t.parent || t;
        if (damagedParents.has(actualTarget)) continue;

        if (dist(this.x, this.y, t.x, t.y) <= this.aoeRadius + t.radius) {
            t.takeDamage(this.damage, this.color);
            state.recordDamage('missiles', this.damage);
            damagedParents.add(actualTarget);
        }
    }
  }

  update() {
    if (this.homingStrength > 0) {
      let closest = null;
      let minD = 800;
      const targets = [...state.enemies, ...state.bosses.flatMap(b => b.getTargetables())];
      for (let t of targets) {
        const d = dist(this.x, this.y, t.x, t.y);
        if (d < minD) {
          minD = d;
          closest = t;
        }
      }
      if (closest) {
        const speed = Math.hypot(this.vx, this.vy);
        const targetAngle = Math.atan2(closest.y - this.y, closest.x - this.x);
        const curAngle = Math.atan2(this.vy, this.vx);
        let diff = targetAngle - curAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        const newAngle = curAngle + Math.sign(diff) * Math.min(this.homingStrength, Math.abs(diff));
        this.vx = Math.cos(newAngle) * speed;
        this.vy = Math.sin(newAngle) * speed;
      }
    }

    this.x += this.vx;
    this.y += this.vy;
    this.life--;
    if (this.life <= 0) {
        this.onHit();
        return false;
    }
    
    if (this.life % 3 === 0) {
        import('../effects/Particle.js').then(({ Particle }) => {
            state.particles.push(new Particle(this.x, this.y, "#ff8800", 0.5, 0.1, 2));
        });
    }

    return this.x >= -50 && this.x <= state.width + 50 && this.y >= -50 && this.y <= state.height + 50;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const angle = Math.atan2(this.vy, this.vx);
    ctx.rotate(angle);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-4, 4);
    ctx.lineTo(-4, -4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

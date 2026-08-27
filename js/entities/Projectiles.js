import { state } from '../engine/gameState.js';
import { dist, drawPolygon } from '../engine/Utils.js';
import { Particle } from './Effects.js';
export class Projectile {
  constructor(x, y, vx, vy, damage, color = "#00ffff", radius = 4, isEnemy = false, homingStrength = 0) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.color = color;
    this.radius = radius;
    this.isEnemy = isEnemy;
    this.homingStrength = homingStrength;
    this.life = 120;
  }
  update() {
    if (this.homingStrength > 0 && !this.isEnemy) {
      let closest = null;
      let minD = 800; // Tracking range
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
    const inBounds = this.x >= -50 && this.x <= state.width + 50 && this.y >= -50 && this.y <= state.height + 50;
    return this.isEnemy ? inBounds : (this.life > 0 && inBounds);
  }
  draw(ctx) {
    ctx.save();
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

export class AcceleratingProjectile {
  constructor(x, y, targetX, targetY, damage, color = "#00ff66") {
    this.x = x;
    this.y = y;
    this.damage = damage;
    this.color = color;
    this.radius = 5;
    this.life = 200;
    const angle = Math.atan2(targetY - y, targetX - x);
    this.dirX = Math.cos(angle);
    this.dirY = Math.sin(angle);
    this.currentSpeed = 1.2;
    this.accel = 0.06;
  }
  update() {
    this.currentSpeed += this.accel;
    this.x += this.dirX * this.currentSpeed;
    this.y += this.dirY * this.currentSpeed;
    return this.x >= -50 && this.x <= state.width + 50 && this.y >= -50 && this.y <= state.height + 50;
  }
  draw(ctx) {
    ctx.save();
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

export class FallingProjectile {
  constructor(x, y, vx, vy, damage, color = "#00ffff") {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.color = color;
    this.radius = 5;
    this.gravity = 0.12;
    this.history = [];
  }
  update() {
    this.history.push({ x: this.x, y: this.y });
    if (this.history.length > 8) this.history.shift();
    
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    return this.y <= state.height + 50;
  }
  draw(ctx) {
    ctx.save();
    
    if (this.history.length > 1) {
      ctx.beginPath();
      ctx.moveTo(this.history[0].x, this.history[0].y);
      for (let i = 1; i < this.history.length; i++) {
        ctx.lineTo(this.history[i].x, this.history[i].y);
      }
      ctx.lineTo(this.x, this.y);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.radius * 1.5;
      ctx.lineCap = "round";
      ctx.globalAlpha = 0.4;
      ctx.stroke();
    }
    
    ctx.globalAlpha = 1.0;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

export class Shockwave {
  constructor(x, y, maxRadius, damage) {
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

export class NovaProjectile {
  constructor(x, y, vx, vy, damage, isSpiral = false) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.isSpiral = isSpiral;
    this.radius = 12;
    this.life = 4000;
    this.color = "#0088ff";

    // For spiral motion
    this.startX = x;
    this.startY = y;
    this.baseX = x;
    this.baseY = y;
    this.time = 0;
    this.spiralRadius = 0;
    this.initialAngle = Math.atan2(vy, vx);
    this.speed = Math.hypot(vx, vy);
    this.pierce = true;
    this.hitCooldowns = new Map();
  }

  canHit(target) {
    const actualTarget = target.parent || target;
    const lastHit = this.hitCooldowns.get(actualTarget) || 0;
    if (state.gameTime - lastHit >= 0.1) {
      this.hitCooldowns.set(actualTarget, state.gameTime);
      return true;
    }
    return false;
  }

  update() {
    this.life--;
    this.time++;

    if (this.isSpiral) {
      this.spiralRadius += this.speed; 
      const angularVelocity = 0.05;
      const angle = this.initialAngle + this.time * angularVelocity; 
      this.x = this.startX + Math.cos(angle) * this.spiralRadius;
      this.y = this.startY + Math.sin(angle) * this.spiralRadius;
    } else {
      this.baseX += this.vx;
      this.baseY += this.vy;
      this.x = this.baseX;
      this.y = this.baseY;
    }

    if (this.time % 2 === 0) {
      state.particles.push(new Particle(this.x, this.y, this.color, 0.2, 0.08, 3));
    }

    return this.life > 0 && this.x >= -50 && this.x <= state.width + 50 && this.y >= -50 && this.y <= state.height + 50;
  }
  draw(ctx) {
    drawPolygon(ctx, this.x, this.y, this.radius + 2, 4, this.time * 0.2, this.color, 12, "rgba(0, 136, 255, 0.5)");
  }
}

export class MissileProjectile {
  constructor(x, y, vx, vy, damage, homingStrength, aoeRadius) {
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
    import('./Effects.js').then(({ spawnExplosion }) => {
        spawnExplosion(this.x, this.y, this.color, 20, 2.5);
    });
    
    const targets = [...state.enemies, ...state.bosses.flatMap(b => b.getTargetables())];
    const damagedParents = new Set();
    for (let t of targets) {
        const actualTarget = t.parent || t;
        if (damagedParents.has(actualTarget)) continue;

        if (dist(this.x, this.y, t.x, t.y) <= this.aoeRadius + t.radius) {
            t.takeDamage(this.damage, this.color);
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
        import('./Effects.js').then(({ Particle }) => {
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

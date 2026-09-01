import { state } from '../../engine/gameState.js';
import { dist } from '../../engine/Utils.js';
import { audioManager } from '../../engine/AudioManager.js';

export class LaserBeam {
  constructor(startX, startY, angle, damage, width, life, isSubLaser = false, dotDamage = 0, dotDuration = 0, tickDamage = false) {
    this.startX = startX;
    this.startY = startY;
    this.angle = angle;
    this.damage = damage;
    this.width = width;
    this.life = life; 
    this.maxLife = life;
    this.isSubLaser = isSubLaser;
    
    this.dotDamage = dotDamage;
    this.dotDuration = dotDuration;
    this.tickDamage = tickDamage;
    
    this.hitEnemies = new Set();
    this.tickTimer = 0;
    
    this.length = 2000;
  }
  
  update() {
    this.life--;
    if (this.life <= 0) return false;
    
    this.tickTimer--;
    let canDamageThisFrame = false;
    
    if (this.tickDamage) {
       if (this.tickTimer <= 0) {
          canDamageThisFrame = true;
          this.tickTimer = 5;
          this.hitEnemies.clear();
       }
    } else {
       if (this.life === this.maxLife - 1) { 
          canDamageThisFrame = true;
       }
    }
    
    if (canDamageThisFrame) {
      const cosA = Math.cos(this.angle);
      const sinA = Math.sin(this.angle);
      const endX = this.startX + cosA * this.length;
      const endY = this.startY + sinA * this.length;
      
      const targetsToHit = [];

      // Query enemies via spatial grid
      state.spatialGrid.queryLine(this.startX, this.startY, endX, endY, this.width, (enemy) => {
        if (enemy.hp <= 0) return;
        if (!this.hitEnemies.has(enemy)) {
          const distAlong = (enemy.x - this.startX) * cosA + (enemy.y - this.startY) * sinA;
          targetsToHit.push({ target: enemy, distAlong });
        }
      });

      // Also check boss targets
      for (let b of state.bosses) {
        for (let t of b.getTargetables()) {
          if (this.hitEnemies.has(t)) continue;
          const l2 = this.length * this.length;
          let tParam = Math.max(0, Math.min(1, ((t.x - this.startX) * (endX - this.startX) + (t.y - this.startY) * (endY - this.startY)) / l2));
          const projX = this.startX + tParam * (endX - this.startX);
          const projY = this.startY + tParam * (endY - this.startY);
          if (dist(t.x, t.y, projX, projY) < this.width / 2 + t.radius) {
            const distAlong = (t.x - this.startX) * cosA + (t.y - this.startY) * sinA;
            targetsToHit.push({ target: t, distAlong });
          }
        }
      }

      // Ordenar objetivos por proximidad al origen del laser (el primero en el rayo se procesa primero)
      targetsToHit.sort((a, b) => a.distAlong - b.distAlong);

      targetsToHit.forEach((item, index) => {
        const t = item.target;
        if (this.hitEnemies.has(t)) return;
        this.hitEnemies.add(t);

        // Reduccion de 5% de dano por cada enemigo atravesado (100%, 95%, 90%...)
        const falloffMult = Math.max(0.1, 1.0 - index * 0.05);
        const actualDamage = this.damage * falloffMult;

        t.takeDamage(actualDamage, "#00ff00");
        state.recordDamage('laserCannon', actualDamage);
        
        if (this.dotDuration > 0) {
          t.laserDot = { damage: this.dotDamage * falloffMult, duration: this.dotDuration, timer: 60 };
        }
        
        audioManager.playSound('hit_laser_cannon', { volume: 0.5, throttleMs: 30 });
      });
    }
    
    if (Math.random() < 0.6 && state.particlePool) {
       const d = Math.random() * this.length;
       const px = this.startX + Math.cos(this.angle) * d;
       const py = this.startY + Math.sin(this.angle) * d;
       const transAng = this.angle + (Math.random() > 0.5 ? Math.PI/2 : -Math.PI/2);
       const p = state.particlePool.acquire(px, py, "#00ff00", 2 + Math.random()*2, 0.05, 3);
       if (p) {
         p.vx = Math.cos(transAng) * (Math.random() * 4 + 1);
         p.vy = Math.sin(transAng) * (Math.random() * 4 + 1);
       }
    }
    
    return true;
  }
  
  draw(ctx) {
    const alpha = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = this.width * 0.4;
    ctx.beginPath();
    ctx.moveTo(this.startX, this.startY);
    ctx.lineTo(this.startX + Math.cos(this.angle) * this.length, this.startY + Math.sin(this.angle) * this.length);
    ctx.stroke();
    
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "#00ff00";
    ctx.shadowColor = "#00ff00";
    ctx.shadowBlur = 10;
    ctx.lineWidth = this.width;
    ctx.beginPath();
    ctx.moveTo(this.startX, this.startY);
    ctx.lineTo(this.startX + Math.cos(this.angle) * this.length, this.startY + Math.sin(this.angle) * this.length);
    ctx.stroke();
    
    ctx.restore();
  }
}

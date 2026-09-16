import { Projectile } from './Projectile.js';
import { state } from '../../engine/gameState.js';
import { dist } from '../../engine/Utils.js';
import { spawnExplosion } from '../effects/spawnExplosion.js';
import { audioManager } from '../../engine/AudioManager.js';
import { textures } from '../../engine/TextureCache.js';
import { worldLayer } from '../../main.js';

export class MissileProjectile extends Projectile {
  constructor(x, y, vx, vy, damage, homingStrength, aoeRadius) {
    super(x, y, vx, vy, damage, "#ff4400", 6, false, homingStrength);
    this.aoeRadius = aoeRadius;
    this.radius = 6;
    this.life = 240;
    this.color = "#ff4400";
    this.pierce = false;
    this.isEnemy = false;
    
    if (this.sprite) {
      worldLayer.removeChild(this.sprite);
      this.sprite.destroy();
      this.sprite = null;
    }
    
    this.texture = textures['proj_missile'];
    if (this.texture) {
      this.sprite = new PIXI.Sprite(this.texture);
      this.sprite.anchor.set(0.5);
    } else {
      this.sprite = new PIXI.Graphics();
      this.sprite.beginFill(0xff4400);
      this.sprite.drawCircle(0, 0, this.radius);
      this.sprite.endFill();
    }
    this.sprite.x = this.x;
    this.sprite.y = this.y;
    worldLayer.addChild(this.sprite);
  }
  
  /**
   * Genera una explosión visual en el punto de impacto exacto del misil.
   * La cantidad, velocidad y tamaño de las partículas escalan dinámicamente
   * en función del radio de daño en área (aoeRadius) del misil.
   */
  spawnImpactExplosion() {
    if (!state.particlePool) return;

    // Escala del radio de daño en área respecto a la base canónica (140px)
    const aoeRatio = Math.max(0.5, this.aoeRadius / 140);

    // Velocidad límite calculada para que las esquirlas exteriores alcancen la frontera física del AoE
    // (Bajo la fricción 0.96 y decay ~0.025 de PooledParticle, distancia recorrida ≈ 18 * speed)
    const maxSpeed = this.aoeRadius / 18;

    // Cantidad de partículas adaptada al volumen del área para mantener densidad visual sin colapsar el pool
    const totalParticles = Math.min(64, Math.round(26 + 18 * aoeRatio));

    for (let i = 0; i < totalParticles; i++) {
      // Distribución en 3 estratos: 40% núcleo denso, 40% plasma intermedio, 20% esquirlas rápidas
      const layerRoll = Math.random();
      let pSpeed, pDecay, pSize, pColor;

      if (layerRoll < 0.4) {
        // Núcleo central caliente: partículas de gran tamaño con baja velocidad para simular la bola de fuego
        pSpeed = (Math.random() * 0.35 + 0.1) * maxSpeed;
        pDecay = 0.022;
        // El tamaño escala directamente con el radio de AoE del misil
        pSize = (Math.random() * 8 + 8) * aoeRatio;
        pColor = Math.random() < 0.4 ? "#ffffff" : (Math.random() < 0.7 ? "#ffee44" : "#ff8800");
      } else if (layerRoll < 0.8) {
        // Cuerpo intermedio de plasma ardiente en expansión
        pSpeed = (Math.random() * 0.45 + 0.35) * maxSpeed;
        pDecay = 0.026;
        pSize = (Math.random() * 5 + 5) * aoeRatio;
        pColor = Math.random() < 0.6 ? "#ff4400" : "#ff8800";
      } else {
        // Onda de choque exterior y esquirlas que delinean el radio máximo del daño en área
        pSpeed = (Math.random() * 0.3 + 0.7) * maxSpeed;
        pDecay = 0.034;
        pSize = (Math.random() * 3 + 3) * aoeRatio;
        pColor = Math.random() < 0.5 ? "#ff1100" : "#ff4400";
      }

      state.particlePool.acquire(this.x, this.y, pColor, pSpeed, pDecay, pSize);
    }
  }

  onHit() {
    this.spawnImpactExplosion();
    audioManager.playSound('hit_missile', { volume: 0.5, throttleMs: 80 });
    
    const damagedParents = new Set();

    // Query enemies via spatial grid
    state.spatialGrid.queryRadius(this.x, this.y, this.aoeRadius, (target) => {
      if (target.hp <= 0) return;
      const actualTarget = target.parent || target;
      if (damagedParents.has(actualTarget)) return;

      actualTarget.takeDamage(this.damage, this.color);
      state.recordDamage('missiles', this.damage);
      damagedParents.add(actualTarget);
    });

    // Also check bosses
    for (let b of state.bosses) {
      for (let t of b.getTargetables()) {
        const actualTarget = t.parent || t;
        if (damagedParents.has(actualTarget)) continue;

        if (dist(this.x, this.y, t.x, t.y) <= this.aoeRadius + t.radius) {
          t.takeDamage(this.damage, this.color);
          state.recordDamage('missiles', this.damage);
          damagedParents.add(actualTarget);
        }
      }
    }
  }

  findTarget() {
    let closest = null;
    let minD = Infinity;

    // 1. Search regular enemies
    if (state.spatialGrid) {
      const nearestEnemy = state.spatialGrid.getNearest(this.x, this.y, 3000);
      if (nearestEnemy && !nearestEnemy.dead && nearestEnemy.hp > 0) {
        closest = nearestEnemy;
        minD = dist(this.x, this.y, nearestEnemy.x, nearestEnemy.y);
      }
    }

    if (!closest && state.enemies && state.enemies.length > 0) {
      const len = state.enemies.length;
      for (let i = 0; i < len; i++) {
        const e = state.enemies[i];
        if (e.dead || e.hp <= 0) continue;
        const d = dist(this.x, this.y, e.x, e.y);
        if (d < minD) {
          minD = d;
          closest = e;
        }
      }
    }

    // 2. Search all boss targetables
    if (state.bosses && state.bosses.length > 0) {
      const bossLen = state.bosses.length;
      for (let i = 0; i < bossLen; i++) {
        const b = state.bosses[i];
        const targetables = b.getTargetables ? b.getTargetables() : (b.dead ? [] : [b]);
        const tLen = targetables.length;
        for (let j = 0; j < tLen; j++) {
          const t = targetables[j];
          if (t.dead || t.hp <= 0) continue;
          const d = dist(this.x, this.y, t.x, t.y);
          if (d < minD) {
            minD = d;
            closest = t;
          }
        }
      }
    }

    return closest;
  }

  update() {
    if (this.homingStrength > 0) {
      const closest = this.findTarget();
      if (closest) {
        const speed = Math.hypot(this.vx, this.vy) || 7;
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
    
    if (this.sprite) {
      this.sprite.x = this.x;
      this.sprite.y = this.y;
      this.sprite.rotation = Math.atan2(this.vy, this.vx);
    }
    
    // Trail emission
    if (state.particlePool && Math.random() < 0.65) {
      state.particlePool.acquire(this.x, this.y, this.color, 0.4, 0.12, this.radius * 0.9);
    }
    
    if (this.life <= 0) {
      this.onHit();
      this.destroy();
      return false;
    }
    
    if (this.life % 3 === 0 && state.particlePool) {
      state.particlePool.acquire(this.x, this.y, "#ff8800", 0.5, 0.1, 2);
    }

    const isAlive = this.x >= 0 && this.x <= state.width && this.y >= 0 && this.y <= state.height;
    if (!isAlive) this.destroy();
    return isAlive;
  }
}

import { Weapon } from './Weapon.js';
import { state } from '../../../engine/gameState.js';
import { dist } from '../../../engine/Utils.js';
import { Projectile } from '../../projectiles/Projectile.js';
import { audioManager } from '../../../engine/AudioManager.js';

export class Blaster extends Weapon {
  constructor(player) {
    super(player);
    this.level = 1;
    this.timer = 0;
    this.cooldown = 30;
    this.cooldownMult = 1.0;
    this.projectileCount = 1;
    this.damage = 10;
    this.range = 500;
    this.speed = 12;
    this.homing = 0;
    this.homingUpgrades = 0;
  }

  update(dt) {
    if (this.level <= 0) return;
    this.timer++;
    if (this.timer >= (this.cooldown / (this.cooldownMult || 1.0)) * this.player.getEffectiveCooldownMult()) {
      this.timer = 0;
      this.fire();
    }
  }

  fire() {
    const effectiveRange = this.range * (this.rangeMult || 1.0);
    const count = this.projectileCount;
    const dmg = this.damage * this.player.getEffectiveDamageMult();
    const homing = this.homing || 0;

    // 1. Recolectar a todos los objetivos potenciales
    let potentialTargets = [];
    state.spatialGrid.queryRadius(this.player.x, this.player.y, effectiveRange, (e) => {
      if (e.hp > 0) potentialTargets.push(e);
    });

    for (let b of state.bosses) {
      for (let target of b.getTargetables()) {
        const d = dist(this.player.x, this.player.y, target.x, target.y);
        if (d <= effectiveRange) {
          potentialTargets.push(target);
        }
      }
    }

    // 2. Función auxiliar para disparar un proyectil individual
    const spawnProj = (baseAngle, spreadIndex, totalSpreadShots) => {
      const spread = totalSpreadShots > 1 ? (spreadIndex - (totalSpreadShots - 1) / 2) * 0.09 : 0;
      const finalAngle = baseAngle + spread;
      const effectiveSpeed = this.speed * (this.speedMult || 1.0);
      const vx = Math.cos(finalAngle) * effectiveSpeed;
      const vy = Math.sin(finalAngle) * effectiveSpeed;

      if (state.projectilePool) {
        state.projectilePool.acquire(this.player.x, this.player.y, vx, vy, dmg, this.player.customization.blasterParticleColor, 4, false, homing);
      } else {
        state.projectiles.push(new Projectile(this.player.x, this.player.y, vx, vy, dmg, this.player.customization.blasterParticleColor, 4, false, homing));
      }
    };

    // 3. Si no hay enemigos, disparar todo al frente
    if (potentialTargets.length === 0) {
      for (let i = 0; i < count; i++) {
        spawnProj(this.player.angle, i, count);
      }
    } else {
      // 4. Ordenar por distancia y seleccionar los objetivos más cercanos
      let targetDistances = potentialTargets.map(t => ({
        entity: t,
        d: dist(this.player.x, this.player.y, t.x, t.y)
      }));
      targetDistances.sort((a, b) => a.d - b.d);
      
      // Tomamos como máximo "count" enemigos (uno para cada proyectil)
      let validTargets = targetDistances.map(t => t.entity).slice(0, count);
      
      // 5. Repartir los proyectiles de forma equitativa (Round-Robin)
      let targetCounts = new Map();
      for (let i = 0; i < count; i++) {
        let t = validTargets[i % validTargets.length];
        targetCounts.set(t, (targetCounts.get(t) || 0) + 1);
      }
      
      // 6. Disparar a cada objetivo con spread local si recibe múltiples disparos
      targetCounts.forEach((shots, target) => {
        const targetAngle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
        for (let i = 0; i < shots; i++) {
          spawnProj(targetAngle, i, shots);
        }
      });
    }

    audioManager.playSound('fire_main_gun', { volume: 0.3, throttleMs: 100 });
  }
}


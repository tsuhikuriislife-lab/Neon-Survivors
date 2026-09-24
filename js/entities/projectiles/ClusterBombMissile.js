import { MissileProjectile } from './MissileProjectile.js';
import { state } from '../../engine/gameState.js';

export class ClusterBombMissile extends MissileProjectile {
  constructor(x, y, vx, vy, damage, homingStrength, aoeRadius, targetAssignment = null) {
    super(x, y, vx, vy, damage, homingStrength, aoeRadius, targetAssignment);
    // Hacer que el misil principal se vea más grande y peligroso
    if (this.sprite && this.sprite.scale) {
      this.sprite.scale.set(1.5);
    }
  }

  onHit() {
    // 1. Ejecutar la explosión normal y daño del misil principal
    super.onHit();

    // 2. Soltar la metralla (misiles pequeños sin homing)
    const shrapnelCount = 6 + Math.floor(Math.random() * 3); // 6 a 8 misiles pequeños
    for (let i = 0; i < shrapnelCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 4; // Velocidad aleatoria tipo fuegos artificiales
      
      const smallMissile = new MissileProjectile(
        this.x, this.y, 
        Math.cos(angle) * speed, Math.sin(angle) * speed, 
        this.damage * 0.4, // Los pequeños hacen 40% del daño del principal
        0, // Sin Homing
        this.aoeRadius * 0.6 // Explosión más pequeña
      );
      
      // Cortarles la vida para que exploten rápido en el aire (distancia definida)
      smallMissile.life = 15 + Math.floor(Math.random() * 20); // 15 a 35 frames (cuarto a medio segundo)
      
      // Hacerlos visualmente pequeños
      if (smallMissile.sprite && smallMissile.sprite.scale) {
        smallMissile.sprite.scale.set(0.6);
      }
      
      state.projectiles.push(smallMissile);
    }
  }
}

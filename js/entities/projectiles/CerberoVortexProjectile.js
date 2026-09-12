import { Projectile } from './Projectile.js';

export class CerberoVortexProjectile extends Projectile {
  constructor(x, y, vx, vy, damage, color, radius, homingStrength, bossRoot) {
    super(x, y, vx, vy, damage, color, radius, true, homingStrength);
    this.bossRoot = bossRoot;
  }

  update() {
    super.update(); // Ejecutar físicas de movimiento y partículas
    
    if (!this.bossRoot || this.bossRoot.dead) return false;

    // Absorber al tocar el centro
    const d = Math.hypot(this.x - this.bossRoot.x, this.y - this.bossRoot.y);
    if (d < this.bossRoot.radius * 0.6) return false;
    
    // Ignorar los límites estrictos de Projectile.js para que no desaparezcan al nacer fuera del mapa
    return this.x >= -200 && this.x <= 2120 && this.y >= -200 && this.y <= 2120;
  }
}

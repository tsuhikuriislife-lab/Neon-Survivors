import { Projectile } from './Projectile.js';

export class CerberoSpiralProjectile extends Projectile {
  constructor(x, y, vx, vy, damage, color, radius) {
    super(x, y, vx, vy, damage, color, radius, true, 0);
    this.spiralLife = 120;
  }

  update() {
    const alive = super.update();
    this.spiralLife--;
    return alive && this.spiralLife > 0;
  }
}

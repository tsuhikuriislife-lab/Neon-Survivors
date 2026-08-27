import { Boss } from './Boss.js';
import { state } from '../../engine/gameState.js';
import { drawPolygon } from '../../engine/Utils.js';

export class TestingBoss extends Boss {
  constructor() {
    // 999999 hp to simulate infinite, but we'll also prevent it from dying
    super(state.width / 2, state.height / 2, "Dummy Target", 999999, 160, "#00ffff");
  }

  takeDamage(amt, damageColor = this.color, hitX = this.x, hitY = this.y) {
    // Call super to show floating text
    super.takeDamage(amt, damageColor, hitX, hitY);
    // Instantly regenerate
    this.hp = this.maxHp;
  }

  update(player) {
    // Force position to center of the map constantly
    this.x = state.width / 2;
    this.y = state.height / 2;

    // It doesn't move and doesn't deal damage
    this.angle = (this.angle || 0) + 0.01;
  }

  draw(ctx) {
    drawPolygon(ctx, this.x, this.y, this.radius, 10, this.angle || 0, this.color, 14, "rgba(0, 255, 255, 0.2)");
  }
}

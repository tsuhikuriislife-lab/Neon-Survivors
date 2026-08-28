import { AmalgamNode } from './AmalgamNode.js';
import { state } from '../../engine/gameState.js';
import { dist, drawPolygon } from '../../engine/Utils.js';
import { spawnExplosion } from '../effects/spawnExplosion.js';
import { FloatingText } from '../effects/FloatingText.js';
import { HazardArea } from '../effects/HazardArea.js';
import { Gem } from '../collectibles/Gem.js';
import { Projectile } from '../projectiles/Projectile.js';
import { AcceleratingProjectile } from '../projectiles/AcceleratingProjectile.js';
import { FallingProjectile } from '../projectiles/FallingProjectile.js';


import { Boss } from './Boss.js';

export class AmalgamBossRoot {
  constructor(x, y) {
    this.name = "Amalgam";
    const multiplier = state.bossScaling['AmalgamBossRoot'] || 1.0;
    const startX = x !== undefined ? x : state.width / 2;
    const startY = y !== undefined ? y : state.height / 2;
    this.nodes = [new AmalgamNode("Amalgam", startX, startY, 25000 * multiplier, 25000 * multiplier, 1)];
  }

  getTargetables() {
    return this.nodes.filter(n => !n.dead);
  }

  update(player) {
    this.nodes = this.nodes.filter(n => !n.dead);
    this.nodes.forEach(n => n.update(player));
  }

  draw(ctx) {
    this.nodes.forEach(n => n.draw(ctx));
  }
}


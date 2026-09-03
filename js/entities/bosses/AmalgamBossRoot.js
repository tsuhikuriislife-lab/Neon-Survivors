import { AmalgamNode } from './AmalgamNode.js';
import { state } from '../../engine/gameState.js';
import { dist, drawPolygon } from '../../engine/Utils.js';
import { spawnExplosion } from '../effects/spawnExplosion.js';
import { HazardArea } from '../effects/HazardArea.js';
import { Gem } from '../collectibles/Gem.js';
import { Projectile } from '../projectiles/Projectile.js';
import { AcceleratingProjectile } from '../projectiles/AcceleratingProjectile.js';
import { FallingProjectile } from '../projectiles/FallingProjectile.js';


import { Boss } from './Boss.js';
import { getOrCachePolygon, textures } from '../../engine/TextureCache.js';
import { worldLayer } from '../../main.js';


export class AmalgamBossRoot {
  constructor(x, y) {
    this.name = "Amalgam";
    const multiplier = state.bossScaling['AmalgamBossRoot'] || 1.0;
    const startX = x !== undefined ? x : state.width / 2;
    const startY = y !== undefined ? y : state.height / 2;
    const initialNode = new AmalgamNode("Amalgam", startX, startY, 25000 * multiplier, 25000 * multiplier, 1);
    initialNode.root = this;
    this.nodes = [initialNode];
    this.dead = false;
  }

  getTargetables() {
    return this.nodes.filter(n => !n.dead);
  }

  update(player) {
    if (this.dead) return;
    this.nodes = this.nodes.filter(n => !n.dead);
    if (this.nodes.length === 0) {
      this.dead = true;
      return;
    }
    this.nodes.forEach(n => {
      n.update(player);
    });
  }

  die() {
    this.nodes.forEach(n => {
      if (typeof n.die === 'function') n.die();
    });
  }

  destroy() {
    this.nodes.forEach(n => {
      if (typeof n.destroy === 'function') n.destroy();
    });
  }
}

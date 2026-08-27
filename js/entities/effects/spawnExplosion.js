import { state } from '../../engine/gameState.js';
import { drawPolygon } from '../../engine/Utils.js';

import { Particle } from './Particle.js';

export function spawnExplosion(x, y, color, count = 16, speed = 4) {
  for (let i = 0; i < count; i++) {
    state.particles.push(new Particle(x, y, color, speed, 0.025, Math.random() * 3 + 2));
  }
}
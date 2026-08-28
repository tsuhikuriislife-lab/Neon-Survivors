import { state } from '../../engine/gameState.js';

export function spawnExplosion(x, y, color, count = 16, speed = 4) {
  if (state.particlePool) {
    state.particlePool.spawnExplosion(x, y, color, count, speed);
  }
}
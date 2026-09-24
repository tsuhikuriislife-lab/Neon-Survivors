import { state } from '../../engine/gameState.js';

const TARGET_RANGE_BUFFER = 256;

/** Returns whether a target or boss segment still belongs to a living entity. */
function isTargetAlive(target) {
  if (!target || target.dead) return false;

  const owner = target.stableTargetKey ? (target.parent || target) : target;
  const identity = target.stableTargetKey || target;

  if (owner.dead || (owner.hp !== undefined && owner.hp <= 0)) return false;
  if (identity.dead || (identity.hp !== undefined && identity.hp <= 0)) return false;

  // Boss segments can be removed during phase changes while their boss remains alive.
  if (target.stableTargetKey && Array.isArray(owner.segments) && !owner.segments.includes(identity)) {
    return false;
  }

  return true;
}

/**
 * Finds the closest living enemy or boss hitbox in the arena.
 * @param {number} x - World-space X coordinate of the laser origin.
 * @param {number} y - World-space Y coordinate of the laser origin.
 * @returns {object|null} The closest target, or null when the arena is empty.
 */
export function acquireNearestLaserTarget(x, y) {
  const arenaWidth = state.width || 1920;
  const arenaHeight = state.height || 1920;
  const maxRange = Math.hypot(arenaWidth, arenaHeight) + TARGET_RANGE_BUFFER;
  const maxRangeSq = maxRange * maxRange;
  const seenTargets = new Set();
  let nearestTarget = null;
  let nearestDistanceSq = Infinity;

  /** Tests a candidate once, preserving segment wrappers so their hit position stays accurate. */
  const considerTarget = (target) => {
    if (!isTargetAlive(target)) return;
    if (target.x < 0 || target.x > arenaWidth || target.y < 0 || target.y > arenaHeight) return;

    const identity = target.stableTargetKey || target;
    if (seenTargets.has(identity)) return;
    seenTargets.add(identity);

    const dx = target.x - x;
    const dy = target.y - y;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq > maxRangeSq || distanceSq >= nearestDistanceSq) return;

    nearestDistanceSq = distanceSq;
    nearestTarget = target;
  };

  if (state.spatialGrid) {
    state.spatialGrid.queryRadius(x, y, maxRange, considerTarget);
  } else {
    const enemies = state.enemies || [];
    for (let i = 0; i < enemies.length; i++) considerTarget(enemies[i]);
  }

  // Bosses and their exposed hitboxes are not stored in the enemy spatial grid.
  const bosses = state.bosses || [];
  for (let i = 0; i < bosses.length; i++) {
    const boss = bosses[i];
    const targets = boss.getTargetables ? boss.getTargetables() : (boss.dead ? [] : [boss]);
    for (let j = 0; j < targets.length; j++) considerTarget(targets[j]);
  }

  return nearestTarget;
}

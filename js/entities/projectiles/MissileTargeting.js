import { state } from '../../engine/gameState.js';

const MISSILE_TARGET_RANGE = 3000;

/** Indica si una entidad sigue viva y puede recibir daño. */
function isAliveTarget(target) {
  return Boolean(target && !target.dead && (target.hp === undefined || target.hp > 0));
}

/**
 * Valida una asignación persistente sin reconstruir los wrappers de jefes cada frame.
 * Los segmentos comparten la vida del jefe, pero mantienen una posición estable propia.
 */
export function isMissileTargetValid(targetKey, targetOwner) {
  if (!targetKey || !isAliveTarget(targetOwner) || !isAliveTarget(targetKey)) return false;

  // Algunos jefes acortan su cuerpo al cambiar de fase; sus segmentos retirados dejan de ser objetivos.
  if (targetKey !== targetOwner && Array.isArray(targetOwner.segments)) {
    return targetOwner.segments.includes(targetKey);
  }

  return true;
}

/**
 * Elige un objetivo válido con menos misiles asignados; entre objetivos igualmente cargados,
 * prefiere el más cercano. Solo recorre candidatos cuando se lanza un misil o pierde su blanco.
 * @param {number} x - Posición X del misil.
 * @param {number} y - Posición Y del misil.
 * @param {object|null} requestingMissile - Misil que solicita un blanco, excluido del recuento.
 * @returns {{key: object, owner: object}|null} Referencia estable al objetivo y a quien controla su vida.
 */
export function acquireMissileTarget(x, y, requestingMissile = null) {
  const candidates = [];
  const candidateKeys = new Set();

  /** Añade una entidad o un hitbox temporal de jefe usando una identidad estable. */
  const addCandidate = (target) => {
    if (!target) return;

    const key = target.stableTargetKey || target;
    const owner = target.stableTargetKey ? (target.parent || target) : target;
    if (candidateKeys.has(key) || !isMissileTargetValid(key, owner)) return;

    candidateKeys.add(key);
    const dx = key.x - x;
    const dy = key.y - y;
    candidates.push({ key, owner, distanceSq: dx * dx + dy * dy });
  };

  // La cuadrícula contiene los enemigos normales y limita la búsqueda al rango de los misiles.
  if (state.spatialGrid) {
    state.spatialGrid.queryRadius(x, y, MISSILE_TARGET_RANGE, addCandidate);
  } else if (state.enemies) {
    for (let i = 0; i < state.enemies.length; i++) addCandidate(state.enemies[i]);
  }

  // Se respeta getTargetables() para incluir los mismos jefes, partes y unidades que acepta el juego.
  if (state.bosses) {
    for (let i = 0; i < state.bosses.length; i++) {
      const boss = state.bosses[i];
      const targets = boss.getTargetables ? boss.getTargetables() : (boss.dead ? [] : [boss]);
      for (let j = 0; j < targets.length; j++) addCandidate(targets[j]);
    }
  }

  if (candidates.length === 0) return null;

  // Cada misil teledirigido reserva un blanco válido; los fragmentos no tienen homing ni reservan.
  const assignmentCounts = new Map();
  const projectiles = state.projectiles || [];
  for (let i = 0; i < projectiles.length; i++) {
    const projectile = projectiles[i];
    if (projectile === requestingMissile || !projectile.isTargetSeekingMissile) continue;
    if (!isMissileTargetValid(projectile.targetKey, projectile.targetOwner)) continue;

    const count = assignmentCounts.get(projectile.targetKey) || 0;
    assignmentCounts.set(projectile.targetKey, count + 1);
  }

  // Elegir primero el objetivo menos ocupado garantiza repartir los blancos antes de repetirlos.
  let chosen = null;
  let lowestCount = Infinity;
  let shortestDistanceSq = Infinity;
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const count = assignmentCounts.get(candidate.key) || 0;
    if (count < lowestCount || (count === lowestCount && candidate.distanceSq < shortestDistanceSq)) {
      chosen = candidate;
      lowestCount = count;
      shortestDistanceSq = candidate.distanceSq;
    }
  }

  return chosen ? { key: chosen.key, owner: chosen.owner } : null;
}

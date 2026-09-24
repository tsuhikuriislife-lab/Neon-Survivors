/**
 * Multiplicadores globales aplicados desde los valores base de los hostiles.
 * Se mantienen fuera del estado por frame para evitar acumulación.
 */
export const ENEMY_BASE_BALANCE = Object.freeze({
  version: 1,
  healthMultiplier: 1.5,
  damageMultiplier: 1.75,
  speedMultiplier: 1.25,
  spawnRateMultiplier: 1.25
});

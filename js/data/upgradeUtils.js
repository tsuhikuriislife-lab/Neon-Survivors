/** Devuelve cuántas veces se ha concedido una mejora durante esta partida. */
export function getUpgradeCount(upgrade, player) {
  return player?.acquiredUpgrades?.[upgrade.id] || 0;
}

/** Devuelve el máximo de una mejora o null si no tiene límite. */
export function getUpgradeMaxCount(upgrade) {
  return Number.isFinite(upgrade.maxCount) ? upgrade.maxCount : null;
}

/** Aplica reglas de juego y máximo desde un único punto compartido. */
export function canAcquireUpgrade(upgrade, player) {
  if (!player) return false;
  const maxCount = getUpgradeMaxCount(upgrade);
  if (maxCount !== null && getUpgradeCount(upgrade, player) >= maxCount) return false;
  return !upgrade.isAvailable || upgrade.isAvailable(player);
}

/** Concede la carta y registra su adquisición exactamente una vez. */
export function acquireUpgrade(upgrade, player, { force = false } = {}) {
  if (!force && !canAcquireUpgrade(upgrade, player)) return false;
  upgrade.apply(player);
  player.acquiredUpgrades ||= {};
  player.acquiredUpgrades[upgrade.id] = getUpgradeCount(upgrade, player) + 1;
  return true;
}

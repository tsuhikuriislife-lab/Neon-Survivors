export class SaveManager {
  static SAVE_KEY = 'neon_survivors_save';

  static saveGame(state) {
    if (!state.player) return;

    // Serialize Player
    const p = state.player;
    const playerData = {
      x: p.x, y: p.y,
      hp: p.hp, maxHp: p.maxHp,
      level: p.level, xp: p.xp, nextXp: p.nextXp,
      hasRevivedOnce: p.hasRevivedOnce,
      acquiredUpgrades: p.acquiredUpgrades,
      damageMult: p.damageMult,
      damageUpgradesCount: p.damageUpgradesCount,
      cooldownMult: p.cooldownMult,
      blasterRateUpgrades: p.blasterRateUpgrades,
      critChance: p.critChance,
      critDamage: p.critDamage,
      xpMultiplier: p.xpMultiplier,
      doubleGemChance: p.doubleGemChance,
      doubleGemUpgradesCount: p.doubleGemUpgradesCount,
      pickupRadius: p.pickupRadius,
      magnetUpgrades: p.magnetUpgrades,
      invulnerabilityMaxTime: p.invulnerabilityMaxTime,
      iFrameUpgradesCount: p.iFrameUpgradesCount,
      speed: p.speed,
      shield: p.shield,
      weapons: p.weapons,
      activeSkill: p.activeSkill
    };

    // Serialize Bosses
    const bossData = state.bosses.map(b => {
      // For complex bosses like AmalgamRoot or Devourer, we just store the class and basic stats.
      // The game recreates them. For their active sub-entities, we record them to set their HPs.
      return {
        className: b.constructor.name,
        x: b.x,
        y: b.y,
        hp: b.hp,
        maxHp: b.maxHp,
        // Any specialized serialization could go here if needed.
        // E.g. Devourer of Tax has carlos and sebastian
        carlosHp: b.carlos ? b.carlos.hp : null,
        sebastianHp: b.sebastian ? b.sebastian.hp : null,
        // Kyren Boss has specific phase
        phase: b.phase !== undefined ? b.phase : null,
        nodes: b.nodes ? b.nodes.map(n => ({ x: n.x, y: n.y, hp: n.hp, maxHp: n.maxHp, stage: n.stage })) : null
      };
    });

    const saveData = {
      gameTime: state.gameTime,
      killCount: state.killCount,
      nextBossTime: state.nextBossTime,
      nextWaveTime: state.nextWaveTime,
      isWaveActive: state.isWaveActive,
      waveTimer: state.waveTimer,
      spawnTimer: state.spawnTimer,
      hasRerolledCurrentLevel: state.hasRerolledCurrentLevel,
      bossScaling: state.bossScaling,
      lastBossName: state.lastBossName,
      bossDefeatTimes: state.bossDefeatTimes,
      damageStats: state.damageStats,
      player: playerData,
      bosses: bossData
    };

    try {
      localStorage.setItem(this.SAVE_KEY, JSON.stringify(saveData));
    } catch (e) {
      console.error("Failed to save game:", e);
    }
  }

  static loadGame() {
    try {
      const data = localStorage.getItem(this.SAVE_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error("Failed to load game:", e);
    }
    return null;
  }

  static hasSaveGame() {
    return !!localStorage.getItem(this.SAVE_KEY);
  }

  static clearSaveGame() {
    localStorage.removeItem(this.SAVE_KEY);
  }
}

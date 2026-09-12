export const metaUpgradesTree = {
  root_core: {
    id: "root_core",
    name: "Núcleo del Sistema",
    description: "Módulo principal. Permite reiniciar el árbol y recuperar el 70% de las gemas invertidas.",
    icon: "assets/upgrades/forcefield-battery.png",
    maxLevel: 1,
    baseCost: 0,
    costMultiplier: 1,
    x: 0, y: 0,
    requires: [],
    apply: (player, level) => {}
  },
  
  // ================= HEALTH BRANCH (LEFT) ================= //
  hp_base: {
    id: "hp_base",
    name: "Integridad del Casco",
    description: "Aumenta la salud máxima base.",
    icon: "assets/upgrades/hull-reinforcement.png",
    maxLevel: 10,
    baseCost: 50,
    costMultiplier: 1.5,
    x: -120, y: 0,
    requires: [{ id: "root_core", level: 1 }],
    apply: (player, level) => { 
      player.maxHp += level * 10; 
      player.hp = player.maxHp; 
    }
  },
  defense_base: {
    id: "defense_base",
    name: "Blindaje Reactivo",
    description: "Reduce un pequeño porcentaje del daño recibido.",
    icon: "assets/upgrades/force-field.png",
    maxLevel: 5,
    baseCost: 150,
    costMultiplier: 1.8,
    x: -240, y: -120,
    requires: [{ id: "hp_base", level: 1 }],
    apply: (player, level) => {
      player.damageReduction = (player.damageReduction || 0) + (level * 0.05);
    }
  },
  regen_base: {
    id: "regen_base",
    name: "Sistemas de Reparación",
    description: "Regenera salud lentamente con el tiempo.",
    icon: "assets/upgrades/passive-regeneration.png",
    maxLevel: 3,
    baseCost: 300,
    costMultiplier: 2.0,
    x: -360, y: 0,
    requires: [{ id: "defense_base", level: 1 }],
    apply: (player, level) => {
      player.hpRegen = (player.hpRegen || 0) + (level * 0.2);
    }
  },

  // ================= DAMAGE BRANCH (DOWN) ================= //
  dmg_base: {
    id: "dmg_base",
    name: "Sobrecarga de Energía",
    description: "Aumenta el daño base de todas las armas.",
    icon: "assets/upgrades/weapon-tuning.png",
    maxLevel: 10,
    baseCost: 75,
    costMultiplier: 1.6,
    x: 0, y: 120,
    requires: [{ id: "root_core", level: 1 }],
    apply: (player, level) => {
      player.damageMult += level * 0.05;
    }
  },
  crit_chance: {
    id: "crit_chance",
    name: "Lentes de Precisión",
    description: "Aumenta la probabilidad de impacto crítico.",
    icon: "assets/upgrades/lethal-precision.png",
    maxLevel: 5,
    baseCost: 200,
    costMultiplier: 1.7,
    x: -120, y: 240,
    requires: [{ id: "dmg_base", level: 1 }],
    apply: (player, level) => {
      player.critChance += level * 0.05;
    }
  },
  crit_dmg: {
    id: "crit_dmg",
    name: "Núcleos de Plasma",
    description: "Aumenta el multiplicador de daño de los impactos críticos.",
    icon: "assets/upgrades/devastating-impact.png",
    maxLevel: 5,
    baseCost: 350,
    costMultiplier: 1.9,
    x: 0, y: 360,
    requires: [{ id: "crit_chance", level: 1 }],
    apply: (player, level) => {
      player.critDamage += level * 0.15;
    }
  },

  // ================= UTILITY BRANCH (RIGHT) ================= //
  xp_base: {
    id: "xp_base",
    name: "Optimización de Datos",
    description: "Aumenta la experiencia conseguida en un 5% por nivel.",
    icon: "assets/upgrades/double-experience.png",
    maxLevel: 10,
    baseCost: 50,
    costMultiplier: 1.5,
    x: 120, y: 0,
    requires: [{ id: "root_core", level: 1 }],
    apply: (player, level) => {
      player.xpMultiplier = (player.xpMultiplier || 1.0) + (level * 0.05);
    }
  },
  speed_base: {
    id: "speed_base",
    name: "Micro-Propulsores",
    description: "Aumenta la velocidad de movimiento en un 5% por nivel.",
    icon: "assets/upgrades/vector-thrusters.png",
    maxLevel: 5,
    baseCost: 100,
    costMultiplier: 1.6,
    x: 240, y: -120,
    requires: [{ id: "xp_base", level: 1 }],
    apply: (player, level) => {
      player.speedMult = (player.speedMult || 1.0) + (level * 0.05);
    }
  },
  magnet_base: {
    id: "magnet_base",
    name: "Módulo Electromagnético",
    description: "Aumenta el tamaño del área de recolección en un 10% por nivel.",
    icon: "assets/upgrades/magnetic-attraction.png",
    maxLevel: 3,
    baseCost: 150,
    costMultiplier: 1.8,
    x: 240, y: 120,
    requires: [{ id: "xp_base", level: 5 }],
    apply: (player, level) => {
      player.pickupRadiusMult = (player.pickupRadiusMult || 1.0) + (level * 0.10);
    }
  },
  double_drop: {
    id: "double_drop",
    name: "Cosecha Duplicada",
    description: "10% de probabilidad por nivel de que los enemigos suelten el doble de experiencia al morir.",
    icon: "assets/upgrades/data-extraction.png",
    maxLevel: 10,
    baseCost: 800,
    costMultiplier: 2.0,
    x: 360, y: 240,
    requires: [{ id: "magnet_base", level: 3 }],
    apply: (player, level) => {
      player.doubleGemChance = (player.doubleGemChance || 0) + (level * 0.10);
    }
  },
  instant_gem: {
    id: "instant_gem",
    name: "Singularidad Cuántica",
    description: "10% de probabilidad por nivel de que la gema de experiencia llegue a ti instantáneamente.",
    icon: "assets/upgrades/quantum-singularity.png",
    maxLevel: 10,
    baseCost: 800,
    costMultiplier: 2.0,
    x: 360, y: 0,
    requires: [{ id: "magnet_base", level: 3 }],
    apply: (player, level) => {
      player.autoMagnetChance = (player.autoMagnetChance || 0) + (level * 0.10);
    }
  },

  // ================= ECONOMY BRANCH (UP) ================= //
  chip_drop: {
    id: "chip_drop",
    name: "Extracción Criptográfica",
    description: "Aumenta la probabilidad de que los enemigos básicos suelten Chips en un 2% por nivel.",
    icon: "assets/upgrades/core-hack.png",
    maxLevel: 20,
    baseCost: 150,
    costMultiplier: 1.25,
    x: 0, y: -120,
    requires: [{ id: "root_core", level: 1 }],
    apply: (player, level) => {
      player.chipDropChance = (player.chipDropChance || 0) + (level * 0.02);
    }
  },
  chip_double: {
    id: "chip_double",
    name: "Procesamiento Paralelo",
    description: "5% de probabilidad por nivel de recibir el doble de Chips cuando un enemigo los suelta.",
    icon: "assets/upgrades/quantum-amplifier.png",
    maxLevel: 5,
    baseCost: 600,
    costMultiplier: 1.8,
    x: -120, y: -240,
    requires: [{ id: "chip_drop", level: 5 }],
    apply: (player, level) => {
      player.doubleChipChance = (player.doubleChipChance || 0) + (level * 0.05);
    }
  },
  chip_bonus: {
    id: "chip_bonus",
    name: "Interés Compuesto",
    description: "Otorga un bono del +5% de Chips adicionales al finalizar la partida por nivel.",
    icon: "assets/upgrades/field-power.png",
    maxLevel: 20,
    baseCost: 50,
    costMultiplier: 1.2,
    x: 120, y: -240,
    requires: [{ id: "chip_drop", level: 1 }],
    apply: (player, level) => {
      player.endgameChipBonus = (player.endgameChipBonus || 0) + (level * 0.05);
    }
  },
  // --- NEW UPGRADES (HEALTH) ---
  casco_electrificado: {
    id: "casco_electrificado",
    icon: "assets/upgrades/shield-deflect.png",
    name: "Casco Electrificado",
    description: "Devuelve un 10% del daño recibido a los enemigos por nivel.",
    maxLevel: 5,
    baseCost: 250,
    costMultiplier: 1.6,
    x: -360, y: -240,
    requires: [{ id: "defense_base", level: 3 }],
    apply: (player, level) => {
      player.thorns = (player.thorns || 0) + (level * 0.1);
    }
  },
  protocolo_lazaro: {
    id: "protocolo_lazaro",
    icon: "assets/upgrades/advanced-medkit.png",
    name: "Protocolo Lázaro",
    description: "Otorgar +1 vida extra por partida (revives con 50% de vida).",
    maxLevel: 1,
    baseCost: 3500,
    costMultiplier: 1.0,
    x: -480, y: -120,
    requires: [{ id: "regen_base", level: 3 }],
    apply: (player, level) => {
      player.extraRevives = (player.extraRevives || 0) + level;
    }
  },

  // --- NEW UPGRADES (DAMAGE) ---
  refrigeracion_liquida: {
    id: "refrigeracion_liquida",
    icon: "assets/upgrades/laser-cannon-cooldown.png",
    name: "Refrigeración Líquida",
    description: "Reduce el tiempo de recarga (cooldown) de todas las armas en un 2% por nivel.",
    maxLevel: 10,
    baseCost: 180,
    costMultiplier: 1.5,
    x: 120, y: 240,
    requires: [{ id: "dmg_base", level: 3 }],
    apply: (player, level) => {
      player.cooldownReduction = (player.cooldownReduction || 0) + (level * 0.02);
    }
  },
  calibracion_anti_titanes: {
    id: "calibracion_anti_titanes",
    icon: "assets/upgrades/laser-cannon-deep-corrosion.png",
    name: "Calibración Anti-Titanes",
    description: "Aumenta el daño infligido a los Jefes en un 10% por nivel.",
    maxLevel: 5,
    baseCost: 300,
    costMultiplier: 1.7,
    x: 120, y: 480,
    requires: [{ id: "crit_dmg", level: 3 }],
    apply: (player, level) => {
      player.bossDamageMult = (player.bossDamageMult || 0) + (level * 0.10);
    }
  },

  // --- NEW UPGRADES (UTILITY) ---
  sobremarcha_propulsion: {
    id: "sobremarcha_propulsion",
    icon: "assets/upgrades/temporal-phase.png",
    name: "Sobremarcha de Propulsión",
    description: "Reduce el tiempo de recarga de la habilidad de Esquivar (Dash) en un 5% por nivel.",
    maxLevel: 5,
    baseCost: 150,
    costMultiplier: 1.5,
    x: 360, y: -240,
    requires: [{ id: "speed_base", level: 2 }],
    apply: (player, level) => {
      player.dashCooldownReduction = (player.dashCooldownReduction || 0) + (level * 0.05);
    }
  },
  sintesis_biologica: {
    id: "sintesis_biologica",
    icon: "assets/upgrades/repairing-nanobots.png",
    name: "Síntesis Biológica",
    description: "Recuperas 2 puntos de salud cada vez que subes de nivel durante la partida.",
    maxLevel: 10,
    baseCost: 120,
    costMultiplier: 1.4,
    x: 480, y: -120,
    requires: [{ id: "sobremarcha_propulsion", level: 1 }],
    apply: (player, level) => {
      player.healOnLevelUp = (player.healOnLevelUp || 0) + (level * 2);
    }
  },
  inyeccion_codigo: {
    id: "inyeccion_codigo",
    icon: "assets/upgrades/core-hack.png",
    name: "Inyección de Código",
    description: "Empiezas cada partida con dados de Reroll (Redirección) extra para las opciones de mejora.",
    maxLevel: 3,
    baseCost: 500,
    costMultiplier: 2.0,
    x: 480, y: -360,
    requires: [{ id: "sobremarcha_propulsion", level: 3 }],
    apply: (player, level) => {
      player.baseRerolls = (player.baseRerolls || 0) + level;
    }
  },

  // --- NEW UPGRADES (ECONOMY) ---
  caza_recompensas: {
    id: "caza_recompensas",
    icon: "assets/upgrades/lure-beacon.png",
    name: "Caza-Recompensas",
    description: "Los Jefes y Mini-Jefes soltarán un botín garantizado de +10 Chips extra por nivel al morir.",
    maxLevel: 5,
    baseCost: 200,
    costMultiplier: 1.5,
    x: -240, y: -360,
    requires: [{ id: "chip_double", level: 2 }],
    apply: (player, level) => {
      player.bossChipBounty = (player.bossChipBounty || 0) + (level * 10);
    }
  },
  secuencia_arranque: {
    id: "secuencia_arranque",
    icon: "assets/upgrades/plasma-optimization.png",
    name: "Secuencia de Arranque",
    description: "Empiezas cada partida con 20 puntos de XP garantizados por nivel.",
    maxLevel: 5,
    baseCost: 150,
    costMultiplier: 1.6,
    x: 240, y: -360,
    requires: [{ id: "chip_bonus", level: 3 }],
    apply: (player, level) => {
      player.startXP = (player.startXP || 0) + (level * 20);
    }
  },
  soborno_sistema: {
    id: "soborno_sistema",
    icon: "assets/upgrades/data-extraction.png",
    name: "Soborno al Sistema",
    description: "Reduce el coste en Chips de TODAS las mejoras del Laboratorio en un 1% por nivel.",
    maxLevel: 10,
    baseCost: 500,
    costMultiplier: 1.4,
    x: 0, y: -360,
    requires: [{ id: "chip_bonus", level: 5 }],
    apply: (player, level) => {
      player.labDiscount = (player.labDiscount || 0) + (level * 0.01);
    }
  }
};

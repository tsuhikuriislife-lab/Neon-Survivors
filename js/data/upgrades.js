import { state } from "../engine/gameState.js";
import { updateAimJoystickUI } from "../engine/Input.js";
export const upgradeDatabase = [
  {
    id: 'blaster_count',
    rarity: 'uncommon',
    name: 'Multi-Laser Fire Rate',
    icon: '🔫',
    desc: '+1 Focused projectile per shot to the same target (Max. 4).',
    isAvailable: (p) => p.weapons.blaster.projectileCount < 5,
    apply: (p) => { p.weapons.blaster.projectileCount += 1; }
  },
  {
    id: 'blaster_rate',
    rarity: 'common',
    name: 'Fire Overload',
    icon: '⚡',
    desc: '+25% Neon Cannon reload speed (Max. 4).',
    isAvailable: (p) => (p.blasterRateUpgrades || 0) < 4,
    apply: (p) => { 
      p.weapons.blaster.cooldown = Math.max(8, p.weapons.blaster.cooldown * 0.75); 
      p.blasterRateUpgrades = (p.blasterRateUpgrades || 0) + 1;
    }
  },
  {
    id: 'hp_regen',
    rarity: 'legendary',
    name: 'Nanobots Reparadores',
    icon: '💉',
    desc: '+1.0 Regeneracion de HP por segundo. (Max. 3)',
    isAvailable: (p) => p.regenUpgradesCount  === 0,
    apply: (p) => { 
        p.hpRegen += 1.0; 
        p.regenUpgradesCount = (p.regenUpgradesCount || 0) + 1;
    }
  },
  {
    id: 'iframe_extend',
    rarity: 'rare',
    name: 'Blindaje Cuantico',
    icon: '🛡',
    desc: '+0.25s Duracion de inmunidad tras recibir impacto (Max. 3).',
    isAvailable: (p) => p.iFrameUpgradesCount < 3,
    apply: (p) => { 
      p.invulnerabilityMaxTime += 0.25; 
      p.iFrameUpgradesCount++;
    }
  },
  {
    id: 'speed_boost',
    rarity: 'uncommon',
    name: 'Propulsores Vectoriales',
    icon: '👟',
    desc: '+20% Velocidad de movimiento del nucleo (Max. 4).',
    isAvailable: (p) => (p.speedUpgradesCount || 0) < 4,
    apply: (p) => { 
        p.baseSpeed *= 1.20; 
        p.speedUpgradesCount = (p.speedUpgradesCount || 0) + 1;
    }
  },
  {
    id: 'magnet_boost',
    rarity: 'rare',
    name: 'Atraccion Magnetica',
    icon: '🧲',
    desc: '+50% Radio de recoleccion de energia XP (Max. 4).',
    isAvailable: (p) => (p.magnetUpgrades || 0) < 4,
    apply: (p) => { 
      p.pickupRadius *= 1.5; 
      p.magnetUpgrades = (p.magnetUpgrades || 0) + 1;
    }
  },
  {
    id: 'damage_boost',
    rarity: 'common',
    name: 'Amplificador Cuantico',
    icon: '⚔',
    desc: '+25% Dano general de todas las armas (Max. 5).',
    isAvailable: (p) => (p.damageUpgradesCount || 0) < 5,
    apply: (p) => { 
        p.damageMult += 0.25; 
        p.damageUpgradesCount = (p.damageUpgradesCount || 0) + 1;
    }
  },
  {
    id: 'repair_hull',
    rarity: 'uncommon',
    name: 'Refuerzo de Casco',
    icon: '❤',
    desc: 'Restores 50 HP y aumenta la salud maxima en +25 (Max. 5).',
    isAvailable: (p) => (p.hullUpgradesCount || 0) < 5,
    apply: (p) => { 
      p.maxHp += 25; 
      p.hp = Math.min(p.maxHp, p.hp + 50);
      p.hullUpgradesCount = (p.hullUpgradesCount || 0) + 1;
    }
  },
  {
    id: 'nova_unlock',
    rarity: 'common',
    name: 'Desbloqueo Nova',
    icon: '🌀',
    desc: 'Dispara periodicamente una salva radial de 8 proyectiles.',
    isAvailable: (p) => p.weapons.nova.level === 0,
    apply: (p) => {
      p.weapons.nova.level = 1;
      p.weapons.nova.count = 8;
    }
  },
  {
    id: 'nova_up',
    rarity: 'uncommon',
    name: '+ Proyectiles Nova',
    icon: '✨',
    desc: '+2 Proyectiles a la salva Nova (Max. 3).',
    isAvailable: (p) => p.weapons.nova.level > 0 && p.weapons.nova.level <= 3,
    apply: (p) => {
      p.weapons.nova.level++;
      p.weapons.nova.count += 2;
    }
  },
  {
    id: 'nova_spiral',
    rarity: 'legendary',
    name: 'Vortice Angular',
    icon: '🌪',
    desc: 'Los proyectiles Nova conservan su expansion pero giran en espiral continua.',
    isAvailable: (p) => p.weapons.nova.level > 0 && !p.weapons.nova.spiral,
    apply: (p) => {
      p.weapons.nova.spiral = true;
    }
  },
  {
    id: 'orbital_unlock',
    rarity: 'common',
    name: 'Escudo Orbital Plasma',
    icon: '🔮',
    desc: 'Desbloquea 2 orbes rotatorios que causan dano al contacto.',
    isAvailable: (p) => p.weapons.orbitals.level === 0,
    apply: (p) => { 
      p.weapons.orbitals.level = 1;
      p.weapons.orbitals.count = 2;
    }
  },
  {
    id: 'orbital_count',
    rarity: 'uncommon',
    name: '+ Satelites',
    icon: '🪐',
    desc: 'Anade +2 satelites al escudo orbital (Max. 2).',
    isAvailable: (p) => p.weapons.orbitals.level > 0 && (p.weapons.orbitals.countUpgrades || 0) < 2,
    apply: (p) => {
      p.weapons.orbitals.count += 2;
      p.weapons.orbitals.countUpgrades = (p.weapons.orbitals.countUpgrades || 0) + 1;
    }
  },
  {
    id: 'orbital_size',
    rarity: 'rare',
    name: 'Expansion Orbital',
    icon: '🌌',
    desc: '+20% Tamano de los satelites (Max. 3).',
    isAvailable: (p) => p.weapons.orbitals.level > 0 && (p.weapons.orbitals.sizeUpgrades || 0) < 3,
    apply: (p) => {
      p.weapons.orbitals.size = (p.weapons.orbitals.size || 8) * 1.2;
      p.weapons.orbitals.sizeUpgrades = (p.weapons.orbitals.sizeUpgrades || 0) + 1;
    }
  },
  {
    id: 'orbital_speed',
    rarity: 'rare',
    name: 'Giro Acelerado',
    icon: '🔄',
    desc: '+15% Velocidad de rotacion orbital (Max. 3).',
    isAvailable: (p) => p.weapons.orbitals.level > 0 && (p.weapons.orbitals.speedUpgrades || 0) < 3,
    apply: (p) => {
      p.weapons.orbitals.speed *= 1.15;
      p.weapons.orbitals.speedUpgrades = (p.weapons.orbitals.speedUpgrades || 0) + 1;
    }
  },
  {
    id: 'shockwave_unlock',
    rarity: 'common',
    name: 'Pulso Radial Sismico',
    icon: '💥',
    desc: 'Desbloquea una onda expansiva periodica.',
    isAvailable: (p) => p.weapons.shockwave.level === 0,
    apply: (p) => { 
      p.weapons.shockwave.level = 1;
    }
  },
  {
    id: 'shockwave_range',
    rarity: 'uncommon',
    name: 'Amplitud Sismica',
    icon: '🌊',
    desc: '+30% Rango de la onda expansiva (Max. 3).',
    isAvailable: (p) => p.weapons.shockwave.level > 0 && (p.weapons.shockwave.rangeUpgrades || 0) < 3,
    apply: (p) => {
      p.weapons.shockwave.radius *= 1.30;
      p.weapons.shockwave.rangeUpgrades = (p.weapons.shockwave.rangeUpgrades || 0) + 1;
    }
  },
  {
    id: 'shockwave_rate',
    rarity: 'rare',
    name: 'Frecuencia Sismica',
    icon: '⏱',
    desc: '+25% Velocidad de disparo de la onda expansiva (Max. 4).',
    isAvailable: (p) => p.weapons.shockwave.level > 0 && (p.weapons.shockwave.rateUpgrades || 0) < 4,
    apply: (p) => {
      p.weapons.shockwave.cooldown = Math.max(30, p.weapons.shockwave.cooldown * 0.75); 
      p.weapons.shockwave.rateUpgrades = (p.weapons.shockwave.rateUpgrades || 0) + 1;
    }
  },
  {
    id: 'missiles_unlock',
    rarity: 'common',
    name: 'Bateria de Misiles',
    icon: '🚀',
    desc: 'Lanza 6 misiles en direcciones aleatorias con rastreo leve y dano en area.',
    isAvailable: (p) => p.weapons.missiles.level === 0,
    apply: (p) => {
      p.weapons.missiles.level = 1;
    }
  },
  {
    id: 'missiles_count',
    rarity: 'uncommon',
    name: '+ Misiles',
    icon: '🎆',
    desc: '+2 Misiles por salva (Max. 3).',
    isAvailable: (p) => p.weapons.missiles.level > 0 && (p.weapons.missiles.countUpgrades || 0) < 3,
    apply: (p) => {
      p.weapons.missiles.count += 2;
      p.weapons.missiles.countUpgrades = (p.weapons.missiles.countUpgrades || 0) + 1;
    }
  },
  {
    id: 'missiles_speed',
    rarity: 'rare',
    name: 'Propulsion de Misiles',
    icon: '☄',
    desc: '+20% Velocidad de misiles (Max. 4).',
    isAvailable: (p) => p.weapons.missiles.level > 0 && (p.weapons.missiles.speedUpgrades || 0) < 4,
    apply: (p) => {
      p.weapons.missiles.speed *= 1.20;
      p.weapons.missiles.speedUpgrades = (p.weapons.missiles.speedUpgrades || 0) + 1;
    }
  },
  {
    id: 'missiles_homing',
    rarity: 'legendary',
    name: 'Rastreo Avanzado',
    icon: '📡',
    desc: 'Mejora drasticamente el rastreo de los misiles (Unico).',
    isAvailable: (p) => p.weapons.missiles.level > 0 && !p.weapons.missiles.homingUpgrade,
    apply: (p) => {
      p.weapons.missiles.homing += 0.08;
      p.weapons.missiles.homingUpgrade = true;
    }
  },
  {
    id: 'missiles_aoe',
    rarity: 'uncommon',
    name: 'Carga Explosiva',
    icon: '💣',
    desc: '+30% Area de dano de los misiles (Max. 3).',
    isAvailable: (p) => p.weapons.missiles.level > 0 && (p.weapons.missiles.aoeUpgrades || 0) < 3,
    apply: (p) => {
      p.weapons.missiles.aoe *= 1.30;
      p.weapons.missiles.aoeUpgrades = (p.weapons.missiles.aoeUpgrades || 0) + 1;
    }
  },
  {
    id: 'double_gem',
    rarity: 'legendary',
    name: 'Experiencia Duplicada',
    icon: '💎',
    desc: '5% de probabilidad de que los enemigos suelten 2 orbes de experiencia (Max. 2).',
    isAvailable: (p) => (p.doubleGemUpgradesCount || 0) < 2,
    apply: (p) => {
      p.doubleGemChance = (p.doubleGemChance || 0) + 0.05;
      p.doubleGemUpgradesCount = (p.doubleGemUpgradesCount || 0) + 1;
    }
  },

  {
    id: 'laser_unlock',
    rarity: 'common',
    name: 'Canon Laser',
    icon: '🔦',
    desc: 'Un canon de apuntado manual que perfora infinitamente.',
    isAvailable: (p) => p.weapons.laserCannon.level === 0,
    apply: (p) => { 
      p.weapons.laserCannon.level = 1; 
      updateAimJoystickUI();
    }
  },
  {
    id: 'laser_charge',
    rarity: 'common',
    name: 'Carga Rapida',
    icon: '🔋',
    desc: '+15% Velocidad de carga del Canon Laser (Max. 4).',
    isAvailable: (p) => p.weapons.laserCannon.level > 0 && (p.weapons.laserCannon.chargeUpgrades || 0) < 4,
    apply: (p) => {
      p.weapons.laserCannon.chargeSpeedMult *= 1.15;
      p.weapons.laserCannon.chargeUpgrades = (p.weapons.laserCannon.chargeUpgrades || 0) + 1;
    }
  },
  {
    id: 'laser_damage',
    rarity: 'common',
    name: 'Intensidad Laser',
    icon: '🔥',
    desc: '+25% Dano del Canon Laser (Max. 3).',
    isAvailable: (p) => p.weapons.laserCannon.level > 0 && (p.weapons.laserCannon.dmgUpgrades || 0) < 3,
    apply: (p) => {
      p.weapons.laserCannon.damageMult += 0.25;
      p.weapons.laserCannon.dmgUpgrades = (p.weapons.laserCannon.dmgUpgrades || 0) + 1;
    }
  },
  {
    id: 'laser_width',
    rarity: 'uncommon',
    name: 'Haz Expandido',
    icon: '📏',
    desc: '+30% Anchura del Canon Laser (Max. 3).',
    isAvailable: (p) => p.weapons.laserCannon.level > 0 && (p.weapons.laserCannon.widthUpgrades || 0) < 3,
    apply: (p) => {
      p.weapons.laserCannon.widthMult += 0.30;
      p.weapons.laserCannon.widthUpgrades = (p.weapons.laserCannon.widthUpgrades || 0) + 1;
    }
  },
  {
    id: 'laser_lifespan',
    rarity: 'uncommon',
    name: 'Persistencia Luminica',
    icon: '⏱',
    desc: '+0.1s de vida del Canon Laser (Max. 5).',
    isAvailable: (p) => p.weapons.laserCannon.level > 0 && (p.weapons.laserCannon.lifeUpgrades || 0) < 5,
    apply: (p) => {
      p.weapons.laserCannon.duration += 6;
      p.weapons.laserCannon.lifeUpgrades = (p.weapons.laserCannon.lifeUpgrades || 0) + 1;
    }
  },
  {
    id: 'laser_sublasers',
    rarity: 'rare',
    name: 'Laseres Auxiliares',
    icon: '🔱',
    desc: 'Dispara 2 sub-laseres en diagonal al 25% de poder (Unico).',
    isAvailable: (p) => p.weapons.laserCannon.level > 0 && !p.weapons.laserCannon.subLasers,
    apply: (p) => {
      p.weapons.laserCannon.subLasers = true;
    }
  },
  {
    id: 'laser_dot',
    rarity: 'rare',
    name: 'Laser Corrosivo',
    icon: '☣',
    desc: 'Los enemigos alcanzados reciben dano por tiempo (Unico).',
    isAvailable: (p) => p.weapons.laserCannon.level > 0 && !p.weapons.laserCannon.dot,
    apply: (p) => {
      p.weapons.laserCannon.dot = true;
    }
  },
  {
    id: 'laser_dot_up',
    rarity: 'rare',
    name: 'Corrosion Profunda',
    icon: '☢',
    desc: '+5 Dano de corrosion, +0.5s duracion (Max. 4).',
    isAvailable: (p) => p.weapons.laserCannon.dot && (p.weapons.laserCannon.dotUpgrades || 0) < 4,
    apply: (p) => {
      p.weapons.laserCannon.dotDamage += 5;
      p.weapons.laserCannon.dotDuration += 0.5;
      p.weapons.laserCannon.dotUpgrades = (p.weapons.laserCannon.dotUpgrades || 0) + 1;
    }
  },
  {
    id: 'laser_tick',
    rarity: 'legendary',
    name: 'Haz Continuo',
    icon: '⚡',
    desc: 'El laser inflige dano constantemente mientras permanece.',
    isAvailable: (p) => p.weapons.laserCannon.level > 0 && !p.weapons.laserCannon.tickDamage,
    apply: (p) => {
      p.weapons.laserCannon.tickDamage = true;
    }
  },

  // CAMPO DE FUERZA (ESCUDO)
  {
    id: 'shield_unlock',
    rarity: 'common',
    name: 'Campo de Fuerza',
    icon: '🛡',
    desc: 'Desbloquea un escudo protector que absorbe disparos y contacto enemigo.',
    isAvailable: (p) => !p.shield || !p.shield.unlocked,
    apply: (p) => {
      p.unlockShield();
    }
  },
  {
    id: 'shield_damage_boost',
    rarity: 'common',
    name: 'Potencia de Escudo',
    icon: '⚔',
    desc: '+5% de dano general mientras el escudo este activo (Max. 5).',
    isAvailable: (p) => p.shield && p.shield.unlocked && (p.shield.damageBonusUpgrades || 0) < 5,
    apply: (p) => {
      p.shield.damageBonusUpgrades = (p.shield.damageBonusUpgrades || 0) + 1;
    }
  },
  {
    id: 'shield_rate_boost',
    rarity: 'common',
    name: 'Cadencia Fortificada',
    icon: '💨',
    desc: '+5% de velocidad de disparo de armas mientras el escudo este activo (Max. 5).',
    isAvailable: (p) => p.shield && p.shield.unlocked && (p.shield.rateBonusUpgrades || 0) < 5,
    apply: (p) => {
      p.shield.rateBonusUpgrades = (p.shield.rateBonusUpgrades || 0) + 1;
    }
  },
  {
    id: 'shield_recharge_speed',
    rarity: 'uncommon',
    name: 'Recarga de Escudo Acelerada',
    icon: '🔋',
    desc: '+15% de velocidad de regeneracion de escudo (Max. 2).',
    isAvailable: (p) => p.shield && p.shield.unlocked && (p.shield.rechargeUpgrades || 0) < 2,
    apply: (p) => {
      p.shield.rechargeSpeedMult *= 1.15;
      p.shield.rechargeUpgrades = (p.shield.rechargeUpgrades || 0) + 1;
    }
  },
  {
    id: 'shield_explosion',
    rarity: 'rare',
    name: 'Detonacion de Escudo',
    icon: '💥',
    desc: 'Al romper el escudo, este explota infligiendo dano en gran area (Unico).',
    isAvailable: (p) => p.shield && p.shield.unlocked && !p.shield.explodeOnBreak,
    apply: (p) => {
      p.shield.explodeOnBreak = true;
    }
  },
  {
    id: 'shield_save_chance',
    rarity: 'rare',
    name: 'Deflexion Cuantica',
    icon: '✨',
    desc: '5% de probabilidad de no romper el escudo al recibir dano (Max. 2).',
    isAvailable: (p) => p.shield && p.shield.unlocked && (p.shield.saveChanceUpgrades || 0) < 2,
    apply: (p) => {
      p.shield.saveChargeChance = (p.shield.saveChargeChance || 0) + 0.05;
      p.shield.saveChanceUpgrades = (p.shield.saveChanceUpgrades || 0) + 1;
    }
  },
  {
    id: 'shield_extra_charge',
    rarity: 'legendary',
    name: 'Bateria de Campo Extra',
    icon: '💠',
    desc: 'Aumenta las cargas del escudo en +1 (Max. 2).',
    isAvailable: (p) => p.shield && p.shield.unlocked && (p.shield.extraChargesUpgrades || 0) < 2,
    apply: (p) => {
      p.shield.maxCharges += 1;
      p.shield.charges += 1;
      p.shield.extraChargesUpgrades = (p.shield.extraChargesUpgrades || 0) + 1;
    }
  },

  // NUEVAS MEJORAS INFINITAS
  {
    id: 'damage_small',
    isInfinite: true,
    rarity: 'common',
    name: 'Ajuste de Disparo',
    icon: '🔧',
    desc: '+5% Dano general.',
    isAvailable: (p) => (p.damageUpgradesCount || 0) >= 5, // Only if max dmg upgrades reached
    apply: (p) => { p.damageMult += 0.05; }
  },
  {
    id: 'heal_small',
    isInfinite: true,
    rarity: 'common',
    name: 'Reparacion de Emergencia',
    icon: '🩹',
    desc: 'Restores un 10% de tu salud maxima.',
    isAvailable: (p) => p.hp < p.maxHp,
    apply: (p) => { p.hp = Math.min(p.maxHp, p.hp + (p.maxHp * 0.10)); }
  },
  {
    id: 'crit_chance',
    isInfinite: true,
    rarity: 'common',
    name: 'Precision Letal',
    icon: '🎯',
    desc: '+5% Probabilidad de Golpe Critico.',
    apply: (p) => { p.critChance = (p.critChance || 0) + 0.05; }
  },
  {
    id: 'damage_med',
    isInfinite: true,
    rarity: 'uncommon',
    name: 'Optimizacion de Plasma',
    icon: '🔋',
    desc: '+10% Dano general.',
    isAvailable: (p) => (p.damageUpgradesCount || 0) >= 5, // Only if max dmg upgrades reached
    apply: (p) => { p.damageMult += 0.10; }
  },
  {
    id: 'heal_med',
    isInfinite: true,
    rarity: 'uncommon',
    name: 'Kit Medico Avanzado',
    icon: '💊',
    desc: 'Restores un 25% de tu salud maxima.',
    isAvailable: (p) => p.hp < p.maxHp,
    apply: (p) => { p.hp = Math.min(p.maxHp, p.hp + (p.maxHp * 0.25)); }
  },
  {
    id: 'xp_boost',
    isInfinite: true,
    rarity: 'rare',
    name: 'Extraccion de Datos',
    icon: '💾',
    desc: '+5% Ganancia de experiencia.',
    isAvailable: (p) => p.level >= 40,
    apply: (p) => { p.xpMultiplier = (p.xpMultiplier || 1.0) + 0.05; }
  },
  {
    id: 'crit_damage',
    isInfinite: true,
    rarity: 'rare',
    name: 'Impacto Devastador',
    icon: '💥',
    desc: '+10% Critical Damage.',
    apply: (p) => { p.critDamage = (p.critDamage || 1.5) + 0.10; }
  },
  {
    id: 'spawn_more_xp_less',
    isInfinite: true,
    rarity: 'rare',
    name: 'Senal de Atraccion',
    icon: '📡',
    desc: '+10% Enemigos, pero -5% Experiencia.',
    apply: (p) => { 
        state.spawnRateMultiplier = (state.spawnRateMultiplier || 1.0) + 0.10;
        p.xpMultiplier = (p.xpMultiplier || 1.0) - 0.05;
    }
  },
  {
    id: 'spawn_less_xp_more',
    isInfinite: true,
    rarity: 'rare',
    name: 'Camuflaje Activo',
    icon: '👻',
    desc: '-5% Enemigos, pero +10% Experiencia.',
    apply: (p) => { 
        state.spawnRateMultiplier = (state.spawnRateMultiplier || 1.0) - 0.05;
        p.xpMultiplier = (p.xpMultiplier || 1.0) + 0.10;
    }
  },
  {
    id: 'regen_small',
    isInfinite: true,
    rarity: 'legendary',
    name: 'Passive Regeneration',
    icon: '🌱',
    desc: '+0.4 Regeneracion de HP por segundo.',
    apply: (p) => { p.hpRegen += 0.4; }
  },
  {
    id: 'boss_hp_cut',
    isInfinite: true,
    rarity: 'legendary',
    name: 'Hackeo de Nucleo',
    icon: '💻',
    desc: 'Reduce a la mitad la vida actual de todos los jefes activos.',
    isAvailable: (p) => state.bosses.length > 0,
    apply: (p) => {
        if (state.bosses.length > 0) {
            state.bosses.forEach(b => {
                b.getTargetables().forEach(t => {
                    const target = t.parent || t;
                    target.hp = Math.floor(target.hp / 2);
                    if (state.floatingTextPool) {
                        state.floatingTextPool.acquire(target.x, target.y - 40, "HP HALVED!", "#ffaa00", 20);
                    }
                });
            });
        }
    }
  },
  {
    id: 'iframe_small',
    isInfinite: true,
    rarity: 'legendary',
    name: 'Fase Temporal',
    icon: '⏳',
    desc: '+0.1s de Inmunidad tras recibir dano.',
    apply: (p) => { p.invulnerabilityMaxTime += 0.1; }
  }

];

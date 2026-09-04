import { state } from "../engine/gameState.js";
import { updateAimJoystickUI } from "../engine/Input.js";
export const upgradeDatabase = [
  {
    id: 'blaster_count',
    rarity: 'uncommon',
    name: 'Multi-Laser Fire Rate',
    icon: '<img src="assets/upgrades/neon-cannon-projectile.png" alt="icon">',
    desc: '+1 Neon cannon projectile per shot.',
    isAvailable: (p) => p.weapons.blaster.projectileCount < 5,
    apply: (p) => { p.weapons.blaster.projectileCount += 1; }
  },
  {
    id: 'blaster_rate',
    rarity: 'common',
    name: 'Fire Overload',
    icon: '<img src="assets/upgrades/neon-cannon-cooldown.png" alt="icon">',
    desc: '+25% Neon Cannon reload speed.',
    isAvailable: (p) => (p.blasterRateUpgrades || 0) < 4,
    apply: (p) => { 
      p.weapons.blaster.cooldown = Math.max(8, p.weapons.blaster.cooldown * 0.75); 
      p.blasterRateUpgrades = (p.blasterRateUpgrades || 0) + 1;
    }
  },
  {
    id: 'hp_regen',
    rarity: 'legendary',
    name: 'Repairing Nanobots',
    icon: '<img src="assets/upgrades/repairing-nanobots.png" alt="icon">',
    desc: '+1.0 HP/s regen.',
    isAvailable: (p) => p.regenUpgradesCount  === 0,
    apply: (p) => { 
        p.hpRegen += 1.0; 
        p.regenUpgradesCount = (p.regenUpgradesCount || 0) + 1;
    }
  },
  {
    id: 'iframe_extend',
    rarity: 'rare',
    name: 'Timewarping Shield',
    icon: '<img src="assets/upgrades/timewarping-shield2.png" alt="icon">',
    desc: '+0.25s Invulnerability duration.',
    isAvailable: (p) => p.iFrameUpgradesCount < 3,
    apply: (p) => { 
      p.invulnerabilityMaxTime += 0.25; 
      p.iFrameUpgradesCount++;
    }
  },
  {
    id: 'speed_boost',
    rarity: 'uncommon',
    name: 'Vector Thrusters',
    icon: '<img src="assets/upgrades/vector-thrusters.png" alt="icon">',
    desc: '+20% Core movement speed (Max. 4).',
    isAvailable: (p) => (p.speedUpgradesCount || 0) < 4,
    apply: (p) => { 
        p.baseSpeed *= 1.20; 
        p.speedUpgradesCount = (p.speedUpgradesCount || 0) + 1;
    }
  },
  {
    id: 'magnet_boost',
    rarity: 'rare',
    name: 'Magnetic Attraction',
    icon: '<img src="assets/upgrades/magnetic-attraction.png" alt="icon">',
    desc: '+50% Pickup radius for XP energy (Max. 4).',
    isAvailable: (p) => (p.magnetUpgrades || 0) < 4,
    apply: (p) => { 
      p.pickupRadius *= 1.5; 
      p.magnetUpgrades = (p.magnetUpgrades || 0) + 1;
    }
  },
  {
    id: 'auto_magnet',
    rarity: 'legendary',
    name: 'Quantum Singularity',
    icon: '<img src="assets/upgrades/quantum-singularity.png" alt="icon">',
    desc: '10% chance for defeated enemies to drop an auto-magnetized XP gem (Max. 3).',
    isAvailable: (p) => (p.autoMagnetUpgrades || 0) < 3,
    apply: (p) => {
      p.autoMagnetChance = (p.autoMagnetChance || 0) + 0.10;
      p.autoMagnetUpgrades = (p.autoMagnetUpgrades || 0) + 1;
    }
  },
  {
    id: 'damage_boost',
    rarity: 'common',
    name: 'Quantum Amplifier',
    icon: '<img src="assets/upgrades/quantum-amplifier.png" alt="icon">',
    desc: '+25% General damage of all weapons (Max. 5).',
    isAvailable: (p) => (p.damageUpgradesCount || 0) < 5,
    apply: (p) => { 
        p.damageMult += 0.25; 
        p.damageUpgradesCount = (p.damageUpgradesCount || 0) + 1;
    }
  },
  {
    id: 'repair_hull',
    rarity: 'uncommon',
    name: 'Hull Reinforcement',
    icon: '<img src="assets/upgrades/hull-reinforcement.png" alt="icon">',
    desc: 'Restores 50 HP and increases maximum health by +25 (Max. 5).',
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
    name: 'Nova Discharge',
    icon: '<img src="assets/upgrades/nova-discharge.png" alt="icon">',
    desc: 'Periodically fires a radial volley of 8 projectiles.',
    isAvailable: (p) => p.weapons.nova.level === 0,
    apply: (p) => {
      p.weapons.nova.level = 1;
      p.weapons.nova.count = 8;
    }
  },
  {
    id: 'nova_up',
    rarity: 'uncommon',
    name: '+ Nova Projectiles',
    icon: '<img src="assets/upgrades/nova-discharg-projectiles.png" alt="icon">',
    desc: '+2 Projectiles per Nova volley (Max. 3).',
    isAvailable: (p) => p.weapons.nova.level > 0 && p.weapons.nova.level <= 3,
    apply: (p) => {
      p.weapons.nova.level++;
      p.weapons.nova.count += 2;
    }
  },
  {
    id: 'nova_spiral',
    rarity: 'legendary',
    name: 'Angular Vortex',
    icon: '<img src="assets/upgrades/nova-discharge-spiral.png" alt="icon">',
    desc: 'Nova projectiles retain their expansion while spinning continuously in a spiral.',
    isAvailable: (p) => p.weapons.nova.level > 0 && !p.weapons.nova.spiral,
    apply: (p) => {
      p.weapons.nova.spiral = true;
    }
  },
  {
    id: 'orbital_unlock',
    rarity: 'common',
    name: 'Orbital Plasma Shield',
    icon: '<img src="assets/upgrades/orbital-plasma-shield.png" alt="icon">',
    desc: 'Unlocks 2 rotating orbs that deal contact damage.',
    isAvailable: (p) => p.weapons.orbitals.level === 0,
    apply: (p) => { 
      p.weapons.orbitals.level = 1;
      p.weapons.orbitals.count = 2;
    }
  },
  {
    id: 'orbital_count',
    rarity: 'uncommon',
    name: '+ Satellites',
    icon: '<img src="assets/upgrades/orbital-plasma-shield-ammount.png" alt="icon">',
    desc: 'Adds +2 satellites to the orbital shield (Max. 2).',
    isAvailable: (p) => p.weapons.orbitals.level > 0 && (p.weapons.orbitals.countUpgrades || 0) < 2,
    apply: (p) => {
      p.weapons.orbitals.count += 2;
      p.weapons.orbitals.countUpgrades = (p.weapons.orbitals.countUpgrades || 0) + 1;
    }
  },
  {
    id: 'orbital_size',
    rarity: 'rare',
    name: 'Orbital Expansion',
    icon: '<img src="assets/upgrades/orbital-plasma-shield-size.png" alt="icon">',
    desc: '+20% Satellite size (Max. 3).',
    isAvailable: (p) => p.weapons.orbitals.level > 0 && (p.weapons.orbitals.sizeUpgrades || 0) < 3,
    apply: (p) => {
      p.weapons.orbitals.size = (p.weapons.orbitals.size || 8) * 1.2;
      p.weapons.orbitals.sizeUpgrades = (p.weapons.orbitals.sizeUpgrades || 0) + 1;
    }
  },
  {
    id: 'orbital_speed',
    rarity: 'rare',
    name: 'Accelerated Spin',
    icon: '🔄',
    desc: '+15% Orbital rotation speed (Max. 3).',
    isAvailable: (p) => p.weapons.orbitals.level > 0 && (p.weapons.orbitals.speedUpgrades || 0) < 3,
    apply: (p) => {
      p.weapons.orbitals.speed *= 1.15;
      p.weapons.orbitals.speedUpgrades = (p.weapons.orbitals.speedUpgrades || 0) + 1;
    }
  },
  {
    id: 'shockwave_unlock',
    rarity: 'common',
    name: 'Seismic Radial Pulse',
    icon: '💥',
    desc: 'Unlocks a periodic shockwave pulse.',
    isAvailable: (p) => p.weapons.shockwave.level === 0,
    apply: (p) => { 
      p.weapons.shockwave.level = 1;
    }
  },
  {
    id: 'shockwave_range',
    rarity: 'uncommon',
    name: 'Seismic Amplitude',
    icon: '🌊',
    desc: '+30% Shockwave range (Max. 3).',
    isAvailable: (p) => p.weapons.shockwave.level > 0 && (p.weapons.shockwave.rangeUpgrades || 0) < 3,
    apply: (p) => {
      p.weapons.shockwave.radius *= 1.30;
      p.weapons.shockwave.rangeUpgrades = (p.weapons.shockwave.rangeUpgrades || 0) + 1;
    }
  },
  {
    id: 'shockwave_rate',
    rarity: 'rare',
    name: 'Seismic Frequency',
    icon: '⏱',
    desc: '+25% Shockwave fire rate (Max. 4).',
    isAvailable: (p) => p.weapons.shockwave.level > 0 && (p.weapons.shockwave.rateUpgrades || 0) < 4,
    apply: (p) => {
      p.weapons.shockwave.cooldown = Math.max(30, p.weapons.shockwave.cooldown * 0.75); 
      p.weapons.shockwave.rateUpgrades = (p.weapons.shockwave.rateUpgrades || 0) + 1;
    }
  },
  {
    id: 'missiles_unlock',
    rarity: 'common',
    name: 'Missile Battery',
    icon: '🚀',
    desc: 'Launches 6 missiles in random directions with light homing and AoE damage.',
    isAvailable: (p) => p.weapons.missiles.level === 0,
    apply: (p) => {
      p.weapons.missiles.level = 1;
    }
  },
  {
    id: 'missiles_count',
    rarity: 'uncommon',
    name: '+ Missiles',
    icon: '🎆',
    desc: '+2 Missiles per volley (Max. 3).',
    isAvailable: (p) => p.weapons.missiles.level > 0 && (p.weapons.missiles.countUpgrades || 0) < 3,
    apply: (p) => {
      p.weapons.missiles.count += 2;
      p.weapons.missiles.countUpgrades = (p.weapons.missiles.countUpgrades || 0) + 1;
    }
  },
  {
    id: 'missiles_speed',
    rarity: 'rare',
    name: 'Missile Propulsion',
    icon: '☄',
    desc: '+20% Missile speed (Max. 4).',
    isAvailable: (p) => p.weapons.missiles.level > 0 && (p.weapons.missiles.speedUpgrades || 0) < 4,
    apply: (p) => {
      p.weapons.missiles.speed *= 1.20;
      p.weapons.missiles.speedUpgrades = (p.weapons.missiles.speedUpgrades || 0) + 1;
    }
  },
  {
    id: 'missiles_homing',
    rarity: 'legendary',
    name: 'Advanced Tracking',
    icon: '📡',
    desc: 'Drastically improves missile tracking (Unique).',
    isAvailable: (p) => p.weapons.missiles.level > 0 && !p.weapons.missiles.homingUpgrade,
    apply: (p) => {
      p.weapons.missiles.homing += 0.08;
      p.weapons.missiles.homingUpgrade = true;
    }
  },
  {
    id: 'missiles_aoe',
    rarity: 'uncommon',
    name: 'Explosive Payload',
    icon: '💣',
    desc: '+30% Missile damage radius (Max. 3).',
    isAvailable: (p) => p.weapons.missiles.level > 0 && (p.weapons.missiles.aoeUpgrades || 0) < 3,
    apply: (p) => {
      p.weapons.missiles.aoe *= 1.30;
      p.weapons.missiles.aoeUpgrades = (p.weapons.missiles.aoeUpgrades || 0) + 1;
    }
  },
  {
    id: 'double_gem',
    rarity: 'legendary',
    name: 'Duplicate Experience',
    icon: '💎',
    desc: '5% chance for enemies to drop 2 experience gems (Max. 2).',
    isAvailable: (p) => (p.doubleGemUpgradesCount || 0) < 2,
    apply: (p) => {
      p.doubleGemChance = (p.doubleGemChance || 0) + 0.05;
      p.doubleGemUpgradesCount = (p.doubleGemUpgradesCount || 0) + 1;
    }
  },

  {
    id: 'laser_unlock',
    rarity: 'common',
    name: 'Laser Cannon',
    icon: '🔦',
    desc: 'A manually aimed cannon with infinite piercing.',
    isAvailable: (p) => p.weapons.laserCannon.level === 0,
    apply: (p) => { 
      p.weapons.laserCannon.level = 1; 
      updateAimJoystickUI();
    }
  },
  {
    id: 'laser_charge',
    rarity: 'common',
    name: 'Quick Charge',
    icon: '🔋',
    desc: '+15% Laser Cannon charge speed (Max. 4).',
    isAvailable: (p) => p.weapons.laserCannon.level > 0 && (p.weapons.laserCannon.chargeUpgrades || 0) < 4,
    apply: (p) => {
      p.weapons.laserCannon.chargeSpeedMult *= 1.15;
      p.weapons.laserCannon.chargeUpgrades = (p.weapons.laserCannon.chargeUpgrades || 0) + 1;
    }
  },
  {
    id: 'laser_damage',
    rarity: 'common',
    name: 'Laser Intensity',
    icon: '🔥',
    desc: '+25% Laser Cannon damage (Max. 3).',
    isAvailable: (p) => p.weapons.laserCannon.level > 0 && (p.weapons.laserCannon.dmgUpgrades || 0) < 3,
    apply: (p) => {
      p.weapons.laserCannon.damageMult += 0.25;
      p.weapons.laserCannon.dmgUpgrades = (p.weapons.laserCannon.dmgUpgrades || 0) + 1;
    }
  },
  {
    id: 'laser_width',
    rarity: 'uncommon',
    name: 'Expanded Beam',
    icon: '📏',
    desc: '+30% Laser Cannon beam width (Max. 3).',
    isAvailable: (p) => p.weapons.laserCannon.level > 0 && (p.weapons.laserCannon.widthUpgrades || 0) < 3,
    apply: (p) => {
      p.weapons.laserCannon.widthMult += 0.30;
      p.weapons.laserCannon.widthUpgrades = (p.weapons.laserCannon.widthUpgrades || 0) + 1;
    }
  },
  {
    id: 'laser_lifespan',
    rarity: 'uncommon',
    name: 'Luminous Persistence',
    icon: '⏱',
    desc: '+0.1s Laser Cannon duration (Max. 5).',
    isAvailable: (p) => p.weapons.laserCannon.level > 0 && (p.weapons.laserCannon.lifeUpgrades || 0) < 5,
    apply: (p) => {
      p.weapons.laserCannon.duration += 6;
      p.weapons.laserCannon.lifeUpgrades = (p.weapons.laserCannon.lifeUpgrades || 0) + 1;
    }
  },
  {
    id: 'laser_sublasers',
    rarity: 'rare',
    name: 'Auxiliary Lasers',
    icon: '🔱',
    desc: 'Fires 2 diagonal sub-lasers at 25% power (Unique).',
    isAvailable: (p) => p.weapons.laserCannon.level > 0 && !p.weapons.laserCannon.subLasers,
    apply: (p) => {
      p.weapons.laserCannon.subLasers = true;
    }
  },
  {
    id: 'laser_dot',
    rarity: 'rare',
    name: 'Corrosive Laser',
    icon: '☣',
    desc: 'Enemies struck suffer damage over time (Unique).',
    isAvailable: (p) => p.weapons.laserCannon.level > 0 && !p.weapons.laserCannon.dot,
    apply: (p) => {
      p.weapons.laserCannon.dot = true;
    }
  },
  {
    id: 'laser_dot_up',
    rarity: 'rare',
    name: 'Deep Corrosion',
    icon: '☢',
    desc: '+5 Corrosion damage, +0.5s duration (Max. 4).',
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
    name: 'Continuous Beam',
    icon: '⚡',
    desc: 'Laser continuously deals damage for its entire duration (Unique).',
    isAvailable: (p) => p.weapons.laserCannon.level > 0 && !p.weapons.laserCannon.tickDamage,
    apply: (p) => {
      p.weapons.laserCannon.tickDamage = true;
    }
  },

  // CAMPO DE FUERZA (ESCUDO)
  {
    id: 'shield_unlock',
    rarity: 'common',
    name: 'Force Field',
    icon: '🛡',
    desc: 'Unlocks a protective shield that absorbs projectile and enemy contact damage.',
    isAvailable: (p) => !p.shield || !p.shield.unlocked,
    apply: (p) => {
      p.unlockShield();
    }
  },
  {
    id: 'shield_damage_boost',
    rarity: 'common',
    name: 'Shield Power',
    icon: '⚔',
    desc: '+5% General damage while shield is active (Max. 5).',
    isAvailable: (p) => p.shield && p.shield.unlocked && (p.shield.damageBonusUpgrades || 0) < 5,
    apply: (p) => {
      p.shield.damageBonusUpgrades = (p.shield.damageBonusUpgrades || 0) + 1;
    }
  },
  {
    id: 'shield_rate_boost',
    rarity: 'common',
    name: 'Fortified Fire Rate',
    icon: '💨',
    desc: '+5% Weapon fire rate while shield is active (Max. 5).',
    isAvailable: (p) => p.shield && p.shield.unlocked && (p.shield.rateBonusUpgrades || 0) < 5,
    apply: (p) => {
      p.shield.rateBonusUpgrades = (p.shield.rateBonusUpgrades || 0) + 1;
    }
  },
  {
    id: 'shield_recharge_speed',
    rarity: 'uncommon',
    name: 'Accelerated Shield Recharge',
    icon: '🔋',
    desc: '+15% Shield recharge speed (Max. 2).',
    isAvailable: (p) => p.shield && p.shield.unlocked && (p.shield.rechargeUpgrades || 0) < 2,
    apply: (p) => {
      p.shield.rechargeSpeedMult *= 1.15;
      p.shield.rechargeUpgrades = (p.shield.rechargeUpgrades || 0) + 1;
    }
  },
  {
    id: 'shield_explosion',
    rarity: 'rare',
    name: 'Shield Detonation',
    icon: '💥',
    desc: 'When broken, shield detonates dealing damage in a large area (Unique).',
    isAvailable: (p) => p.shield && p.shield.unlocked && !p.shield.explodeOnBreak,
    apply: (p) => {
      p.shield.explodeOnBreak = true;
    }
  },
  {
    id: 'shield_save_chance',
    rarity: 'rare',
    name: 'Quantum Deflection',
    icon: '✨',
    desc: '5% chance to deflect incoming damage without losing a shield charge (Max. 2).',
    isAvailable: (p) => p.shield && p.shield.unlocked && (p.shield.saveChanceUpgrades || 0) < 2,
    apply: (p) => {
      p.shield.saveChargeChance = (p.shield.saveChargeChance || 0) + 0.05;
      p.shield.saveChanceUpgrades = (p.shield.saveChanceUpgrades || 0) + 1;
    }
  },
  {
    id: 'shield_extra_charge',
    rarity: 'legendary',
    name: 'Extra Field Battery',
    icon: '💠',
    desc: 'Increases maximum shield charges by +1 (Max. 2).',
    isAvailable: (p) => p.shield && p.shield.unlocked && (p.shield.extraChargesUpgrades || 0) < 2,
    apply: (p) => {
      p.shield.maxCharges += 1;
      p.shield.charges += 1;
      p.shield.extraChargesUpgrades = (p.shield.extraChargesUpgrades || 0) + 1;
    }
  },

  // INFINITE SCALING UPGRADES
  {
    id: 'damage_small',
    isInfinite: true,
    rarity: 'common',
    name: 'Weapon Tuning',
    icon: '🔧',
    desc: '+5% General damage.',
    isAvailable: (p) => (p.damageUpgradesCount || 0) >= 5, // Only if max dmg upgrades reached
    apply: (p) => { p.damageMult += 0.05; }
  },
  {
    id: 'heal_small',
    isInfinite: true,
    rarity: 'common',
    name: 'Emergency Repair',
    icon: '🩹',
    desc: 'Restores 10% of maximum health.',
    isAvailable: (p) => p.hp < p.maxHp,
    apply: (p) => { p.hp = Math.min(p.maxHp, p.hp + (p.maxHp * 0.10)); }
  },
  {
    id: 'crit_chance',
    isInfinite: true,
    rarity: 'common',
    name: 'Lethal Precision',
    icon: '🎯',
    desc: '+5% Critical Hit Chance.',
    isAvailable: (p) => (p.critChance || 0) < 0.99,
    apply: (p) => { p.critChance = (p.critChance || 0) + 0.05; }
  },
  {
    id: 'damage_med',
    isInfinite: true,
    rarity: 'uncommon',
    name: 'Plasma Optimization',
    icon: '🔋',
    desc: '+10% General damage.',
    isAvailable: (p) => (p.damageUpgradesCount || 0) >= 5, // Only if max dmg upgrades reached
    apply: (p) => { p.damageMult += 0.10; }
  },
  {
    id: 'heal_med',
    isInfinite: true,
    rarity: 'uncommon',
    name: 'Advanced Medkit',
    icon: '💊',
    desc: 'Restores 25% of maximum health.',
    isAvailable: (p) => p.hp < p.maxHp,
    apply: (p) => { p.hp = Math.min(p.maxHp, p.hp + (p.maxHp * 0.25)); }
  },
  {
    id: 'xp_boost',
    isInfinite: true,
    rarity: 'rare',
    name: 'Data Extraction',
    icon: '💾',
    desc: '+5% Experience gain.',
    isAvailable: (p) => p.level >= 40,
    apply: (p) => { p.xpMultiplier = (p.xpMultiplier || 1.0) + 0.05; }
  },
  {
    id: 'crit_damage',
    isInfinite: true,
    rarity: 'rare',
    name: 'Devastating Impact',
    icon: '💥',
    desc: '+10% Critical Damage.',
    apply: (p) => { p.critDamage = (p.critDamage || 1.5) + 0.10; }
  },
  {
    id: 'spawn_more_xp_less',
    isInfinite: true,
    rarity: 'rare',
    name: 'Lure Beacon',
    icon: '📡',
    desc: '+10% Enemies, but -5% Experience.',
    apply: (p) => { 
        state.spawnRateMultiplier = (state.spawnRateMultiplier || 1.0) + 0.10;
        p.xpMultiplier = (p.xpMultiplier || 1.0) - 0.05;
    }
  },
  {
    id: 'spawn_less_xp_more',
    isInfinite: true,
    rarity: 'rare',
    name: 'Active Camouflage',
    icon: '👻',
    desc: '-5% Enemies, but +10% Experience.',
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
    desc: '+0.4 HP regeneration per second.',
    apply: (p) => { p.hpRegen += 0.4; }
  },
  {
    id: 'boss_hp_cut',
    isInfinite: true,
    rarity: 'legendary',
    name: 'Core Hack',
    icon: '💻',
    desc: 'Halves the current HP of all active bosses.',
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
    name: 'Temporal Phase',
    icon: '⏳',
    desc: '+0.1s Invulnerability duration after taking damage.',
    apply: (p) => { p.invulnerabilityMaxTime += 0.1; }
  }

];

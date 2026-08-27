export const upgradeDatabase = [
  {
    id: 'blaster_count',
    name: 'Cadencia Multi-Láser',
    icon: '🔫',
    desc: '+1 Proyectil focalizado por disparo al mismo objetivo (Máx. 4).',
    isAvailable: (p) => p.weapons.blaster.projectileCount < 5,
    apply: (p) => { p.weapons.blaster.projectileCount += 1; }
  },
  {
    id: 'blaster_rate',
    name: 'Sobrecarga de Fuego',
    icon: '⚡',
    desc: '+25% Velocidad de recarga del Cañón Neón (Máx. 4).',
    isAvailable: (p) => (p.blasterRateUpgrades || 0) < 4,
    apply: (p) => { 
      p.weapons.blaster.cooldown = Math.max(8, p.weapons.blaster.cooldown * 0.75); 
      p.blasterRateUpgrades = (p.blasterRateUpgrades || 0) + 1;
    }
  },
  {
    id: 'hp_regen',
    name: 'Nanobots Reparadores',
    icon: '💉',
    desc: '+3.0 Regeneración de HP por segundo.',
    apply: (p) => { p.hpRegen += 3.0; }
  },
  {
    id: 'iframe_extend',
    name: 'Blindaje Cuántico',
    icon: '🛡️',
    desc: '+0.25s Duración de inmunidad tras recibir impacto (Máx. 3).',
    isAvailable: (p) => p.iFrameUpgradesCount < 3,
    apply: (p) => { 
      p.invulnerabilityMaxTime += 0.25; 
      p.iFrameUpgradesCount++;
    }
  },
  {
    id: 'speed_boost',
    name: 'Propulsores Vectoriales',
    icon: '👟',
    desc: '+20% Velocidad de movimiento del núcleo.',
    apply: (p) => { p.baseSpeed *= 1.20; }
  },
  {
    id: 'magnet_boost',
    name: 'Atracción Magnética',
    icon: '🧲',
    desc: '+50% Radio de recolección de energía XP (Máx. 4).',
    isAvailable: (p) => (p.magnetUpgrades || 0) < 4,
    apply: (p) => { 
      p.pickupRadius *= 1.5; 
      p.magnetUpgrades = (p.magnetUpgrades || 0) + 1;
    }
  },
  {
    id: 'damage_boost',
    name: 'Amplificador Cuántico',
    icon: '⚔️',
    desc: '+25% Daño general de todas las armas.',
    apply: (p) => { p.damageMult *= 1.25; }
  },
  {
    id: 'repair_hull',
    name: 'Refuerzo de Casco',
    icon: '❤️',
    desc: 'Restaura 50 HP y aumenta la salud máxima en +25.',
    apply: (p) => { 
      p.maxHp += 25; 
      p.hp = Math.min(p.maxHp, p.hp + 50);
    }
  },
  {
    id: 'nova_unlock',
    name: 'Desbloqueo Nova',
    icon: '🌀',
    desc: 'Dispara periódicamente una salva radial de 8 proyectiles.',
    isAvailable: (p) => p.weapons.nova.level === 0,
    apply: (p) => {
      p.weapons.nova.level = 1;
      p.weapons.nova.count = 8;
    }
  },
  {
    id: 'nova_up',
    name: '+ Proyectiles Nova',
    icon: '✨',
    desc: '+2 Proyectiles a la salva Nova (Máx. 3).',
    isAvailable: (p) => p.weapons.nova.level > 0 && p.weapons.nova.level <= 3,
    apply: (p) => {
      p.weapons.nova.level++;
      p.weapons.nova.count += 2;
    }
  },
  {
    id: 'nova_spiral',
    name: 'Vórtice Angular',
    icon: '🌪️',
    desc: 'Los proyectiles Nova conservan su expansión pero giran en espiral continua.',
    isAvailable: (p) => p.weapons.nova.level > 0 && !p.weapons.nova.spiral,
    apply: (p) => {
      p.weapons.nova.spiral = true;
    }
  },
  {
    id: 'orbital_unlock',
    name: 'Escudo Orbital Plasma',
    icon: '🔮',
    desc: 'Desbloquea 2 orbes rotatorios que causan daño al contacto.',
    isAvailable: (p) => p.weapons.orbitals.level === 0,
    apply: (p) => { 
      p.weapons.orbitals.level = 1;
      p.weapons.orbitals.count = 2;
    }
  },
  {
    id: 'orbital_count',
    name: '+ Satélites',
    icon: '🪐',
    desc: 'Añade +2 satélites al escudo orbital (Máx. 2).',
    isAvailable: (p) => p.weapons.orbitals.level > 0 && (p.weapons.orbitals.countUpgrades || 0) < 2,
    apply: (p) => {
      p.weapons.orbitals.count += 2;
      p.weapons.orbitals.countUpgrades = (p.weapons.orbitals.countUpgrades || 0) + 1;
    }
  },
  {
    id: 'orbital_size',
    name: 'Expansión Orbital',
    icon: '🌌',
    desc: '+20% Tamaño de los satélites (Máx. 4).',
    isAvailable: (p) => p.weapons.orbitals.level > 0 && (p.weapons.orbitals.sizeUpgrades || 0) < 4,
    apply: (p) => {
      p.weapons.orbitals.size = (p.weapons.orbitals.size || 8) * 1.2;
      p.weapons.orbitals.sizeUpgrades = (p.weapons.orbitals.sizeUpgrades || 0) + 1;
    }
  },
  {
    id: 'orbital_speed',
    name: 'Giro Acelerado',
    icon: '🔄',
    desc: '+15% Velocidad de rotación orbital (Máx. 10).',
    isAvailable: (p) => p.weapons.orbitals.level > 0 && (p.weapons.orbitals.speedUpgrades || 0) < 10,
    apply: (p) => {
      p.weapons.orbitals.speed *= 1.15;
      p.weapons.orbitals.speedUpgrades = (p.weapons.orbitals.speedUpgrades || 0) + 1;
    }
  },
  {
    id: 'shockwave_unlock',
    name: 'Pulso Radial Sísmico',
    icon: '💥',
    desc: 'Desbloquea una onda expansiva periódica.',
    isAvailable: (p) => p.weapons.shockwave.level === 0,
    apply: (p) => { 
      p.weapons.shockwave.level = 1;
    }
  },
  {
    id: 'shockwave_range',
    name: 'Amplitud Sísmica',
    icon: '🌊',
    desc: '+30% Rango de la onda expansiva (Máx. 3).',
    isAvailable: (p) => p.weapons.shockwave.level > 0 && (p.weapons.shockwave.rangeUpgrades || 0) < 3,
    apply: (p) => {
      p.weapons.shockwave.radius *= 1.30;
      p.weapons.shockwave.rangeUpgrades = (p.weapons.shockwave.rangeUpgrades || 0) + 1;
    }
  },
  {
    id: 'shockwave_rate',
    name: 'Frecuencia Sísmica',
    icon: '⏱️',
    desc: '+25% Velocidad de disparo de la onda expansiva (Máx. 4).',
    isAvailable: (p) => p.weapons.shockwave.level > 0 && (p.weapons.shockwave.rateUpgrades || 0) < 4,
    apply: (p) => {
      p.weapons.shockwave.cooldown = Math.max(30, p.weapons.shockwave.cooldown * 0.75); 
      p.weapons.shockwave.rateUpgrades = (p.weapons.shockwave.rateUpgrades || 0) + 1;
    }
  },
  {
    id: 'missiles_unlock',
    name: 'Batería de Misiles',
    icon: '🚀',
    desc: 'Lanza 6 misiles en direcciones aleatorias con rastreo leve y daño en área.',
    isAvailable: (p) => p.weapons.missiles.level === 0,
    apply: (p) => {
      p.weapons.missiles.level = 1;
    }
  },
  {
    id: 'missiles_count',
    name: '+ Misiles',
    icon: '🎆',
    desc: '+2 Misiles por salva (Máx. 3).',
    isAvailable: (p) => p.weapons.missiles.level > 0 && (p.weapons.missiles.countUpgrades || 0) < 3,
    apply: (p) => {
      p.weapons.missiles.count += 2;
      p.weapons.missiles.countUpgrades = (p.weapons.missiles.countUpgrades || 0) + 1;
    }
  },
  {
    id: 'missiles_speed',
    name: 'Propulsión de Misiles',
    icon: '☄️',
    desc: '+20% Velocidad de misiles (Máx. 4).',
    isAvailable: (p) => p.weapons.missiles.level > 0 && (p.weapons.missiles.speedUpgrades || 0) < 4,
    apply: (p) => {
      p.weapons.missiles.speed *= 1.20;
      p.weapons.missiles.speedUpgrades = (p.weapons.missiles.speedUpgrades || 0) + 1;
    }
  },
  {
    id: 'missiles_homing',
    name: 'Rastreo Avanzado',
    icon: '📡',
    desc: 'Mejora drásticamente el rastreo de los misiles (Único).',
    isAvailable: (p) => p.weapons.missiles.level > 0 && !p.weapons.missiles.homingUpgrade,
    apply: (p) => {
      p.weapons.missiles.homing += 0.08;
      p.weapons.missiles.homingUpgrade = true;
    }
  },
  {
    id: 'missiles_aoe',
    name: 'Carga Explosiva',
    icon: '💣',
    desc: '+30% Área de daño de los misiles (Máx. 3).',
    isAvailable: (p) => p.weapons.missiles.level > 0 && (p.weapons.missiles.aoeUpgrades || 0) < 3,
    apply: (p) => {
      p.weapons.missiles.aoe *= 1.30;
      p.weapons.missiles.aoeUpgrades = (p.weapons.missiles.aoeUpgrades || 0) + 1;
    }
  }
];

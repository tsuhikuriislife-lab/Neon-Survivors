  import { state } from '../engine/gameState.js';
import { spawnExplosion } from '../entities/effects/spawnExplosion.js';
import { StandardEnemy } from '../entities/enemies/StandardEnemy.js';
import { SwarmerEnemy } from '../entities/enemies/SwarmerEnemy.js';
import { RangerEnemy } from '../entities/enemies/RangerEnemy.js';
import { MotherEnemy } from '../entities/enemies/MotherEnemy.js';
import { getBossById, getMainBosses } from '../data/bossRegistry.js';
import { audioManager } from '../engine/AudioManager.js';

export function triggerBossSpawnSequence(bossType, customX, customY) {
  if (state.pendingBossSpawn) return;

  const bossDef = getBossById(bossType);
  let spawnX = customX;
  let spawnY = customY;

  if (spawnX === undefined || spawnY === undefined) {
    if (bossDef && typeof bossDef.defaultSpawnX === 'function' && typeof bossDef.defaultSpawnY === 'function') {
      spawnX = bossDef.defaultSpawnX();
      spawnY = bossDef.defaultSpawnY();
    } else {
      spawnX = state.width / 2;
      spawnY = state.height / 2;
    }
  }

  state.pendingBossSpawn = {
    bossType: bossType,
    x: spawnX,
    y: spawnY,
    timer: 5.0,
    duration: 5.0
  };

  const banner = document.getElementById("boss-warning-banner");
  if (banner) banner.style.display = "block";

  // 1. Cinematic Camera Focus on Boss Spawn Beacon
  if (state.camera && typeof state.camera.focusOn === 'function') {
    state.camera.focusOn({
      x: spawnX,
      y: spawnY,
      zoom: 1.28,
      duration: 1.4,
      fadeInDuration: 0.6,
      fadeOutDuration: 0.9
    });
  }

  // 2. Alert Environment Effects (Pulsing Red Hazard Theme)
  if (state.environment) {
    state.environment.setBorders({
      color: "rgba(255, 0, 85, 0.75)",
      innerColor: "rgba(255, 100, 150, 0.9)",
      cornerColor: "#ff0055",
      glow: 26,
      pulse: { rate: 3, amplitude: 0.5 },
      duration: 5.0,
      fadeInDuration: 0.4,
      fadeOutDuration: 0.8
    });

    state.environment.setGridLines({
      color: "rgba(255, 0, 85, 0.12)",
      pulse: { rate: 3, amplitude: 0.4 },
      duration: 5.0,
      fadeInDuration: 0.4,
      fadeOutDuration: 0.8
    });
  }

  audioManager.playSound('boss_spawn_warning', { volume: 0.9, throttleMs: 200 });
}

export function spawnRandomBoss() {
  if (state.pendingBossSpawn) return;

  const mainBosses = getMainBosses().map(b => b.id);
  let available = mainBosses;
  if (state.lastBossName) {
    available = available.filter(b => b !== state.lastBossName);
    if (available.length === 0) available = mainBosses;
  }
  const choice = available[Math.floor(Math.random() * available.length)];
  state.lastBossName = choice;

  triggerBossSpawnSequence(choice);
}

export function updatePendingBossSpawn(dt) {
  if (!state.pendingBossSpawn) return;

  state.pendingBossSpawn.timer -= dt;

  if (state.pendingBossSpawn.timer <= 0) {
    const pending = state.pendingBossSpawn;
    state.pendingBossSpawn = null;

    const banner = document.getElementById("boss-warning-banner");
    if (banner) banner.style.display = "none";

    // 1. Heavy Screenshake on Boss Detonation
    if (state.camera && typeof state.camera.shake === 'function') {
      state.camera.shake({ strength: 24, duration: 0.65, rotation: 0.08, scale: 0.06 });
    }

    // 2. Flash Arena Borders White/Neon
    if (state.environment) {
      state.environment.setBorders({
        color: "rgba(255, 255, 255, 0.9)",
        innerColor: "rgba(255, 255, 255, 1.0)",
        cornerColor: "#ffffff",
        glow: 35,
        duration: 0.35,
        fadeInDuration: 0.05,
        fadeOutDuration: 0.45
      });
    }

    // Spawn explosion & particles
    spawnExplosion(pending.x, pending.y, "#ff0055", 55, 6);
    if (state.particlePool) {
      for (let i = 0; i < 40; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = Math.random() * 8 + 2;
        const p = state.particlePool.acquire(pending.x, pending.y, "#ff0055", 4, 0.03, 3);
        if (p) {
          p.vx = Math.cos(a) * s;
          p.vy = Math.sin(a) * s;
        }
      }
    }

    audioManager.playSound('enemy_death_boss', { volume: 0.9, throttleMs: 200 });

    const bossDef = getBossById(pending.bossType);
    if (bossDef && typeof bossDef.instantiate === 'function') {
      bossDef.instantiate(pending.x, pending.y);
    }
  }
}

export function startWave(duration = 60) {
  state.isWaveActive = true;
  state.waveTimer = duration;
  state.waveDuration = duration;

  const banner = document.getElementById("wave-warning-banner");
  if (banner) banner.style.display = "block";

  // 1. Camera pulse on wave trigger
  if (state.camera && typeof state.camera.shake === 'function') {
    state.camera.shake({ strength: 5, duration: 5, rotation: 0.04, scale: 0.03 });
  }

  // 2. Alert Environment Effects (Pulsing Amber/Orange Wave Theme)
  if (state.environment) {
    state.environment.setBorders({
      color: "rgba(255, 140, 0, 0.8)",
      innerColor: "rgba(255, 180, 50, 0.9)",
      cornerColor: "#ff9900",
      glow: 24,
      pulse: { rate: 4, amplitude: 0.45 },
      duration: duration,
      fadeInDuration: 0.5,
      fadeOutDuration: 1.0
    });

    state.environment.setGridLines({
      color: "rgba(255, 140, 0, 0.12)",
      pulse: { rate: 4, amplitude: 0.35 },
      duration: duration,
      fadeInDuration: 0.5,
      fadeOutDuration: 1.0
    });
  }

  audioManager.playSound('boss_spawn_warning', { volume: 0.75, throttleMs: 200 });
}

export function endWave() {
  state.isWaveActive = false;
  state.waveTimer = 0;

  const banner = document.getElementById("wave-warning-banner");
  if (banner) banner.style.display = "none";
}

export function updateWave(dt) {
  if (state.isWaveActive) {
    state.waveTimer -= dt;
    if (state.waveTimer <= 0) {
      endWave();
    }
  } else {
    if (state.gameTime >= state.nextWaveTime) {
      if (!state.disableSpawns) {
        startWave(state.waveDuration || 20);
      }
      state.nextWaveTime += 300; // Next wave in 5 minutes
    }
  }
}

export function handleSpawning() {
  if (state.disableSpawns) return;
  
  state.spawnTimer++;
  const hasActiveBoss = state.bosses.some(b => b.getTargetables().length > 0);

  let baseInterval;
  if (state.gameTime < 180) {
    // Inicio equilibrado: de 42 frames (~0.7s) bajando a 26 frames (~0.43s)
    baseInterval = Math.max(26, 42 - Math.floor((state.gameTime / 180) * 16));
  } else if (state.gameTime < 480) {
    // Fase media: de 26 frames a 16 frames (~0.26s)
    baseInterval = Math.max(16, 26 - Math.floor(((state.gameTime - 180) / 300) * 10));
  } else {
    // Fase tardia: de 16 frames a 9 frames (~0.15s)
    baseInterval = Math.max(9, 16 - Math.floor(((state.gameTime - 480) / 300) * 7));
  }

  const mult = state.spawnRateMultiplier || 1.0;
  const waveMult = state.isWaveActive ? 4.0 : 1.0;
  baseInterval = Math.max(2, Math.floor(baseInterval / (mult * waveMult)));

  if (hasActiveBoss) {
    baseInterval = Math.floor(baseInterval * 2.5);
  }

  if (state.spawnTimer >= baseInterval) {
    state.spawnTimer = 0;
    
    // 1. Oleada de Enjambradores (Swarmers)
    if (state.bossDefeatTimes.first && Math.random() < 0.16) {
       const count = 6 + Math.floor(Math.random() * 5);
       const dummy = new StandardEnemy('small');
       const sx = dummy.x; 
       const sy = dummy.y;
       const isHoriz = dummy.y < 0 || dummy.y > state.height;
       for (let i = 0; i < count; i++) {
         let nx, ny;
         if (isHoriz) {
           nx = Math.max(20, Math.min(state.width - 20, sx + (Math.random() * 120 - 60)));
           ny = dummy.y < 0 ? -(90 + Math.random() * 50) : (state.height + 90 + Math.random() * 50);
         } else {
           nx = dummy.x < 0 ? -(90 + Math.random() * 50) : (state.width + 90 + Math.random() * 50);
           ny = Math.max(20, Math.min(state.height - 20, sy + (Math.random() * 120 - 60)));
         }
         const sw = new SwarmerEnemy(nx, ny);
         state.enemies.push(sw);
       }
       return;
    }

    // 2. Enemigos especiales por progresion
    if (state.bossDefeatTimes.kyren && Math.random() < 0.22) {
       state.enemies.push(new RangerEnemy());
       return;
    }
    if (state.bossDefeatTimes.amalgam && Math.random() < 0.08) {
       state.enemies.push(new MotherEnemy());
       return;
    }

    // 3. Cantidad de enemigos por lote (Batch Spawning)
    let batchCount = 1;
    if (state.gameTime < 60) {
      batchCount = Math.random() < 0.25 ? 2 : 1;
    } else if (state.gameTime < 180) {
      batchCount = Math.random() < 0.40 ? 2 : 1;
    } else if (state.gameTime < 480) {
      const r = Math.random();
      batchCount = r < 0.30 ? 3 : (r < 0.70 ? 2 : 1);
    } else {
      batchCount = Math.random() < 0.35 ? 3 : 2;
    }

    // 4. Tipo de enemigo estandar
    let enemyType;
    if (state.gameTime < 180) {
      enemyType = 'small';
    } else if (state.gameTime < 480) {
      enemyType = Math.random() < 0.50 ? 'medium' : 'small';
    } else {
      const roll = Math.random();
      if (roll < 0.35) {
        enemyType = 'large';
      } else if (roll < 0.70) {
        enemyType = 'medium';
      } else {
        enemyType = 'small';
      }
    }

    const firstEnemy = new StandardEnemy(enemyType);
    state.enemies.push(firstEnemy);

    const isHoriz = firstEnemy.y < 0 || firstEnemy.y > state.height;
    for (let i = 1; i < batchCount; i++) {
      let ox, oy;
      if (isHoriz) {
        ox = Math.max(20, Math.min(state.width - 20, firstEnemy.x + (Math.random() * 80 - 40)));
        oy = firstEnemy.y < 0 ? -(90 + Math.random() * 40) : (state.height + 90 + Math.random() * 40);
      } else {
        ox = firstEnemy.x < 0 ? -(90 + Math.random() * 40) : (state.width + 90 + Math.random() * 40);
        oy = Math.max(20, Math.min(state.height - 20, firstEnemy.y + (Math.random() * 80 - 40)));
      }
      state.enemies.push(new StandardEnemy(enemyType, ox, oy));
    }
  }
}

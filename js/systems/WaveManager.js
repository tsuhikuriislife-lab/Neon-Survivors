  import { state } from '../engine/gameState.js';
import { spawnExplosion } from '../entities/effects/spawnExplosion.js';
import { StandardEnemy } from '../entities/enemies/StandardEnemy.js';
import { SwarmerEnemy } from '../entities/enemies/SwarmerEnemy.js';
import { RangerEnemy } from '../entities/enemies/RangerEnemy.js';
import { MotherEnemy } from '../entities/enemies/MotherEnemy.js';
import { getBossById, getMainBosses } from '../data/bossRegistry.js';
import { audioManager } from '../engine/AudioManager.js';

let bossBannerTimeout = null;
let waveBannerTimeout = null;

export function showWarningBanner(elementId, durationSec = 3.5) {
  const banner = document.getElementById(elementId);
  if (!banner) return;

  if (elementId === 'boss-warning-banner' && bossBannerTimeout) {
    clearTimeout(bossBannerTimeout);
    bossBannerTimeout = null;
  }
  if (elementId === 'wave-warning-banner' && waveBannerTimeout) {
    clearTimeout(waveBannerTimeout);
    waveBannerTimeout = null;
  }

  banner.style.display = "block";
  banner.style.opacity = "1";

  const timer = setTimeout(() => {
    banner.style.opacity = "0";
    setTimeout(() => {
      if (banner.style.opacity === "0") {
        banner.style.display = "none";
      }
    }, 400);
  }, durationSec * 1000);

  if (elementId === 'boss-warning-banner') bossBannerTimeout = timer;
  if (elementId === 'wave-warning-banner') waveBannerTimeout = timer;
}

export function hideWarningBanner(elementId) {
  const banner = document.getElementById(elementId);
  if (!banner) return;
  if (elementId === 'boss-warning-banner' && bossBannerTimeout) {
    clearTimeout(bossBannerTimeout);
    bossBannerTimeout = null;
  }
  if (elementId === 'wave-warning-banner' && waveBannerTimeout) {
    clearTimeout(waveBannerTimeout);
    waveBannerTimeout = null;
  }
  banner.style.opacity = "0";
  banner.style.display = "none";
}

export function updateEnemyScaling() {
  if (!state.enemyScaling) {
    state.enemyScaling = { hp: 1.0, speed: 1.0, damage: 1.0 };
  }
  const progress = Math.min(1.0, state.gameTime / 1800);
  state.enemyScaling.hp = 1.0 + (progress * 4.0);
  state.enemyScaling.speed = 1.0 + (progress * 0.75);
  state.enemyScaling.damage = 1.0 + (progress * 0.75);
}

function applyEnemyScaling(enemy) {
  if (state.enemyScaling) {
    enemy.maxHp *= state.enemyScaling.hp;
    enemy.hp = enemy.maxHp;
    enemy.speed *= state.enemyScaling.speed;
    enemy.damage *= state.enemyScaling.damage;
  }
  return enemy;
}

export function triggerBossSpawnSequence(bossType, customX, customY) {
  updateEnemyScaling();
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

  showWarningBanner("boss-warning-banner", 4.0);

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

    hideWarningBanner("boss-warning-banner");

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
  updateEnemyScaling();
  state.isWaveActive = true;
  state.waveTimer = duration;
  state.waveDuration = duration;

  showWarningBanner("wave-warning-banner", 3.5);

  // 1. Camera pulse on wave trigger (punchy 1.2s pulse instead of 10s heavy shake)
  if (state.camera && typeof state.camera.shake === 'function') {
    state.camera.shake({ strength: 3.5, duration: 1.2, rotation: 0.002, scale: 0.012 });
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

  hideWarningBanner("wave-warning-banner");
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
  if (state.gameTime < 600) {
    // 0 - 10 min: de 42 frames a 26 frames
    baseInterval = Math.max(26, 42 - Math.floor((state.gameTime / 600) * 16));
  } else if (state.gameTime < 1200) {
    // 10 - 20 min: de 26 frames a 16 frames
    baseInterval = Math.max(16, 26 - Math.floor(((state.gameTime - 600) / 600) * 10));
  } else {
    // 20 - 30+ min: de 16 frames a 9 frames
    baseInterval = Math.max(9, 16 - Math.floor(((state.gameTime - 1200) / 600) * 7));
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
       const margin = 100;
       const edge = Math.floor(Math.random() * 4);
       let sx, sy, isHoriz;
       if (edge === 0) {
         sx = Math.random() * state.width;
         sy = -margin;
         isHoriz = true;
       } else if (edge === 1) {
         sx = state.width + margin;
         sy = Math.random() * state.height;
         isHoriz = false;
       } else if (edge === 2) {
         sx = Math.random() * state.width;
         sy = state.height + margin;
         isHoriz = true;
       } else {
         sx = -margin;
         sy = Math.random() * state.height;
         isHoriz = false;
       }

       for (let i = 0; i < count; i++) {
         let nx, ny;
         if (isHoriz) {
           nx = Math.max(20, Math.min(state.width - 20, sx + (Math.random() * 120 - 60)));
           ny = sy < 0 ? -(90 + Math.random() * 50) : (state.height + 90 + Math.random() * 50);
         } else {
           nx = sx < 0 ? -(90 + Math.random() * 50) : (state.width + 90 + Math.random() * 50);
           ny = Math.max(20, Math.min(state.height - 20, sy + (Math.random() * 120 - 60)));
         }
         const sw = new SwarmerEnemy(nx, ny);
         state.enemies.push(applyEnemyScaling(sw));
       }
       return;
    }

    // 2. Enemigos especiales por progresion
    if (state.bossDefeatTimes.kyren && Math.random() < 0.22) {
       state.enemies.push(applyEnemyScaling(new RangerEnemy()));
       return;
    }
    if (state.bossDefeatTimes.amalgam && Math.random() < 0.08) {
       state.enemies.push(applyEnemyScaling(new MotherEnemy()));
       return;
    }

    // 3. Cantidad de enemigos por lote (Batch Spawning)
    let batchCount = 1;
    if (state.gameTime < 300) { // 0 - 5 min
      batchCount = Math.random() < 0.25 ? 2 : 1;
    } else if (state.gameTime < 900) { // 5 - 15 min
      batchCount = Math.random() < 0.40 ? 2 : 1;
    } else if (state.gameTime < 1500) { // 15 - 25 min
      const r = Math.random();
      batchCount = r < 0.30 ? 3 : (r < 0.70 ? 2 : 1);
    } else { // 25 - 30+ min
      batchCount = Math.random() < 0.35 ? 3 : 2;
    }

    // 4. Tipo de enemigo estandar y spawneo distribuido
    for (let i = 0; i < batchCount; i++) {
      let enemyType;
      if (state.gameTime < 600) { // 0 - 10 min
        enemyType = 'small';
      } else if (state.gameTime < 1200) { // 10 - 20 min
        enemyType = Math.random() < 0.50 ? 'medium' : 'small';
      } else { // 20 - 30+ min
        const roll = Math.random();
        if (roll < 0.35) {
          enemyType = 'large';
        } else if (roll < 0.70) {
          enemyType = 'medium';
        } else {
          enemyType = 'small';
        }
      }
      
      // Al no pasar x, y, el constructor usa sus propios nodos aleatorios en el perímetro
      state.enemies.push(applyEnemyScaling(new StandardEnemy(enemyType)));
    }
  }
}

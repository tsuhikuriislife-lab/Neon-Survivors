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
      duration: 3.4,
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

export function handleSpawning() {
  if (state.disableSpawns) return;
  
  state.spawnTimer++;
  const hasActiveBoss = state.bosses.some(b => b.getTargetables().length > 0);

  let baseInterval;
  if (state.gameTime < 180) {
    baseInterval = Math.max(40, 65 - Math.floor((state.gameTime / 180) * 25));
  } else if (state.gameTime < 480) {
    baseInterval = Math.max(20, 40 - Math.floor(((state.gameTime - 180) / 300) * 20));
  } else {
    baseInterval = Math.max(10, 20 - Math.floor(((state.gameTime - 480) / 300) * 10));
  }

  if (hasActiveBoss) {
    baseInterval = Math.floor(baseInterval / 0.25);
  }

  if (state.spawnTimer >= baseInterval) {
    state.spawnTimer = 0;
    
    if (state.bossDefeatTimes.first && Math.random() < 0.15) {
       const count = 5 + Math.floor(Math.random() * 4);
       const dummy = new StandardEnemy('small');
       const sx = dummy.x; const sy = dummy.y;
       for (let i = 0; i < count; i++) {
         const sw = new SwarmerEnemy(sx + (Math.random() * 40 - 20), sy + (Math.random() * 40 - 20));
         state.enemies.push(sw);
       }
       return;
    }

    let enemyType;
    if (state.gameTime < 180) {
      enemyType = 'small';
    } else if (state.gameTime < 480) {
      enemyType = Math.random() < 0.45 ? 'medium' : 'small';
    } else {
      const roll = Math.random();
      if (roll < 0.30) {
        enemyType = 'large';
      } else if (roll < 0.65) {
        enemyType = 'medium';
      } else {
        enemyType = 'small';
      }
    }

    if (state.bossDefeatTimes.kyren && Math.random() < 0.20) {
       state.enemies.push(new RangerEnemy());
       return;
    }
    if (state.bossDefeatTimes.amalgam && Math.random() < 0.05) {
       state.enemies.push(new MotherEnemy());
       return;
    }

    state.enemies.push(new StandardEnemy(enemyType));
  }
}

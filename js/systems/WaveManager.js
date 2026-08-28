import { state } from '../engine/gameState.js';
import { FloatingText } from '../entities/effects/FloatingText.js';
import { spawnExplosion } from '../entities/effects/spawnExplosion.js';
import { StandardEnemy } from '../entities/enemies/StandardEnemy.js';
import { SwarmerEnemy } from '../entities/enemies/SwarmerEnemy.js';
import { RangerEnemy } from '../entities/enemies/RangerEnemy.js';
import { MotherEnemy } from '../entities/enemies/MotherEnemy.js';
import { getBossById, getMainBosses } from '../data/bossRegistry.js';

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

  import('../engine/AudioManager.js').then(({ audioManager }) => {
    audioManager.playSound('boss_spawn_warning', { volume: 0.9, throttleMs: 200 });
  });
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

    // Spawn explosion & particles
    spawnExplosion(pending.x, pending.y, "#ff0055", 55, 6);
    import('../entities/effects/Particle.js').then(({ Particle }) => {
      for (let i = 0; i < 40; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = Math.random() * 8 + 2;
        const p = new Particle(pending.x, pending.y, "#ff0055", 4, 0.03, 3);
        p.vx = Math.cos(a) * s;
        p.vy = Math.sin(a) * s;
        state.particles.push(p);
      }
    });

    import('../engine/AudioManager.js').then(({ audioManager }) => {
      audioManager.playSound('enemy_death_boss', { volume: 0.9, throttleMs: 200 });
    });

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
       const count = 5 + Math.floor(Math.random() * 4); // 5 to 8 swarmers
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


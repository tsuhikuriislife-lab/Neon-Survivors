// ============================================================================
// WaveManager.js - Sistema Director de Oleadas, Escalado y Generación de Jefes
// ============================================================================

import { state } from '../engine/gameState.js';
import { spawnExplosion } from '../entities/effects/spawnExplosion.js';
import { StandardEnemy } from '../entities/enemies/StandardEnemy.js';
import { SwarmerEnemy } from '../entities/enemies/SwarmerEnemy.js';
import { RangerEnemy } from '../entities/enemies/RangerEnemy.js';
import { MotherEnemy } from '../entities/enemies/MotherEnemy.js';
import { getBossById, getMainBosses } from '../data/bossRegistry.js';
import { audioManager } from '../engine/AudioManager.js';

// Referencias a temporizadores para evitar bucles de animación si se activan múltiples alertas
let bossBannerTimeout = null;
let waveBannerTimeout = null;

/**
 * Muestra una advertencia visual tipo banner (ej. "BOSS APROXIMÁNDOSE").
 * Utiliza `opacity` en lugar de agregar/quitar elementos del DOM para aprovechar
 * la composición por GPU y no causar caídas de frames por repintado.
 * @param {string} elementId - ID del elemento en el HTML.
 * @param {number} durationSec - Duración total de la advertencia antes del fade-out.
 */
export function showWarningBanner(elementId, durationSec = 3.5) {
  const banner = document.getElementById(elementId);
  if (!banner) return;

  // Limpiamos timeouts previos si la misma advertencia se dispara repetidamente
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

  // Auto fade-out
  const timer = setTimeout(() => {
    banner.style.opacity = "0";
    setTimeout(() => {
      if (banner.style.opacity === "0") {
        banner.style.display = "none";
      }
    }, 400); // 400ms para empatar con la transición CSS
  }, durationSec * 1000);

  if (elementId === 'boss-warning-banner') bossBannerTimeout = timer;
  if (elementId === 'wave-warning-banner') waveBannerTimeout = timer;
}

/** Oculta forzosamente un banner activo. */
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

/**
 * Calcula y aplica el factor de escalado de dificultad basado en el tiempo de juego.
 * Mantiene un límite (cap) en el minuto 30 (1800 segundos) para que el juego siga
 * siendo matemáticamente posible.
 */
export function updateEnemyScaling() {
  if (!state.enemyScaling) {
    state.enemyScaling = { hp: 1.0, speed: 1.0, damage: 1.0 };
  }
  
  // Progreso normalizado: de 0.0 (inicio del juego) a 1.0 (minuto 30)
  const progress = Math.min(1.0, Math.max(0, (state.gameTime || 0) / 1800));
  
  // Escalas máximas a los 30 min: HP x5.0, Velocidad x1.75, Daño x1.75
  state.enemyScaling.hp = 1.0 + (progress * 4.0);
  state.enemyScaling.speed = 1.0 + (progress * 0.75);
  state.enemyScaling.damage = 1.0 + (progress * 0.75);
  
  const phaseBonus = (state.currentPhase - 1) * 0.4;
  const waveBonus = state.waveTriggeredEnFase ? 0.2 : 0;
  const totalScaling = phaseBonus + waveBonus;
  
  // NOTA: Se sobrescribe momentáneamente para herencia de versiones antiguas.
  // Podría refactorizarse en el futuro para sumar `totalScaling` al base en vez de reemplazar.
  state.enemyScaling.hp = 1.0 + (totalScaling * 2.0);
  state.enemyScaling.speed = 1.0 + (totalScaling * 0.15);
  state.enemyScaling.damage = 1.0 + (totalScaling * 0.25);
}

/**
 * Inyecta las estadísticas calculadas en el enemigo instanciado.
 * @param {Object} enemy - Instancia del enemigo
 * @returns {Object} El enemigo escalado
 */
function applyEnemyScaling(enemy) {
  if (state.enemyScaling) {
    enemy.maxHp *= state.enemyScaling.hp;
    enemy.hp = enemy.maxHp;
    enemy.speed *= state.enemyScaling.speed;
    enemy.damage *= state.enemyScaling.damage;
  }
  return enemy;
}

/**
 * Inicia la secuencia de "Anticipación de Jefe" (5 segundos antes de que aparezca).
 * Informa a la cámara, muestra balizas y detiene el spawneo normal temporalmente.
 */
export function triggerBossSpawnSequence(bossType, customX, customY) {
  updateEnemyScaling();
  if (state.pendingBossSpawn) return;

  const bossDef = getBossById(bossType);
  let spawnX = customX;
  let spawnY = customY;

  // Si no hay coordenadas de spawn predefinidas, pregunta a la fábrica o colócalo en el centro (960, 960)
  if (spawnX === undefined || spawnY === undefined) {
    if (bossDef && typeof bossDef.defaultSpawnX === 'function' && typeof bossDef.defaultSpawnY === 'function') {
      spawnX = bossDef.defaultSpawnX();
      spawnY = bossDef.defaultSpawnY();
    } else {
      spawnX = state.width / 2;
      spawnY = state.height / 2;
    }
  }

  // Registramos al jefe como "pendiente", iniciando su temporizador de 5s
  state.pendingBossSpawn = {
    bossType: bossType,
    x: spawnX,
    y: spawnY,
    timer: 5.0,
    duration: 5.0
  };
  
  state.isCinematic = true;

  showWarningBanner("boss-warning-banner", 4.0);

  // 1. Enfoque Cinemático: Mueve la cámara forzosamente a la baliza de aparición
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

  // 2. Efectos de Entorno: Pulso rojo intermitente simulando luz de alarma
  if (state.environment) {
    state.environment.setBorders({
      color: "rgba(255, 0, 85, 0.45)",
      innerColor: "rgba(255, 0, 85, 0.8)",
      cornerColor: "#ff0055",
      glow: 28,
      pulse: { rate: 3, amplitude: 0.4 },
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

/** Escoge un jefe al azar que no haya salido en la oleada inmediatamente anterior. */
export function spawnRandomBoss() {
  if (state.pendingBossSpawn) return;

  const mainBosses = getMainBosses().map(b => b.id);
  let available = mainBosses;
  
  // Regla arquitectónica: Evitar repetición consecutiva
  if (state.lastBossName) {
    available = available.filter(b => b !== state.lastBossName);
    if (available.length === 0) available = mainBosses;
  }
  
  const choice = available[Math.floor(Math.random() * available.length)];
  state.lastBossName = choice;

  triggerBossSpawnSequence(choice);
}

/**
 * Se llama cada frame durante la anticipación de un jefe. 
 * Reduce el reloj y detona la aparición instanciándolo cuando llega a 0.
 * @param {number} dt - Delta time
 */
export function updatePendingBossSpawn(dt) {
  if (!state.pendingBossSpawn) return;

  state.pendingBossSpawn.timer -= dt;

  if (state.pendingBossSpawn.timer <= 0) {
    const pending = state.pendingBossSpawn;
    state.pendingBossSpawn = null;

    hideWarningBanner("boss-warning-banner");

    // 1. Screenshake pesado para darle impacto físico a la explosión de aparición
    if (state.camera && typeof state.camera.shake === 'function') {
      state.camera.shake({ strength: 24, duration: 0.65, rotation: 0.08, scale: 0.06 });
    }

    // 2. Destello blanco en los bordes para ocultar la instanciación gráfica
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

    // Spawn explosión y partículas Cero-GC usando el Pool
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

    // Instancia al jefe físicamente en el mundo a través de la factoría
    const bossDef = getBossById(pending.bossType);
    if (bossDef && typeof bossDef.instantiate === 'function') {
      bossDef.instantiate(pending.x, pending.y);
    }
  }
}

/** Desata un evento de oleada masiva temporal */
export function startWave(duration = 30) {
  updateEnemyScaling();
  state.isWaveActive = true;
  state.waveTimer = duration * 60; // Convertido de segundos a frames asumiendo 60fps fijos
  state.waveDuration = duration;

  showWarningBanner("wave-warning-banner", 2.5);

  // 1. Pequeño impacto en la cámara (pulso punchy)
  if (state.camera && typeof state.camera.shake === 'function') {
    state.camera.shake({ strength: 5.0, duration: 1.2, rotation: 0.002, scale: 0.012 });
  }

  // 2. Efecto visual de alarma ámbar para hordas
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
  // NOTA ARQUITECTÓNICA: Se eliminó `waveTriggeredEnFase = false` para evitar que la oleada 
  // entre en un bucle infinito y solo se lance una vez por fase.
  hideWarningBanner("wave-warning-banner");
}

export function updateWave(dt) {
  if (state.isWaveActive) {
    state.waveTimer -= dt;
    if (state.waveTimer <= 0) {
      endWave();
    }
  }
  
  if (!state.isBossPhase) {
    if (state.phaseTime <= 150 && !state.waveTriggeredEnFase) {
      state.waveTriggeredEnFase = true;
      if (!state.disableSpawns) {
        startWave(state.waveDuration || 20);
      }
      state.nextWaveTime += 300; // Próxima oleada en 5 minutos
      updateEnemyScaling(); 
    }
    
    if (state.phaseTime <= 0) {
      state.isBossPhase = true;
      if (!state.disableBossSpawns) {
        spawnRandomBoss();
      }
    }
  }
}

/**
 * Bucle maestro de creación de enemigos.
 * Decide el intervalo matemático entre *spawns* basándose en la progresión del tiempo (0 a 30m)
 * y despacha lotes (batches) de forma distribuida.
 */
export function handleSpawning() {
  if (state.disableSpawns) return;
  updateEnemyScaling();
  if (state.disableSpawns || state.isBossPhase) return;
  
  state.spawnTimer++;
  const hasActiveBoss = state.bosses.some(b => b.getTargetables().length > 0);

  // =========================================================================
  // MATEMÁTICA DE PRESIÓN: Base Interval 
  // Representa el número de fotogramas (frames) que deben pasar antes de generar enemigos.
  // Menor intervalo = aparecen más rápido.
  // =========================================================================
  let baseInterval;
  if (state.gameTime < 600) {
    // 0 - 10 min: Escala linealmente de 42 frames a 26 frames
    baseInterval = Math.max(26, 42 - Math.floor((state.gameTime / 600) * 16));
  } else if (state.gameTime < 1200) {
    // 10 - 20 min: Escala linealmente de 26 frames a 16 frames
    baseInterval = Math.max(16, 26 - Math.floor(((state.gameTime - 600) / 600) * 10));
  } else {
    // 20 - 30+ min: Presión masiva, escala de 16 frames hasta el límite absoluto de 9 frames
    baseInterval = Math.max(9, 16 - Math.floor(((state.gameTime - 1200) / 600) * 7));
  }

  const mult = state.spawnRateMultiplier || 1.0;
  // Durante una oleada (Wave), la cadencia de spawn es 2.5 VECES más rápida
  const waveMult = state.isWaveActive ? 2.5 : 1.0;
  baseInterval = Math.max(2, Math.floor(baseInterval / (mult * waveMult)));

  // Relaja drásticamente el spawneo base si hay un jefe peleando en pantalla
  if (hasActiveBoss) {
    baseInterval = Math.floor(baseInterval * 2.5);
  }

  // Si se cumplió el tiempo de espera entre spawns...
  if (state.spawnTimer >= baseInterval) {
    state.spawnTimer = 0;
    
    // 1. Oleada Kamikaze de Enjambradores (Swarmers)
    // Entran en línea desde un borde aleatorio y cruzan el mapa entero.
    if (state.bossDefeatTimes.first && Math.random() < 0.16) {
       const count = 6 + Math.floor(Math.random() * 5);
       const margin = 100;
       const edge = Math.floor(Math.random() * 4); // 0: Top, 1: Right, 2: Bottom, 3: Left
       let sx, sy, isHoriz;
       
       if (edge === 0) { sx = Math.random() * state.width; sy = -margin; isHoriz = true; } 
       else if (edge === 1) { sx = state.width + margin; sy = Math.random() * state.height; isHoriz = false; } 
       else if (edge === 2) { sx = Math.random() * state.width; sy = state.height + margin; isHoriz = true; } 
       else { sx = -margin; sy = Math.random() * state.height; isHoriz = false; }

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
       return; // Se detiene aquí, la oleada swarmer absorbe este ciclo de spawn
    }

    // 2. Enemigos Especiales Avanzados (Desbloqueados por progreso de jefes)
    if (state.bossDefeatTimes.kyren && Math.random() < 0.22) {
       state.enemies.push(applyEnemyScaling(new RangerEnemy()));
       return;
    }
    if (state.bossDefeatTimes.amalgam && Math.random() < 0.08) {
       state.enemies.push(applyEnemyScaling(new MotherEnemy()));
       return;
    }

    // 3. Cantidad de Enemigos Estándar por Lote (Batch Spawning)
    // Permite generar varios enemigos simultáneos a medida que avanza la partida
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

    // 4. Tipo de enemigo estandar por Progreso Temporal
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
      
      // Spawneo Distribuido: Al no pasar x, y al constructor, este generará sus propios 
      // nodos aleatorios en los bordes para rodear al jugador naturalmente, evitando aglomeraciones.
      state.enemies.push(applyEnemyScaling(new StandardEnemy(enemyType)));
    }
  }
}

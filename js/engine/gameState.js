import { spatialGrid } from './SpatialHashGrid.js';
import { particlePool, projectilePool, gemPool, floatingTextPool } from './Pool.js';
import { cameraController } from './Camera.js';
import { environment } from './EnvironmentManager.js';

export const state = {
  isInMenu: true,
  isPaused: false,
  wasPaused: false,
  isGameOver: false,
  isAdPlaying: false,
  gameTime: 0,
  killCount: 0,
  lastFrameTime: performance.now(),
  hasRerolledCurrentLevel: false,
  nextBossTime: 300,
  nextWaveTime: 150,
  isWaveActive: false,
  waveTimer: 0,
  waveDuration: 20,
  spawnTimer: 0,
  
  godMode: false,
  disableSpawns: false,
  disableBossSpawns: false,
  disableEnemyCollisions: false,
  spawnRateMultiplier: 1.0,
  
  bossScaling: {},
  lastBossName: null,
  
  bossDefeatTimes: {
    first: null,
    kyren: null,
    amalgam: null
  },
  
  damageStats: {
    blaster: 0,
    orbitals: 0,
    nova: 0,
    shockwave: 0,
    missiles: 0,
    laserCannon: 0,
    shield: 0
  },

  width: 1920,
  height: 1920,
  
  // Camera & Environment
  camera: cameraController,
  cameraController: cameraController,
  environment: environment,

  pendingBossSpawn: null,

  player: null,
  enemies: [],
  bosses: [],
  currentAmalgamBoss: null,
  
  // Custom non-pool projectiles / effects
  projectiles: [],
  enemyProjectiles: [],
  acceleratingProjectiles: [],
  fallingProjectiles: [],
  shockwaves: [],
  laserBeams: [],
  hazardAreas: [],

  // Legacy arrays kept for compatibility, backed by pools
  gems: [],
  particles: [],
  floatingTexts: [],

  // Object pools & Spatial Partitioning
  spatialGrid,
  particlePool,
  projectilePool,
  gemPool,
  floatingTextPool,

  reset() {
    const destroyEntity = (e) => {
      if (!e) return;
      if (typeof e.destroy === 'function') {
        e.destroy();
      } else {
        if (e.sprite && e.sprite.destroy) {
          if (e.sprite.parent) e.sprite.parent.removeChild(e.sprite);
          e.sprite.destroy();
        }
        if (e.graphics && e.graphics.destroy) {
          if (e.graphics.parent) e.graphics.parent.removeChild(e.graphics);
          e.graphics.destroy();
        }
        if (e.container && e.container.destroy) {
          if (e.container.parent) e.container.parent.removeChild(e.container);
          e.container.destroy({ children: true });
        }
      }
    };

    if (this.player) {
      destroyEntity(this.player);
      this.player = null;
    }
    if (this.enemies) this.enemies.forEach(destroyEntity);
    if (this.bosses) this.bosses.forEach(destroyEntity);
    if (this.projectiles) this.projectiles.forEach(destroyEntity);
    if (this.enemyProjectiles) this.enemyProjectiles.forEach(destroyEntity);
    if (this.acceleratingProjectiles) this.acceleratingProjectiles.forEach(destroyEntity);
    if (this.fallingProjectiles) this.fallingProjectiles.forEach(destroyEntity);
    if (this.hazardAreas) this.hazardAreas.forEach(destroyEntity);
    if (this.shockwaves) this.shockwaves.forEach(destroyEntity);
    if (this.laserBeams) this.laserBeams.forEach(destroyEntity);
    if (this.gems) this.gems.forEach(destroyEntity);

    this.enemies = [];
    this.bosses = [];
    this.currentAmalgamBoss = null;
    this.pendingBossSpawn = null;
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.acceleratingProjectiles = [];
    this.fallingProjectiles = [];
    this.hazardAreas = [];
    this.shockwaves = [];
    this.laserBeams = [];
    this.gems = [];
    this.particles = [];
    this.floatingTexts = [];

    this.spatialGrid.clear();
    this.particlePool.clear();
    this.projectilePool.clear();
    this.gemPool.clear();
    this.floatingTextPool.clear();
    this.cameraController.reset();
    this.environment.reset();

    this.gameTime = 0;
    this.killCount = 0;
    this.nextBossTime = 300;
    this.nextWaveTime = 150;
    this.isWaveActive = false;
    this.waveTimer = 0;
    this.spawnTimer = 0;
    this.isPaused = false;
    this.isGameOver = false;
    this.isAdPlaying = false;
    this.hasRerolledCurrentLevel = false;
    this.bossScaling = {};
    this.lastBossName = null;
    this.bossDefeatTimes = {
      first: null,
      kyren: null,
      amalgam: null
    };
    this.spawnRateMultiplier = 1.0;
    this.disableEnemyCollisions = false;

    this.damageStats = {
      blaster: 0,
      orbitals: 0,
      nova: 0,
      shockwave: 0,
      missiles: 0,
      laserCannon: 0,
      shield: 0
    };
  },
  recordDamage(weapon, amount) {
    if (this.damageStats[weapon] !== undefined) {
      this.damageStats[weapon] += amount;
    }
  }
};

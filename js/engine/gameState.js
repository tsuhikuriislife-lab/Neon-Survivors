export const state = {
  isInMenu: true,
  isPaused: false,
  wasPaused: false,
  isGameOver: false,
  gameTime: 0,
  killCount: 0,
  lastFrameTime: performance.now(),
  hasRerolledCurrentLevel: false,
  nextBossTime: 300,
  spawnTimer: 0,
  
  godMode: false,
  disableSpawns: false,
  disableBossSpawns: false,
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
    laserCannon: 0
  },

  width: 1920,
  height: 1920,
  camera: {
    x: 960,
    y: 960,
    targetX: 960,
    targetY: 960,
    baseScale: 1.0,
    userZoom: 1.0,
    dpr: 1,
    screenWidth: typeof window !== 'undefined' ? window.innerWidth : 1920,
    screenHeight: typeof window !== 'undefined' ? window.innerHeight : 1080
  },

  pendingBossSpawn: null,

  player: null,
  enemies: [],
  bosses: [],
  currentAmalgamBoss: null,
  
  projectiles: [],
  enemyProjectiles: [],
  acceleratingProjectiles: [],
  fallingProjectiles: [],
  shockwaves: [],
  laserBeams: [],
  
  gems: [],
  hazardAreas: [],
  particles: [],
  floatingTexts: [],

  reset() {
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
    this.gameTime = 0;
    this.killCount = 0;
    this.nextBossTime = 300;
    this.spawnTimer = 0;
    this.isPaused = false;
    this.isGameOver = false;
    this.hasRerolledCurrentLevel = false;
    this.bossScaling = {};
    this.lastBossName = null;
    this.bossDefeatTimes = {
      first: null,
      kyren: null,
      amalgam: null
    };
    this.spawnRateMultiplier = 1.0;

    this.camera.x = 960;
    this.camera.y = 960;
    this.camera.targetX = 960;
    this.camera.targetY = 960;

    this.damageStats = {
      blaster: 0,
      orbitals: 0,
      nova: 0,
      shockwave: 0,
      missiles: 0,
      laserCannon: 0
    };
  },
  recordDamage(weapon, amount) {
    if (this.damageStats[weapon] !== undefined) {
      this.damageStats[weapon] += amount;
    }
  }
};



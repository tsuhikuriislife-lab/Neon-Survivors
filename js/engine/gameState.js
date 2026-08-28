export const state = {
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

  width: window.innerWidth,
  height: window.innerHeight,

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



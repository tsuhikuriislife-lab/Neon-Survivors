export const state = {
  isPaused: false,
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
  }
};


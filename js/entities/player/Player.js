import { BasePlayer } from './BasePlayer.js';
import { Blaster } from './weapons/Blaster.js';
import { OrbitalsSystem } from './weapons/OrbitalsSystem.js';
import { NovaSystem } from './weapons/NovaSystem.js';
import { ShockwaveSystem } from './weapons/ShockwaveSystem.js';
import { MissilesSystem } from './weapons/MissilesSystem.js';
import { LaserCannonSystem } from './weapons/LaserCannonSystem.js';

export class Player extends BasePlayer {
  constructor() {
    super();
  }

  initWeapons() {
    this.weapons = {
      blaster: new Blaster(this),
      orbitals: new OrbitalsSystem(this),
      nova: new NovaSystem(this),
      shockwave: new ShockwaveSystem(this),
      missiles: new MissilesSystem(this),
      laserCannon: new LaserCannonSystem(this)
    };
  }
}

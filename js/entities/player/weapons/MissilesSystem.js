import { Weapon } from './Weapon.js';
import { state } from '../../../engine/gameState.js';
import { MissileProjectile } from '../../projectiles/MissileProjectile.js';
import { ClusterBombMissile } from '../../projectiles/ClusterBombMissile.js';
import { audioManager } from '../../../engine/AudioManager.js';

export class MissilesSystem extends Weapon {
  constructor(player) {
    super(player);
    this.level = 0;
    this.count = 6;
    this.timer = 0;
    this.cooldown = 220;
    this.cooldownMult = 1.0;
    this.speed = 7;
    this.speedMult = 1.0;
    this.homing = 0.05;
    this.aoe = 140;
    this.aoeMult = 1.0;
    this.damage = 23;
    
    this.missilesQueue = 0;
    this.missileFireTimer = 0;
    this.isCluster = false;
  }

  update(dt) {
    if (this.level <= 0) return;
    
    this.timer++;
    if (this.timer >= (this.cooldown / (this.cooldownMult || 1.0)) * this.player.getEffectiveCooldownMult()) {
      this.timer = 0;
      this.missilesQueue = this.count;
    }

    if (this.missilesQueue > 0) {
      if (this.missileFireTimer <= 0) {
        this.fireSingleMissile();
        this.missilesQueue--;
        this.missileFireTimer = 6;
      } else {
        this.missileFireTimer--;
      }
    }
  }

  fireSingleMissile() {
    const angle = Math.random() * Math.PI * 2;
    const effSpeed = this.speed * this.speedMult;
    
    const MissileClass = this.isCluster ? ClusterBombMissile : MissileProjectile;
    
    state.projectiles.push(new MissileClass(
      this.player.x,
      this.player.y,
      Math.cos(angle) * effSpeed,
      Math.sin(angle) * effSpeed,
      this.damage * this.player.getEffectiveDamageMult(),
      this.homing,
      this.aoe * this.aoeMult
    ));
    audioManager.playSound('fire_missile', { volume: 0.5, throttleMs: 50 });
  }
}


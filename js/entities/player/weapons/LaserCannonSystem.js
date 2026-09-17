import { Weapon } from './Weapon.js';
import { state } from '../../../engine/gameState.js';
import { mouse, aimInput } from '../../../engine/Input.js';
import { LaserBeam } from '../../projectiles/LaserBeam.js';
import { audioManager } from '../../../engine/AudioManager.js';

export class LaserCannonSystem extends Weapon {
  constructor(player) {
    super(player);
    this.level = 0;
    this.chargeTimer = 0;
    this.maxCharge = 1140;
    this.fullyCharged = false;
    this.damage = 250; // default for reset
    this.width = 25;
    this.duration = 24;
    this.chargeSpeedMult = 1;
    this.damageMult = 1;
    this.widthMult = 1;
    this.subLasers = false;
    this.dot = false;
    this.dotDamage = 20;
    this.dotDuration = 5;
    this.tickDamage = false;
    this.soundNode = null;
    this.chargeUpgrades = 0;
    this.dmgUpgrades = 0;
    this.widthUpgrades = 0;
    this.lifeUpgrades = 0;
    this.dotUpgrades = 0;

    this.heat = 0;
    this.maxHeat = 240; // 4 seconds to overheat
    this.overheated = false;
    this.activeLaser = null;
    this.activeSubLasers = [];
    this.tickDamage = true;
    this.duration = 9999;
    this.chargeTimer = 0;
    this.chargeRequired = 90; // 1.5 seconds at 60fps
    this.timeNotFiring = 0;
    this.timeFiring = 0;
  }

  update(dt) {
    if (this.level <= 0) return;

    const isFiring = (mouse.down || aimInput.active);

    if (isFiring && !this.overheated) {
      this.timeNotFiring = 0;
      if (this.chargeTimer < this.chargeRequired) {
        // Charging phase
        this.chargeTimer++;
        
        // Ensure laser is off while charging
        this.destroyActiveLasers();
        if (state.camera && typeof state.camera.setAimOffset === 'function') state.camera.setAimOffset(0, 0);

        
        if (!this.player.laserChargeGraphics) {
          this.player.laserChargeGraphics = new PIXI.Graphics();
          if (this.player.container) this.player.container.addChild(this.player.laserChargeGraphics);
        }
        
        this.player.laserChargeGraphics.clear();
        const radius = (this.chargeTimer / this.chargeRequired) * 20; 
        
        const tipX = Math.cos(this.player.angle) * this.player.radius;
        const tipY = Math.sin(this.player.angle) * this.player.radius;
        
        this.player.laserChargeGraphics.beginFill(0xffff00, 0.8);
        this.player.laserChargeGraphics.drawCircle(tipX, tipY, radius);
        this.player.laserChargeGraphics.endFill();

      } else {
        // Firing phase
        if (this.player.laserChargeGraphics) this.player.laserChargeGraphics.clear();

        // Heating up
        this.timeFiring = (this.timeFiring || 0) + 1;
        const n = Math.floor(this.timeFiring / 120);
        const exponentialHeat = Math.pow(1.4, n);

        const tradeOffMult = 1.0 
                             + (this.subLasers ? 0.5 : 0) 
                             + ((this.dmgUpgrades || 0) * 0.1) 
                             + ((this.widthUpgrades || 0) * 0.1);

        const heatRate = this.player.hasActiveShield() ? (1 - (this.player.shield.rateBonusUpgrades || 0) * 0.05) : 1;
        
        this.heat += 1.0 * heatRate * (this.heatGenMult || 1.0) * tradeOffMult * exponentialHeat;
        
        if (this.heat >= this.maxHeat) {
          // Overheat trigger
          this.heat = this.maxHeat; 
          this.overheated = true;
          const batteryRatio = this.maxHeat / 240;
          this.overheatLockTimer = Math.floor(120 * batteryRatio); 
          this.destroyActiveLasers();
          if (state.camera && typeof state.camera.setAimOffset === 'function') state.camera.setAimOffset(0, 0);
          audioManager.playSound('error', { volume: 0.5, throttleMs: 200 }); 
        } else {
          // Firing logic
          let angle = this.player.angle; 

          if (state.camera && typeof state.camera.setAimOffset === 'function') {
             const aimDist = 160;
             state.camera.setAimOffset(Math.cos(angle) * aimDist, Math.sin(angle) * aimDist);
          }

          const effectiveLaserDmg = (this.damage * this.damageMult * this.player.getEffectiveDamageMult()) * 0.5;

          if (!this.activeLaser) {
             this.activeLaser = new LaserBeam(this.player.x, this.player.y, angle, effectiveLaserDmg, this.width * this.widthMult, 9999, false, this.dot ? this.dotDamage : 0, this.dot ? this.dotDuration : 0, true);
             state.laserBeams.push(this.activeLaser);
             
             if (this.subLasers) {
               const subWidth = (this.width * this.widthMult) * 0.25;
               const subDmg = effectiveLaserDmg * 0.25;
               this.activeSubLasers = [
                 new LaserBeam(this.player.x, this.player.y, angle - Math.PI / 6, subDmg, subWidth, 9999, true, this.dot ? this.dotDamage : 0, this.dot ? this.dotDuration : 0, true),
                 new LaserBeam(this.player.x, this.player.y, angle + Math.PI / 6, subDmg, subWidth, 9999, true, this.dot ? this.dotDamage : 0, this.dot ? this.dotDuration : 0, true)
               ];
               state.laserBeams.push(...this.activeSubLasers);
             }
          } else {
             // Update coordinates of continuous beam
             this.activeLaser.startX = this.player.x;
             this.activeLaser.startY = this.player.y;
             this.activeLaser.angle = angle;
             this.activeLaser.damage = effectiveLaserDmg;
             this.activeLaser.life = 9999;
             
             if (this.subLasers && this.activeSubLasers && this.activeSubLasers.length === 2) {
               this.activeSubLasers[0].startX = this.player.x; this.activeSubLasers[0].startY = this.player.y; this.activeSubLasers[0].angle = angle - Math.PI / 6; this.activeSubLasers[0].life = 9999; this.activeSubLasers[0].damage = effectiveLaserDmg * 0.25;
               this.activeSubLasers[1].startX = this.player.x; this.activeSubLasers[1].startY = this.player.y; this.activeSubLasers[1].angle = angle + Math.PI / 6; this.activeSubLasers[1].life = 9999; this.activeSubLasers[1].damage = effectiveLaserDmg * 0.25;
             }
          }
          
          if (state.particlePool && Math.random() < 0.2) {
             const p = state.particlePool.acquire(this.player.x, this.player.y, "#00ff00", 3, 0.05, 3);
             if (p) {
               p.vx = Math.cos(angle + (Math.random()-0.5)) * 4;
               p.vy = Math.sin(angle + (Math.random()-0.5)) * 4;
             }
          }
          audioManager.playSound('hit_laser_cannon', { volume: 0.2, throttleMs: 80 }); 
        }
      }
    } else {
      // Cooling down or not firing
      this.chargeTimer = 0;

      if (state.camera && typeof state.camera.setAimOffset === 'function') {
         state.camera.setAimOffset(0, 0);
      }
      this.destroyActiveLasers();
      this.timeNotFiring++; 
      
      this.timeFiring = Math.max(0, (this.timeFiring || 0) - 2);

      if (this.overheated && this.overheatLockTimer > 0) {
        this.overheatLockTimer--; 
      } else {
        if (!this.overheated && this.timeNotFiring < 90) {
          // Aún reteniendo calor...
        } else {
          let baseCoolRate = this.overheated ? 0.35 : 0.75;
          if (this.coolantInstalled) baseCoolRate *= 2.0;

          const extraFrames = Math.max(0, this.timeNotFiring - (this.overheated ? 0 : 90));
          let acceleration = 1.0 + (extraFrames / 60) * 0.25;
          acceleration = Math.min(acceleration, 5.0); 

          const finalCoolRate = baseCoolRate * acceleration;
          this.heat = Math.max(0, this.heat - finalCoolRate);
          
          if (this.heat === 0) {
            this.overheated = false;
            this.timeFiring = 0; 
          }
        }
      }
    }
  }

  destroyActiveLasers() {
    if (this.activeLaser) {
      this.activeLaser.life = 0;
      this.activeLaser = null;
    }
    if (this.activeSubLasers) {
      this.activeSubLasers.forEach(l => { if(l) l.life = 0; });
      this.activeSubLasers = [];
    }
  }
  destroy() {
    this.destroyActiveLasers();
    if (this.soundNode) {
      try {
        this.soundNode.stop();
        this.soundNode.disconnect();
      } catch (e) {}
      this.soundNode = null;
    }
  }
}

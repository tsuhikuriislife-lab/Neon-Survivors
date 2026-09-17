import { Weapon } from './Weapon.js';
import { state } from '../../../engine/gameState.js';
import { Shockwave } from '../../projectiles/Shockwave.js';
import { audioManager } from '../../../engine/AudioManager.js';

export class ShockwaveSystem extends Weapon {
  constructor(player) {
    super(player);
    this.level = 0;
    this.count = 1;
    this.countUpgrades = 0;
    this.timer = 0;
    this.cooldown = 230;
    this.cooldownMult = 1.0;
    this.radius = 175;
    this.radiusMult = 1.0;
    this.damage = 150;
    this.damageMult = 1.0;
    this.rangeUpgrades = 0;
    this.rateUpgrades = 0;
    this.unbound = false;

    this.shockwaveQueue = 0;
    this.shockwaveFireTimer = 0;
    this.shockwaveBurstPoints = [];
  }

  update(dt) {
    if (this.level <= 0) return;

    this.timer++;
    if (this.timer >= (this.cooldown / (this.cooldownMult || 1.0)) * this.player.getEffectiveCooldownMult()) {
      this.timer = 0;
      this.shockwaveQueue = this.count || 1;
      this.shockwaveBurstPoints = []; 
    }

    if (this.shockwaveQueue > 0) {
      if (this.shockwaveFireTimer <= 0) {
        this.fireSingleShockwave();
        this.shockwaveQueue--;
        this.shockwaveFireTimer = 4;
      } else {
        this.shockwaveFireTimer--;
      }
    }
  }

  fireSingleShockwave() {
    const finalRadius = this.radius * (this.radiusMult || 1.0);
    const finalDamage = this.damage * (this.damageMult || 1.0) * this.player.getEffectiveDamageMult();

    let spawnX = this.player.x;
    let spawnY = this.player.y;

    if (this.unbound) {
      const margin = 50;
      const arenaW = state.width || 1920;
      const arenaH = state.height || 1920;
      const minDistance = finalRadius * 2;

      let found = false;
      for (let attempt = 0; attempt < 30; attempt++) {
        const candX = Math.random() * (arenaW - margin * 2) + margin;
        const candY = Math.random() * (arenaH - margin * 2) + margin;

        const tooClose = this.shockwaveBurstPoints.some(pt => {
          return Math.hypot(candX - pt.x, candY - pt.y) < minDistance;
        });

        if (!tooClose) {
          spawnX = candX;
          spawnY = candY;
          found = true;
          break;
        }
      }

      if (!found) {
        spawnX = Math.random() * (arenaW - margin * 2) + margin;
        spawnY = Math.random() * (arenaH - margin * 2) + margin;
      }

      this.shockwaveBurstPoints.push({ x: spawnX, y: spawnY });
    }

    state.shockwaves.push(new Shockwave(spawnX, spawnY, finalRadius, finalDamage));

    const sfxVolume = this.unbound ? 0.45 : 0.7;
    audioManager.playSound('fire_shockwave', { volume: sfxVolume, throttleMs: 50 });
  }
}


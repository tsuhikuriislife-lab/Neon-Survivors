import { Weapon } from './Weapon.js';
import { state } from '../../../engine/gameState.js';
import { NovaProjectile } from '../../projectiles/NovaProjectile.js';
import { audioManager } from '../../../engine/AudioManager.js';

export class NovaSystem extends Weapon {
  constructor(player) {
    super(player);
    this.level = 0;
    this.count = 6;
    this.timer = 0;
    this.cooldown = 400;
    this.cooldownMult = 1.0;
    this.speed = 6;
    this.speedMult = 1.0;
    this.spiral = false;
    this.isLightning = false;
  }

  update(dt) {
    if (this.level <= 0) return;
    this.timer++;
    if (this.timer >= (this.cooldown / (this.cooldownMult || 1.0)) * this.player.getEffectiveCooldownMult()) {
      this.timer = 0;
      this.fire();
    }
  }

  fire() {
    // Nova damage is based on blaster base damage * 1.5
    // Wait, the player will now have player.weapons.blaster as an object.
    const baseDamage = this.player.weapons.blaster ? this.player.weapons.blaster.damage : 10;
    const damage = baseDamage * 1.5 * this.player.getEffectiveDamageMult();
    const effSpeed = this.speed * this.speedMult;
    const color = this.isLightning ? "#ffff00" : "#0088ff";
    
    for (let i = 0; i < this.count; i++) {
      const a = (i * 2 * Math.PI) / this.count;
      state.projectiles.push(new NovaProjectile(
        this.player.x, 
        this.player.y, 
        Math.cos(a) * effSpeed, 
        Math.sin(a) * effSpeed, 
        damage,
        this.spiral,
        color
      ));
    }
    audioManager.playSound('fire_nova', { volume: 0.6, throttleMs: 100 });
  }
}


import { Weapon } from './Weapon.js';
import { state } from '../../../engine/gameState.js';
import { LaserBeam } from '../../projectiles/LaserBeam.js';
import { acquireNearestLaserTarget } from '../../projectiles/LaserTargeting.js';
import { audioManager } from '../../../engine/AudioManager.js';

const FRAMES_PER_SECOND = 60;

/**
 * Fires world-anchored laser paths at the nearest valid enemy on an automatic cadence.
 * The weapon owns firing timing and upgrade stats; each beam owns its path and damage ticks.
 */
export class LaserCannonSystem extends Weapon {
  constructor(player) {
    super(player);
    this.level = 0;

    // The six-second base cadence keeps the new persistent beam distinct from fast weapons.
    this.cooldown = 9 * FRAMES_PER_SECOND;
    this.cooldownMult = 1.0;
    this.timer = 0;

    this.damage = 55;
    this.width = 50;
    this.damageMult = 1.0;
    this.widthMult = 1.0;

    // Base beams last three seconds and pulse damage twice per second.
    this.beamLife = 1.5 * FRAMES_PER_SECOND;
    this.baseDamageInterval = 0.5 * FRAMES_PER_SECOND;
    this.damageIntervalMult = 1.0;
    this.bounceCount = 0;

    this.subLasers = false;
    this.dot = false;
    this.dotDamage = 20;
    this.dotDuration = 5;

    this.bounceUpgrades = 0;
    this.dmgUpgrades = 0;
    this.widthUpgrades = 0;
    this.damageIntervalUpgrades = 0;
    this.durationUpgrades = 0;
    this.dotUpgrades = 0;

    // Active beams are tracked so resetting or destroying this weapon clears their graphics.
    this.activeBeams = new Set();
  }

  /**
   * Advances the cooldown and fires when a valid target is available.
   * @param {number} dt - Fixed simulation delta in seconds (weapon timing uses 60 Hz frames).
   * @returns {void}
   */
  update(dt) {
    if (this.level <= 0) return;

    const globalCooldownMult = this.player.getEffectiveCooldownMult
      ? this.player.getEffectiveCooldownMult()
      : 1.0;
    const effectiveCooldown = Math.max(
      1,
      Math.round((this.cooldown / (this.cooldownMult || 1.0)) * globalCooldownMult)
    );

    // Clamp at ready so a missing target does not reset the cadence or delay the next valid shot.
    this.timer = Math.min(this.timer + 1, effectiveCooldown);
    if (this.timer < effectiveCooldown) return;

    const target = acquireNearestLaserTarget(this.player.x, this.player.y);
    if (!target) return;

    this.timer = 0;
    this.fire(target);
  }

  /**
   * Creates one main ray and, when unlocked, two weaker diagonal rays from the same world point.
   * @param {object} target - The closest living target selected for this shot.
   * @returns {void}
   */
  fire(target) {
    const angle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
    const damage = this.damage * this.damageMult * this.player.getEffectiveDamageMult() * 0.5;
    const width = this.width * this.widthMult;

    // Beam constructors capture player coordinates now, then retain that path as a map-space object.
    this.spawnBeam(angle, damage, width, false);
    if (this.subLasers) {
      this.spawnBeam(angle - Math.PI / 6, damage * 0.25, width * 0.25, true);
      this.spawnBeam(angle + Math.PI / 6, damage * 0.25, width * 0.25, true);
    }

    audioManager.playSound('hit_laser_cannon', { volume: 0.35, throttleMs: 150 });
  }

  /**
   * Creates and registers an independent reflected beam at the player's current map position.
   * @param {number} angle - Launch direction in radians.
   * @param {number} damage - Damage applied on each beam pulse.
   * @param {number} width - Collision and visual width of this beam.
   * @param {boolean} isSubLaser - Whether this is one of the auxiliary rays.
   * @returns {LaserBeam} The newly created beam.
   */
  spawnBeam(angle, damage, width, isSubLaser) {
    const beam = new LaserBeam(
      this.player.x,
      this.player.y,
      angle,
      damage,
      width,
      this.beamLife,
      {
        bounceCount: this.bounceCount,
        damageInterval: this.getDamageIntervalFrames(),
        dotDamage: this.dot ? this.dotDamage : 0,
        dotDuration: this.dot ? this.dotDuration : 0,
        isSubLaser,
        owner: this
      }
    );

    state.laserBeams.push(beam);
    this.activeBeams.add(beam);
    return beam;
  }

  /**
   * Returns the damage pulse interval after percentage-based interval upgrades.
   * @returns {number} Number of fixed simulation frames between damage pulses.
   */
  getDamageIntervalFrames() {
    return Math.max(8, Math.round(this.baseDamageInterval * this.damageIntervalMult));
  }

  /**
   * Removes every beam belonging to this weapon when the player resets or is destroyed.
   * @returns {void}
   */
  destroy() {
    for (const beam of this.activeBeams) beam.destroy();
    this.activeBeams.clear();
  }
}

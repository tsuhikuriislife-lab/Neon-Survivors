import { state } from '../../engine/gameState.js';
import { keys, mouse, getMovementVector, aimInput, updateAimJoystickUI } from '../../engine/Input.js';
import { dist } from '../../engine/Utils.js';
import { spawnExplosion } from '../effects/spawnExplosion.js';
import { Projectile } from '../projectiles/Projectile.js';
import { Shockwave } from '../projectiles/Shockwave.js';
import { NovaProjectile } from '../projectiles/NovaProjectile.js';
import { MissileProjectile } from '../projectiles/MissileProjectile.js';
import { LaserBeam } from '../projectiles/LaserBeam.js';
import { showUpgradeMenu, triggerGameOver, updateHUD } from '../../ui/UIManager.js';
import { audioManager } from '../../engine/AudioManager.js';
import { textures, drawCachedTexture, getOrCachePolygon } from '../../engine/TextureCache.js';

export class Player {
  constructor() {
    this.x = state.width / 2;
    this.y = state.height / 2;
    this.radius = 16;
    this.baseSpeed = 3.8;
    this.speed = 3.8;
    this.speedUpgradesCount = 0;
    this.maxHp = 100;
    this.hp = 100;
    this.hullUpgradesCount = 0;
    this.hpRegen = 0;
    this.regenUpgradesCount = 0;
    this.level = 1;
    this.xp = 0;
    this.nextXp = 10;
    this.pickupRadius = 130;
    this.magnetUpgrades = 0;
    this.angle = 0;
    this.hasRevivedOnce = false;
    
    this.missilesQueue = 0;
    this.missileFireTimer = 0;

    this.invulnerabilityMaxTime = 1.5;
    this.invulnerabilityTimer = 0;
    this.iFrameUpgradesCount = 0;

    this.slowTimer = 0;
    this.damageMult = 1.0;
    this.damageUpgradesCount = 0;
    this.cooldownMult = 1.0;
    this.blasterRateUpgrades = 0;
    this.critChance = 0.0;
    this.critDamage = 1.5;
    this.xpMultiplier = 1.0;
    
    this.doubleGemChance = 0;
    this.doubleGemUpgradesCount = 0;
    this.acquiredUpgrades = {};

    this.activeSkill = {
      id: 'dash',
      level: 1,
      timer: 0,
      cooldown: 3, 
      duration: 0.5, 
      activeTimer: 0,
      isActive: false,
      emoji: '⚡',
      color: '#ffff00'
    };

    this.shield = {
      unlocked: false,
      charges: 0,
      maxCharges: 1,
      rechargeTimer: 0,
      baseRechargeTime: 12,
      rechargeSpeedMult: 1.0,
      damageBonusUpgrades: 0,
      rateBonusUpgrades: 0,
      rechargeUpgrades: 0,
      explodeOnBreak: false,
      explodeRadius: 240,
      explodeDamage: 1200,
      saveChargeChance: 0.0,
      saveChanceUpgrades: 0,
      extraChargesUpgrades: 0
    };

    this.weapons = {
      blaster: { level: 1, timer: 0, cooldown: 60, projectileCount: 1, damage: 22, range: 500, speed: 12, homing: 0, homingUpgrades: 0 },
      orbitals: { level: 0, count: 2, radius: 120, angle: 0, speed: 0.05, damage: 35, tickTimer: 0, tickInterval: 10, size: 12, countUpgrades: 0, sizeUpgrades: 0, speedUpgrades: 0 },
      nova: { level: 0, count: 6, timer: 0, cooldown: 400, speed: 6, spiral: false },
      shockwave: { level: 0, timer: 0, cooldown: 230, radius: 175, damage: 150, rangeUpgrades: 0, rateUpgrades: 0 },
      missiles: { level: 0, count: 6, timer: 0, cooldown: 220, speed: 7, homing: 0.05, aoe: 70, damage: 23, countUpgrades: 0, speedUpgrades: 0, homingUpgrade: false, aoeUpgrades: 0 },
      laserCannon: { level: 0, chargeTimer: 0, maxCharge: 1140, fullyCharged: false, damage: 250, width: 25, duration: 24, chargeSpeedMult: 1, damageMult: 1, widthMult: 1, subLasers: false, dot: false, dotDamage: 20, dotDuration: 5, tickDamage: false, soundNode: null, chargeUpgrades: 0, dmgUpgrades: 0, widthUpgrades: 0, lifeUpgrades: 0, dotUpgrades: 0 }
    };
  }

  unlockShield() {
    this.shield.unlocked = true;
    this.shield.charges = this.shield.maxCharges;
    this.shield.rechargeTimer = 0;
  }

  hasActiveShield() {
    return !!(this.shield && this.shield.unlocked && this.shield.charges > 0);
  }

  getShieldColor(charges = (this.shield ? this.shield.charges : 1)) {
    if (charges >= 3) return "#ffffff"; // 3 cargas: blanco
    if (charges === 2) return "#70d6ff"; // 2 cargas: celeste
    return "#00aaff"; // 1 carga: azul
  }

  getShieldTargetRechargeColor() {
    if (!this.shield) return "#00aaff";
    const nextCharge = Math.min(this.shield.maxCharges, this.shield.charges + 1);
    return this.getShieldColor(nextCharge);
  }

  getEffectiveDamageMult() {
    let mult = this.damageMult;
    if (this.hasActiveShield()) {
      mult += (this.shield.damageBonusUpgrades || 0) * 0.05;
    }
    return mult;
  }

  getEffectiveCooldownMult() {
    let mult = this.cooldownMult;
    if (this.hasActiveShield()) {
      const speedBonus = (this.shield.rateBonusUpgrades || 0) * 0.05;
      mult = mult / (1 + speedBonus);
    }
    return mult;
  }

  update(dt) {
    if (this.invulnerabilityTimer > 0) {
      this.invulnerabilityTimer -= dt;
    }

    if (this.hpRegen > 0 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.hpRegen * dt);
    }

    // Shield passive recharge
    if (this.shield && this.shield.unlocked) {
      if (this.shield.charges < this.shield.maxCharges) {
        this.shield.rechargeTimer += dt * this.shield.rechargeSpeedMult;
        if (this.shield.rechargeTimer >= this.shield.baseRechargeTime) {
          this.shield.rechargeTimer = 0;
          this.shield.charges = Math.min(this.shield.maxCharges, this.shield.charges + 1);
          const cColor = this.getShieldColor(this.shield.charges);
          if (state.floatingTextPool) {
            state.floatingTextPool.acquire(this.x, this.y - 25, "+1 ESCUDO", cColor, 14);
          }
          audioManager.playSound('hit_satellite', { volume: 0.6, pitch: 1.4, throttleMs: 100 });
          spawnExplosion(this.x, this.y, cColor, 12, 2.0);
          updateHUD();
        }
      } else {
        this.shield.rechargeTimer = 0;
      }
    }

    if (this.slowTimer > 0) {
      this.slowTimer--;
      this.speed = this.baseSpeed * 0.75;
    } else {
      this.speed = this.baseSpeed;
    }

    if (this.activeSkill && this.activeSkill.isActive && this.activeSkill.id === 'dash') {
      this.speed *= 2.5;
      if (state.particlePool && Math.random() < 0.65) {
        state.particlePool.acquire(this.x + (Math.random() * 10 - 5), this.y + (Math.random() * 10 - 5), this.activeSkill.color || "#ffff00", 3, 0.08, 3.5);
      }
    }

    const move = getMovementVector();
    let dx = move.dx;
    let dy = move.dy;

    this.x += dx * this.speed;
    this.y += dy * this.speed;

    this.x = Math.max(this.radius, Math.min(state.width - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(state.height - this.radius, this.y));

    if (aimInput.active && this.weapons.laserCannon && this.weapons.laserCannon.level > 0) {
      this.angle = aimInput.angle;
    } else if (mouse.down && this.weapons.laserCannon && this.weapons.laserCannon.level > 0 && this.weapons.laserCannon.fullyCharged) {
      this.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
    } else if (dx !== 0 || dy !== 0) {
      this.angle = Math.atan2(dy, dx);
      if (Math.random() < 0.35 && state.particlePool) {
        state.particlePool.acquire(this.x, this.y, "#00f0ff", 1, 0.05, 2);
      }
    }

    this.updateBlaster();
    this.updateOrbitals();
    this.updateShockwave();
    this.updateNova();
    this.updateMissiles();
    this.updateLaserCannon();
    this.updateActiveSkill(dt);
  }

  onPause() {
    for (const key in this.weapons) {
      const w = this.weapons[key];
      if (w.soundNode) {
        try { 
          w.soundNode.stop(); 
          w.soundNode.disconnect();
        } catch(e) {}
        w.soundNode = null;
      }
      if (w.charging !== undefined) {
        w.charging = false;
      }
    }
  }

  updateActiveSkill(dt) {
    if (!this.activeSkill || !this.activeSkill.id) return;
    
    if (this.activeSkill.isActive) {
      this.activeSkill.activeTimer -= dt;
      if (this.activeSkill.activeTimer <= 0) {
        this.activeSkill.isActive = false;
      }
    } else {
      if (this.activeSkill.timer > 0) {
        this.activeSkill.timer -= dt;
      } else if (keys[' ']) {
        this.triggerActiveSkill();
      }
    }
  }

  triggerActiveSkill() {
    this.activeSkill.isActive = true;
    this.activeSkill.activeTimer = this.activeSkill.duration;
    this.activeSkill.timer = this.activeSkill.cooldown;
    
    if (this.activeSkill.id === 'dash') {
      audioManager.playSound('ui_click', { volume: 0.5, throttleMs: 0 });
      if (state.camera && typeof state.camera.setZoom === 'function') {
        state.camera.setZoom(1.05, (this.activeSkill.duration - 0.3) , 0.3, 0.3);
      }
      if (state.particlePool) {
        for (let i = 0; i < 15; i++) {
          const p = state.particlePool.acquire(this.x, this.y, this.activeSkill.color, 4, 0.05, 5);
          if (p) {
            p.vx = (Math.random() - 0.5) * 10;
            p.vy = (Math.random() - 0.5) * 10;
          }
        }
      }
    }
  }

  updateBlaster() {
    const w = this.weapons.blaster;
    if (w.level <= 0) return;
    w.timer++;
    if (w.timer >= w.cooldown * this.getEffectiveCooldownMult()) {
      w.timer = 0;
      this.fireBlaster();
    }
  }

  fireBlaster() {
    const w = this.weapons.blaster;
    let closest = state.spatialGrid.getNearest(this.x, this.y, w.range);
    let minD = w.range;

    if (closest) {
      minD = dist(this.x, this.y, closest.x, closest.y);
    }

    // Also check boss targets if closer
    for (let b of state.bosses) {
      for (let target of b.getTargetables()) {
        const d = dist(this.x, this.y, target.x, target.y);
        if (d < minD) {
          minD = d;
          closest = target;
        }
      }
    }

    const baseAngle = closest ? Math.atan2(closest.y - this.y, closest.x - this.x) : this.angle;
    const count = w.projectileCount;
    const dmg = w.damage * this.getEffectiveDamageMult();
    const homing = w.homing || 0;

    for (let i = 0; i < count; i++) {
      const spread = count > 1 ? (i - (count - 1) / 2) * 0.09 : 0;
      const finalAngle = baseAngle + spread;
      const vx = Math.cos(finalAngle) * w.speed;
      const vy = Math.sin(finalAngle) * w.speed;

      if (state.projectilePool) {
        state.projectilePool.acquire(this.x, this.y, vx, vy, dmg, "#00ffff", 4, false, homing);
      } else {
        state.projectiles.push(new Projectile(this.x, this.y, vx, vy, dmg, "#00ffff", 4, false, homing));
      }
    }
    
    audioManager.playSound('fire_main_gun', { volume: 0.3, throttleMs: 100 });
  }

  updateOrbitals() {
    const w = this.weapons.orbitals;
    if (w.level <= 0) return;
    w.angle += w.speed;
    
    if (!w.timers) w.timers = [];

    for (let i = 0; i < w.count; i++) {
      if (w.timers[i] === undefined) {
        w.timers[i] = Math.floor((i / w.count) * w.tickInterval);
      }
      w.timers[i]++;

      if (w.timers[i] >= w.tickInterval) {
        w.timers[i] = 0;
        const curAng = w.angle + (i * 2 * Math.PI) / w.count;
        const ox = this.x + Math.cos(curAng) * w.radius;
        const oy = this.y + Math.sin(curAng) * w.radius;
        const orbRadius = w.size;
        const orbDmg = w.damage * this.getEffectiveDamageMult();

        // Query spatial grid for nearby enemies
        state.spatialGrid.queryRadius(ox, oy, orbRadius, (e) => {
          if (e.hp <= 0) return;
          e.takeDamage(orbDmg, "#ff00ff");
          state.recordDamage('orbitals', orbDmg);
          spawnExplosion(ox, oy, "#ff00ff", 3, 1.5);
          audioManager.playSound('hit_satellite', { volume: 0.5, throttleMs: 50 });
        });

        // Check bosses
        for (let b of state.bosses) {
          const damagedParents = new Set();
          for (let t of b.getTargetables()) {
            const actualTarget = t.parent || t;
            if (damagedParents.has(actualTarget)) continue;

            if (dist(ox, oy, t.x, t.y) < orbRadius + t.radius) {
              t.takeDamage(orbDmg, "#ff00ff");
              state.recordDamage('orbitals', orbDmg);
              spawnExplosion(ox, oy, "#ff00ff", 3, 1.5);
              damagedParents.add(actualTarget);
              audioManager.playSound('hit_satellite', { volume: 0.5, throttleMs: 50 });
            }
          }
        }
      }
    }
  }

  updateShockwave() {
    const w = this.weapons.shockwave;
    if (w.level <= 0) return;
    w.timer++;
    if (w.timer >= w.cooldown * this.getEffectiveCooldownMult()) {
      w.timer = 0;
      state.shockwaves.push(new Shockwave(this.x, this.y, w.radius, w.damage * this.getEffectiveDamageMult()));
      audioManager.playSound('fire_shockwave', { volume: 0.7, throttleMs: 100 });
    }
  }

  updateNova() {
    const w = this.weapons.nova;
    if (w.level <= 0) return;
    w.timer++;
    if (w.timer >= w.cooldown * this.getEffectiveCooldownMult()) {
      w.timer = 0;
      this.fireNova();
    }
  }

  fireNova() {
    const w = this.weapons.nova;
    const damage = this.weapons.blaster.damage * 1.5 * this.getEffectiveDamageMult();
    for (let i = 0; i < w.count; i++) {
      const a = (i * 2 * Math.PI) / w.count;
      state.projectiles.push(new NovaProjectile(
        this.x, 
        this.y, 
        Math.cos(a) * w.speed, 
        Math.sin(a) * w.speed, 
        damage,
        w.spiral
      ));
    }
    audioManager.playSound('fire_nova', { volume: 0.6, throttleMs: 100 });
  }

  updateMissiles() {
    const w = this.weapons.missiles;
    if (w.level <= 0) return;
    
    w.timer++;
    if (w.timer >= w.cooldown * this.getEffectiveCooldownMult()) {
      w.timer = 0;
      this.missilesQueue = w.count;
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
    const w = this.weapons.missiles;
    const angle = Math.random() * Math.PI * 2;
    state.projectiles.push(new MissileProjectile(
      this.x,
      this.y,
      Math.cos(angle) * w.speed,
      Math.sin(angle) * w.speed,
      w.damage * this.getEffectiveDamageMult(),
      w.homing,
      w.aoe
    ));
    audioManager.playSound('fire_missile', { volume: 0.5, throttleMs: 50 });
  }

  updateLaserCannon() {
    const w = this.weapons.laserCannon;
    if (w.level <= 0) {
      mouse.justReleased = false;
      aimInput.justReleased = false;
      return;
    }

    if (!w.fullyCharged) {
      if (state.camera && typeof state.camera.setAimOffset === 'function') {
        state.camera.setAimOffset(0, 0);
      }
      mouse.justReleased = false;
      aimInput.justReleased = false;

      if (!w.charging) {
         w.charging = true;
         const chargeTimeSeconds = (w.maxCharge / w.chargeSpeedMult) / 60;
         const soundBaseLen = 19; 
         const speed = soundBaseLen / chargeTimeSeconds;
         const chargeRatio = w.chargeTimer / w.maxCharge;
         const offset = chargeRatio * soundBaseLen;
         const res = audioManager.playSound('charge_laser_cannon', { volume: 0.5, throttleMs: 0, speed: speed, offset: offset, randomPitch: false });
         if (res) w.soundNode = res.source;
      }

      const rateMult = this.hasActiveShield() ? (1 + (this.shield.rateBonusUpgrades || 0) * 0.05) : 1;
      w.chargeTimer += w.chargeSpeedMult * rateMult;
      
      const chargeRatio = w.chargeTimer / w.maxCharge;
      if (Math.random() < chargeRatio * 0.8 && state.particlePool) {
         const angle = Math.random() * Math.PI * 2;
         const distP = 50 + Math.random() * 50;
         const px = this.x + Math.cos(angle) * distP;
         const py = this.y + Math.sin(angle) * distP;
         const p = state.particlePool.acquire(px, py, "#00ff00", 2 + chargeRatio * 3, 0.05, 3);
         if (p) {
           p.vx = -Math.cos(angle) * (2 + chargeRatio * 2);
           p.vy = -Math.sin(angle) * (2 + chargeRatio * 2);
         }
      }

      if (w.chargeTimer >= w.maxCharge) {
        w.fullyCharged = true;
        w.charging = false;
        w.chargeTimer = 0;
        mouse.justReleased = false;
        aimInput.justReleased = false;
        if (w.soundNode) {
          try { w.soundNode.stop(); } catch(e){}
          w.soundNode = null;
        }
        
        if (state.particlePool) {
          for (let i = 0; i < 20; i++) {
            const a = Math.random() * Math.PI * 2;
            const p = state.particlePool.acquire(this.x, this.y, "#00ff00", 4, 0.03, 3);
            if (p) {
              p.vx = Math.cos(a) * Math.random() * 5;
              p.vy = Math.sin(a) * Math.random() * 5;
            }
          }
        }
      }
    } else {
      // Fully Charged: Check Aiming Peek & Camera Offset
      const isMobileAiming = aimInput.active;
      const isDesktopAiming = mouse.down;

      if (state.camera && typeof state.camera.setAimOffset === 'function') {
        if (isMobileAiming) {
          const aimDist = 160;
          state.camera.setAimOffset(Math.cos(aimInput.angle) * aimDist, Math.sin(aimInput.angle) * aimDist);
        } else if (isDesktopAiming) {
          const aimAngle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
          const aimDist = 160;
          state.camera.setAimOffset(Math.cos(aimAngle) * aimDist, Math.sin(aimAngle) * aimDist);
        } else {
          state.camera.setAimOffset(0, 0);
        }
      }

      const isMobileFire = aimInput.justReleased;
      const isDesktopFire = mouse.justReleased;

      if (isMobileFire || isDesktopFire) {
         let angle;
         if (isMobileFire) {
            angle = aimInput.angle;
            aimInput.justReleased = false;
         } else {
            angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
            mouse.justReleased = false;
         }

         w.fullyCharged = false;
         w.chargeTimer = 0;

         if (state.camera && typeof state.camera.setAimOffset === 'function') {
           state.camera.setAimOffset(0, 0);
         }
         
         const effectiveLaserDmg = w.damage * w.damageMult * this.getEffectiveDamageMult();
         state.laserBeams.push(new LaserBeam(
            this.x, this.y, angle, 
            effectiveLaserDmg, 
            w.width * w.widthMult, 
            w.duration, 
            false, 
            w.dot ? w.dotDamage : 0, 
            w.dot ? w.dotDuration : 0, 
            w.tickDamage
         ));
         
         if (w.subLasers) {
             const subWidth = (w.width * w.widthMult) * 0.25;
             const subDmg = effectiveLaserDmg * 0.25;
             state.laserBeams.push(new LaserBeam(
                this.x, this.y, angle - Math.PI / 6, 
                subDmg, subWidth, w.duration, true, 
                w.dot ? w.dotDamage : 0, 
                w.dot ? w.dotDuration : 0, 
                w.tickDamage
             ));
             state.laserBeams.push(new LaserBeam(
                this.x, this.y, angle + Math.PI / 6, 
                subDmg, subWidth, w.duration, true, 
                w.dot ? w.dotDamage : 0, 
                w.dot ? w.dotDuration : 0, 
                w.tickDamage
             ));
         }

         audioManager.playSound('fire_laser_cannon', { volume: 0.8, throttleMs: 50 });

         if (state.camera && typeof state.camera.shake === 'function') {
           state.camera.shake({ strength: 18, duration: 0.48, rotation: 0.06, scale: 0.05 });
         }

         if (state.particlePool) {
            for (let i = 0; i < 15; i++) {
               const a = angle + (Math.random() - 0.5) * 0.5;
               const p = state.particlePool.acquire(this.x, this.y, "#00ff00", 3, 0.04, 3);
               const s = Math.random() * 6 + 2;
               if (p) {
                 p.vx = Math.cos(a) * s;
                 p.vy = Math.sin(a) * s;
               }
            }
         }
      }
    }
  }

  takeDamage(amount, damageColor = "#ff2255") {
    if (state.godMode) return;
    if (this.invulnerabilityTimer > 0) return;
    if (this.activeSkill && this.activeSkill.isActive && this.activeSkill.id === 'dash') return;
    
    // Check Active Shield
    if (this.hasActiveShield()) {
      const activeColor = this.getShieldColor(this.shield.charges);
      const isSaved = Math.random() < (this.shield.saveChargeChance || 0);

      if (!isSaved) {
        this.shield.charges = Math.max(0, this.shield.charges - 1);
      }

      // Halve invulnerability time when taking damage with shield active
      this.invulnerabilityTimer = this.invulnerabilityMaxTime / 2;

      // Trigger shield explosion if rare upgrade acquired (or standard burst)
      if (this.shield.explodeOnBreak) {
        this.triggerShieldExplosion(activeColor);
      } else {
        spawnExplosion(this.x, this.y, activeColor, 18, 3.0);
      }

      if (state.camera && typeof state.camera.shake === 'function') {
        state.camera.shake({ strength: 8, duration: 0.25, rotation: 0.03, scale: 0.02 });
      }

      if (isSaved) {
        if (state.floatingTextPool) {
          state.floatingTextPool.acquire(this.x, this.y - 25, "DEFLECTED!", activeColor, 15);
        }
        audioManager.playSound('hit_satellite', { volume: 0.7, pitch: 1.3, throttleMs: 50 });
      } else {
        audioManager.playSound('hit_satellite', { volume: 0.6, pitch: 0.9, throttleMs: 50 });
      }

      updateHUD();
      return; // Damage to HP fully prevented!
    }

    this.hp -= amount;
    this.invulnerabilityTimer = this.invulnerabilityMaxTime;
    const offsetX = (Math.random() * 2 - 1) * (this.radius * 0.8);
    const offsetY = (Math.random() * 2 - 1) * (this.radius * 0.8);
    
    if (state.floatingTextPool) {
      state.floatingTextPool.acquire(this.x + offsetX, this.y + offsetY, `-${Math.round(amount)}`, damageColor, 16);
    }
    spawnExplosion(this.x, this.y, "#ff0055", 8, 2.5);

    if (state.camera && typeof state.camera.shake === 'function') {
      state.camera.shake({ strength: 10, duration: 0.3, rotation: 0.04, scale: 0.03 });
    }

    audioManager.playSound('hurt_player', { volume: 0.6, throttleMs: 50 });

    if (this.hp <= 0) {
      this.hp = 0;
      triggerGameOver();
    }
    updateHUD();
  }

  triggerShieldExplosion(color) {
    const explosionRadius = this.shield.explodeRadius || 240;
    const explosionDamage = (this.shield.explodeDamage || 1200) * this.getEffectiveDamageMult();

    // Visual Explosion in matching charge color
    spawnExplosion(this.x, this.y, color, 35, 4.5);
    
    // Add expanding visual shockwave in charge color
    state.shockwaves.push(new Shockwave(this.x, this.y, explosionRadius, explosionDamage, color, 'shield'));
    audioManager.playSound('fire_shockwave', { volume: 0.8, throttleMs: 50 });
    
    // Query spatial grid for enemies
    state.spatialGrid.queryRadius(this.x, this.y, explosionRadius, (e) => {
      if (e.hp <= 0) return;
      e.takeDamage(explosionDamage, color);
      state.recordDamage('shield', explosionDamage);
    });

    // Check Bosses
    for (let b of state.bosses) {
      const damagedParents = new Set();
      for (let t of b.getTargetables()) {
        const actualTarget = t.parent || t;
        if (damagedParents.has(actualTarget)) continue;

        if (dist(this.x, this.y, t.x, t.y) < explosionRadius + t.radius) {
          t.takeDamage(explosionDamage, color);
          state.recordDamage('shield', explosionDamage);
          damagedParents.add(actualTarget);
        }
      }
    }
  }

  grantUpgradeInvulnerability() {
    const statTime = this.invulnerabilityMaxTime || 1.5;
    if (this.invulnerabilityTimer <= statTime) {
      this.invulnerabilityTimer += statTime;
    }
  }

  gainXP(val) {
    const finalVal = Math.round(val * (this.xpMultiplier || 1.0));
    this.xp += finalVal;
    if (state.floatingTextPool) {
      state.floatingTextPool.acquire(this.x + (Math.random() * 20 - 10), this.y - 15, `+${finalVal} XP`, "#00ffcc", 11);
    }
    
    audioManager.playSound('pickup_gem', { volume: 0.3, throttleMs: 50 });

    if (this.xp >= this.nextXp) {
      this.levelUp();
    }
    updateHUD();
  }

  levelUp() {
    this.xp -= this.nextXp;
    this.level++;
    this.nextXp = Math.floor(this.nextXp * 1.05 + 6);
    state.hasRerolledCurrentLevel = false;
    showUpgradeMenu();
    updateHUD();
  }

  resetUpgrades() {
    this.baseSpeed = 3.8;
    this.speed = 3.8;
    this.speedUpgradesCount = 0;
    this.hpRegen = 0;
    this.regenUpgradesCount = 0;
    this.pickupRadius = 130;
    this.magnetUpgrades = 0;
    this.invulnerabilityMaxTime = 1.5;
    this.iFrameUpgradesCount = 0;
    this.damageMult = 1.0;
    this.damageUpgradesCount = 0;
    this.cooldownMult = 1.0;
    this.blasterRateUpgrades = 0;
    this.critChance = 0.0;
    this.critDamage = 1.5;
    this.xpMultiplier = 1.0;
    this.doubleGemChance = 0;
    this.doubleGemUpgradesCount = 0;
    this.acquiredUpgrades = {};
    this.maxHp = 100;
    this.hp = Math.min(this.hp, 100);
    this.hullUpgradesCount = 0;

    this.missilesQueue = 0;
    this.missileFireTimer = 0;

    state.spawnRateMultiplier = 1.0;

    this.shield = {
      unlocked: false,
      charges: 0,
      maxCharges: 1,
      rechargeTimer: 0,
      baseRechargeTime: 12,
      rechargeSpeedMult: 1.0,
      damageBonusUpgrades: 0,
      rateBonusUpgrades: 0,
      rechargeUpgrades: 0,
      explodeOnBreak: false,
      explodeRadius: 240,
      explodeDamage: 1200,
      saveChargeChance: 0.0,
      saveChanceUpgrades: 0,
      extraChargesUpgrades: 0
    };

    this.activeSkill = {
      id: 'dash',
      level: 1,
      timer: 0,
      cooldown: 3, 
      duration: 0.5, 
      activeTimer: 0,
      isActive: false,
      emoji: '⚡',
      color: '#ffff00'
    };

    this.weapons = {
      blaster: { level: 1, timer: 0, cooldown: 60, projectileCount: 1, damage: 22, range: 500, speed: 12, homing: 0, homingUpgrades: 0 },
      orbitals: { level: 0, count: 2, radius: 120, angle: 0, speed: 0.05, damage: 35, tickTimer: 0, tickInterval: 10, size: 12, countUpgrades: 0, sizeUpgrades: 0, speedUpgrades: 0 },
      nova: { level: 0, count: 6, timer: 0, cooldown: 400, speed: 6, spiral: false },
      shockwave: { level: 0, timer: 0, cooldown: 230, radius: 175, damage: 150, rangeUpgrades: 0, rateUpgrades: 0 },
      missiles: { level: 0, count: 6, timer: 0, cooldown: 220, speed: 7, homing: 0.05, aoe: 70, damage: 23, countUpgrades: 0, speedUpgrades: 0, homingUpgrade: false, aoeUpgrades: 0 },
      laserCannon: { level: 0, chargeTimer: 0, maxCharge: 1140, fullyCharged: false, damage: 250, width: 25, duration: 24, chargeSpeedMult: 1, damageMult: 1, widthMult: 1, subLasers: false, dot: false, dotDamage: 20, dotDuration: 5, tickDamage: false, soundNode: null, chargeUpgrades: 0, dmgUpgrades: 0, widthUpgrades: 0, lifeUpgrades: 0, dotUpgrades: 0 }
    };

    updateAimJoystickUI();
  }

  draw(ctx) {
    // Draw Aiming Guide Line
    let isAiming = false;
    let aimAngle = 0;

    if (aimInput.active && this.weapons.laserCannon.level > 0) {
      isAiming = true;
      aimAngle = aimInput.angle;
    } else if (this.weapons.laserCannon.level > 0 && this.weapons.laserCannon.fullyCharged && mouse.down) {
      isAiming = true;
      aimAngle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
    }

    if (isAiming) {
      const maxLen = Math.max(state.width, state.height) * 1.5;
      const endX = this.x + Math.cos(aimAngle) * maxLen;
      const endY = this.y + Math.sin(aimAngle) * maxLen;

      ctx.save();
      ctx.strokeStyle = "rgba(0, 255, 0, 0.4)";
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.shadowColor = "#00ff00";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      ctx.strokeStyle = "rgba(180, 255, 180, 0.85)";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      if (this.weapons.laserCannon.level > 0 && this.weapons.laserCannon.subLasers) {
        ctx.strokeStyle = "rgba(0, 255, 0, 0.25)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        for (let offset of [-Math.PI / 6, Math.PI / 6]) {
          const subEndX = this.x + Math.cos(aimAngle + offset) * maxLen;
          const subEndY = this.y + Math.sin(aimAngle + offset) * maxLen;
          ctx.beginPath();
          ctx.moveTo(this.x, this.y);
          ctx.lineTo(subEndX, subEndY);
          ctx.stroke();
        }
      }

      ctx.restore();
    }

    // Draw active shield aura around player
    if (this.hasActiveShield()) {
      this.drawShieldAura(ctx);
    }

    if (this.invulnerabilityTimer > 0 && Math.floor(performance.now() / 80) % 2 === 0) {
      // Blinking i-frame
    } else {
      if (this.activeSkill && this.activeSkill.isActive && this.activeSkill.id === 'dash') {
        ctx.save();
        ctx.shadowColor = this.activeSkill.color || "#ffff00";
        ctx.shadowBlur = 18;
        if (textures['player_ship']) {
          drawCachedTexture(ctx, textures['player_ship'], this.x, this.y, this.angle);
        }
        ctx.restore();
      } else if (textures['player_ship']) {
        drawCachedTexture(ctx, textures['player_ship'], this.x, this.y, this.angle);
      }
    }

    const orb = this.weapons.orbitals;
    if (orb.level > 0) {
      const orbTexture = orb.size > 10 ? (textures['player_orbital_12'] || textures['player_orbital_8']) : textures['player_orbital_8'];
      for (let i = 0; i < orb.count; i++) {
        const curAng = orb.angle + (i * 2 * Math.PI) / orb.count;
        const ox = this.x + Math.cos(curAng) * orb.radius;
        const oy = this.y + Math.sin(curAng) * orb.radius;
        if (orbTexture) {
          drawCachedTexture(ctx, orbTexture, ox, oy, curAng * 2);
        }
      }
    }

    // Draw Laser Cannon charge bar under player
    this.drawLaserChargeBar(ctx);

    // Draw Shield Recharge Cooldown Bar directly below laser bar
    this.drawShieldRechargeBar(ctx);
  }

  drawShieldAura(ctx) {
    const chargeColor = this.getShieldColor(this.shield.charges);
    const shieldRadius = this.radius + 10;
    const t = performance.now() * 0.003;
    const pulse = Math.sin(t * 3) * 1.5;

    ctx.save();
    ctx.shadowColor = chargeColor;
    ctx.shadowBlur = 12 + Math.abs(pulse) * 3;
    ctx.strokeStyle = chargeColor;
    ctx.lineWidth = 2;
    
    // Outer shield perimeter
    ctx.beginPath();
    ctx.arc(this.x, this.y, shieldRadius + pulse, 0, Math.PI * 2);
    ctx.stroke();

    // Translucent shield energy fill
    ctx.fillStyle = chargeColor;
    ctx.globalAlpha = 0.06 + (this.shield.charges * 0.04);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Orbiting charge indicator pips around shield rim
    const charges = this.shield.charges;
    for (let i = 0; i < charges; i++) {
      const pipAngle = t * 2 + (i * 2 * Math.PI / charges);
      const px = this.x + Math.cos(pipAngle) * (shieldRadius + 4);
      const py = this.y + Math.sin(pipAngle) * (shieldRadius + 4);

      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = chargeColor;
      ctx.shadowBlur = 8;
      ctx.fill();
    }

    ctx.restore();
  }

  drawLaserChargeBar(ctx) {
    const w = this.weapons.laserCannon;
    if (!w || w.level <= 0) return;

    const barWidth = 36;
    const barHeight = 4;
    const barX = this.x - barWidth / 2;
    const barY = this.y + 24;
    const radius = 2;

    const chargeRatio = w.fullyCharged ? 1.0 : Math.min(1.0, Math.max(0.0, w.chargeTimer / w.maxCharge));

    ctx.save();

    if (w.fullyCharged) {
      // Slow pulse when fully charged (breathing neon glow)
      const t = performance.now() * 0.003;
      const pulse = 0.5 + 0.5 * Math.sin(t);

      // Outer glow and container
      ctx.shadowColor = "#00ff88";
      ctx.shadowBlur = 8 + pulse * 10;
      ctx.fillStyle = "rgba(0, 30, 15, 0.75)";
      ctx.strokeStyle = `rgba(0, 255, 136, ${0.7 + pulse * 0.3})`;
      ctx.lineWidth = 1.2;

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(barX, barY, barWidth, barHeight, radius);
      } else {
        ctx.rect(barX, barY, barWidth, barHeight);
      }
      ctx.fill();
      ctx.stroke();

      // Pulsing full bar fill
      ctx.fillStyle = `rgba(0, 255, 136, ${0.85 + pulse * 0.15})`;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(barX, barY, barWidth, barHeight, radius);
      } else {
        ctx.rect(barX, barY, barWidth, barHeight);
      }
      ctx.fill();

      // Crisp inner bright line
      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + pulse * 0.4})`;
      ctx.fillRect(barX + 2, barY + 1, barWidth - 4, 1.5);
    } else {
      // Charging state
      ctx.shadowColor = "#00ff66";
      ctx.shadowBlur = 4;
      ctx.fillStyle = "rgba(10, 20, 15, 0.7)";
      ctx.strokeStyle = "rgba(0, 255, 100, 0.4)";
      ctx.lineWidth = 1;

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(barX, barY, barWidth, barHeight, radius);
      } else {
        ctx.rect(barX, barY, barWidth, barHeight);
      }
      ctx.fill();
      ctx.stroke();

      // Progressive fill
      const fillW = Math.max(0, barWidth * chargeRatio);
      if (fillW > 0) {
        ctx.fillStyle = "#00ff66";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(barX, barY, fillW, barHeight, radius);
        } else {
          ctx.rect(barX, barY, fillW, barHeight);
        }
        ctx.fill();
      }
    }

    ctx.restore();
  }

  drawShieldRechargeBar(ctx) {
    if (!this.shield || !this.shield.unlocked) return;
    if (this.shield.charges >= this.shield.maxCharges) return;

    const hasLaser = this.weapons.laserCannon && this.weapons.laserCannon.level > 0;
    const barWidth = 36;
    const barHeight = 4;
    const barX = this.x - barWidth / 2;
    const barY = hasLaser ? (this.y + 32) : (this.y + 24);
    const radius = 2;

    const chargeColor = this.getShieldTargetRechargeColor();
    const rechargeRatio = Math.min(1.0, Math.max(0.0, this.shield.rechargeTimer / this.shield.baseRechargeTime));

    ctx.save();
    ctx.shadowColor = chargeColor;
    ctx.shadowBlur = 4;
    ctx.fillStyle = "rgba(10, 20, 25, 0.75)";
    ctx.strokeStyle = chargeColor;
    ctx.lineWidth = 1;

    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(barX, barY, barWidth, barHeight, radius);
    } else {
      ctx.rect(barX, barY, barWidth, barHeight);
    }
    ctx.fill();
    ctx.stroke();

    // Progressive fill in target charge color
    const fillW = Math.max(0, barWidth * rechargeRatio);
    if (fillW > 0) {
      ctx.fillStyle = chargeColor;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(barX, barY, fillW, barHeight, radius);
      } else {
        ctx.rect(barX, barY, fillW, barHeight);
      }
      ctx.fill();
    }

    ctx.restore();
  }
}

import { state } from '../../engine/gameState.js';
import { keys, mouse, getMovementVector, aimInput } from '../../engine/Input.js';
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
    this.maxHp = 100;
    this.hp = 100;
    this.hpRegen = 0;
    this.level = 1;
    this.xp = 0;
    this.nextXp = 10;
    this.pickupRadius = 130;
    this.angle = 0;
    
    this.missilesQueue = 0;
    this.missileFireTimer = 0;

    this.invulnerabilityMaxTime = 1.5;
    this.invulnerabilityTimer = 0;
    this.iFrameUpgradesCount = 0;

    this.slowTimer = 0;
    this.damageMult = 1.0;
    this.cooldownMult = 1.0;
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

    this.weapons = {
      blaster: { level: 1, timer: 0, cooldown: 60, projectileCount: 1, damage: 22, range: 500, speed: 12, homing: 0, homingUpgrades: 0 },
      orbitals: { level: 0, count: 2, radius: 120, angle: 0, speed: 0.05, damage: 35, tickTimer: 0, tickInterval: 10, size: 12 },
      nova: { level: 0, count: 6, timer: 0, cooldown: 400, speed: 6, spiral: false },
      shockwave: { level: 0, timer: 0, cooldown: 230, radius: 175, damage: 150 },
      missiles: { level: 0, count: 6, timer: 0, cooldown: 220, speed: 7, homing: 0.05, aoe: 70, damage: 23 },
      laserCannon: { level: 0, chargeTimer: 0, maxCharge: 1140, fullyCharged: false, damage: 250, width: 25, duration: 24, chargeSpeedMult: 1, damageMult: 1, widthMult: 1, subLasers: false, dot: false, dotDamage: 20, dotDuration: 5, tickDamage: false, soundNode: null }
    };
  }

  update(dt) {
    if (this.invulnerabilityTimer > 0) {
      this.invulnerabilityTimer -= dt;
    }

    if (this.hpRegen > 0 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.hpRegen * dt);
    }

    if (this.slowTimer > 0) {
      this.slowTimer--;
      this.speed = this.baseSpeed * 0.75;
    } else {
      this.speed = this.baseSpeed;
    }

    if (this.activeSkill && this.activeSkill.isActive && this.activeSkill.id === 'dash') {
      this.speed *= 2.5;
    }

    const move = getMovementVector();
    let dx = move.dx;
    let dy = move.dy;

    this.x += dx * this.speed;
    this.y += dy * this.speed;

    this.x = Math.max(this.radius, Math.min(state.width - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(state.height - this.radius, this.y));

    if (aimInput.active) {
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
    if (w.timer >= w.cooldown * this.cooldownMult) {
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
    const dmg = w.damage * this.damageMult;
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
        const orbDmg = w.damage * this.damageMult;

        // Query spatial grid for nearby enemies
        state.spatialGrid.queryRadius(ox, oy, orbRadius, (e) => {
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
    if (w.timer >= w.cooldown * this.cooldownMult) {
      w.timer = 0;
      state.shockwaves.push(new Shockwave(this.x, this.y, w.radius, w.damage * this.damageMult));
      audioManager.playSound('fire_shockwave', { volume: 0.7, throttleMs: 100 });
    }
  }

  updateNova() {
    const w = this.weapons.nova;
    if (w.level <= 0) return;
    w.timer++;
    if (w.timer >= w.cooldown * this.cooldownMult) {
      w.timer = 0;
      this.fireNova();
    }
  }

  fireNova() {
    const w = this.weapons.nova;
    const damage = this.weapons.blaster.damage * 1.5 * this.damageMult;
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
    if (w.timer >= w.cooldown * this.cooldownMult) {
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
      w.damage * this.damageMult,
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

      w.chargeTimer += w.chargeSpeedMult;
      
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
         
         state.laserBeams.push(new LaserBeam(
            this.x, this.y, angle, 
            w.damage * w.damageMult, 
            w.width * w.widthMult, 
            w.duration, 
            false, 
            w.dot ? w.dotDamage : 0, 
            w.dot ? w.dotDuration : 0, 
            w.tickDamage
         ));
         
         if (w.subLasers) {
             const subWidth = (w.width * w.widthMult) * 0.25;
             const subDmg = (w.damage * w.damageMult) * 0.25;
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
    
    this.hp -= amount;
    this.invulnerabilityTimer = this.invulnerabilityMaxTime;
    const offsetX = (Math.random() * 2 - 1) * (this.radius * 0.8);
    const offsetY = (Math.random() * 2 - 1) * (this.radius * 0.8);
    
    if (state.floatingTextPool) {
      state.floatingTextPool.acquire(this.x + offsetX, this.y + offsetY, `-${Math.round(amount)}`, damageColor, 16);
    }
    spawnExplosion(this.x, this.y, "#ff0055", 8, 2.5);

    audioManager.playSound('hurt_player', { volume: 0.6, throttleMs: 50 });

    if (this.hp <= 0) {
      this.hp = 0;
      triggerGameOver();
    }
    updateHUD();
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
    this.hpRegen = 0;
    this.pickupRadius = 130;
    this.invulnerabilityMaxTime = 1.5;
    this.iFrameUpgradesCount = 0;
    this.damageMult = 1.0;
    this.cooldownMult = 1.0;
    this.doubleGemChance = 0;
    this.doubleGemUpgradesCount = 0;
    this.acquiredUpgrades = {};
    this.maxHp = 100;
    this.hp = Math.min(this.hp, 100);
    this.activeSkill = {
      id: null,
      level: 0,
      timer: 0,
      cooldown: 0,
      duration: 0,
      activeTimer: 0,
      isActive: false,
      emoji: '?',
      color: '#fff'
    };
    this.weapons = {
      blaster: { level: 1, timer: 0, cooldown: 35, projectileCount: 1, damage: 22, range: 500, speed: 9, homing: 0, homingUpgrades: 0 },
      orbitals: { level: 0, count: 2, radius: 70, angle: 0, speed: 0.05, damage: 14, tickTimer: 0, tickInterval: 12, size: 8 },
      nova: { level: 0, count: 8, timer: 0, cooldown: 120, speed: 6, spiral: false },
      shockwave: { level: 0, timer: 0, cooldown: 180, radius: 175, damage: 48 },
      missiles: { level: 0, count: 6, timer: 0, cooldown: 90, speed: 7, homing: 0.05, aoe: 50, damage: 35 },
      laserCannon: { level: 0, chargeTimer: 0, maxCharge: 1140, fullyCharged: false, damage: 250, width: 25, duration: 24, chargeSpeedMult: 1, damageMult: 1, widthMult: 1, subLasers: false, dot: false, dotDamage: 20, dotDuration: 5, tickDamage: false, soundNode: null }
    };
    this.magnetUpgrades = 0;
    this.blasterRateUpgrades = 0;
  }

  draw(ctx) {
    // Draw Aiming Guide Line
    let isAiming = false;
    let aimAngle = 0;

    if (aimInput.active) {
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

    if (this.invulnerabilityTimer > 0 && Math.floor(performance.now() / 80) % 2 === 0) {
      // Blinking i-frame
    } else {
      if (textures['player_ship']) {
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
  }
}

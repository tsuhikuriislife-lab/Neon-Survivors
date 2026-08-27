import { state } from '../engine/gameState.js';
import { keys } from '../engine/Input.js';
import { dist, drawPolygon } from '../engine/Utils.js';
import { spawnExplosion, FloatingText } from './Effects.js';
import { Projectile, Shockwave, NovaProjectile, MissileProjectile } from './Projectiles.js';
import { showUpgradeMenu, triggerGameOver, updateHUD } from '../ui/UIManager.js';

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

    this.invulnerabilityMaxTime = 1.5;
    this.invulnerabilityTimer = 0;
    this.iFrameUpgradesCount = 0;

    this.slowTimer = 0;
    this.damageMult = 1.0;
    this.cooldownMult = 1.0;

    this.weapons = {
      blaster: { level: 1, timer: 0, cooldown: 60, projectileCount: 1, damage: 22, range: 500, speed: 12, homing: 0, homingUpgrades: 0 },
      orbitals: { level: 0, count: 2, radius: 120, angle: 0, speed: 0.05, damage: 45, tickTimer: 0, tickInterval: 12, size: 12 },
      nova: { level: 0, count: 6, timer: 0, cooldown: 400, speed: 6, spiral: false },
      shockwave: { level: 0, timer: 0, cooldown: 230, radius: 175, damage: 150 },
      missiles: { level: 0, count: 6, timer: 0, cooldown: 90, speed: 7, homing: 0.05, aoe: 70, damage: 23 }
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

    let dx = 0;
    let dy = 0;
    if (keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;

    if (dx !== 0 && dy !== 0) {
      dx *= 0.7071;
      dy *= 0.7071;
    }

    this.x += dx * this.speed;
    this.y += dy * this.speed;

    this.x = Math.max(this.radius, Math.min(state.width - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(state.height - this.radius, this.y));

    if (dx !== 0 || dy !== 0) {
      this.angle = Math.atan2(dy, dx);
      if (Math.random() < 0.35) {
        // We do not directly use state.particles here to avoid circular imports 
        // if not needed, but spawnExplosion works fine. Actually, we can just push.
        import('./Effects.js').then(({ Particle }) => {
          state.particles.push(new Particle(this.x, this.y, "#00f0ff", 1, 0.05, 2));
        });
      }
    }

    this.updateBlaster();
    this.updateOrbitals();
    this.updateShockwave();
    this.updateNova();
    this.updateMissiles();
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
    let closest = null;
    let minD = w.range;

    const allTargets = [...state.enemies, ...state.bosses.flatMap(b => b.getTargetables())];
    for (let target of allTargets) {
      const d = dist(this.x, this.y, target.x, target.y);
      if (d < minD) {
        minD = d;
        closest = target;
      }
    }

    const baseAngle = closest ? Math.atan2(closest.y - this.y, closest.x - this.x) : this.angle;
    const count = w.projectileCount;
    for (let i = 0; i < count; i++) {
      const spread = count > 1 ? (i - (count - 1) / 2) * 0.09 : 0;
      const finalAngle = baseAngle + spread;
      state.projectiles.push(new Projectile(
        this.x, 
        this.y, 
        Math.cos(finalAngle) * w.speed, 
        Math.sin(finalAngle) * w.speed, 
        w.damage * this.damageMult, 
        "#00ffff",
        4,
        false,
        w.homing || 0
      ));
    }
  }

  updateOrbitals() {
    const w = this.weapons.orbitals;
    if (w.level <= 0) return;
    w.angle += w.speed;
    w.tickTimer++;

    if (w.tickTimer >= w.tickInterval) {
      w.tickTimer = 0;
      for (let i = 0; i < w.count; i++) {
        const curAng = w.angle + (i * 2 * Math.PI) / w.count;
        const ox = this.x + Math.cos(curAng) * w.radius;
        const oy = this.y + Math.sin(curAng) * w.radius;
        const orbRadius = w.size;

        for (let e of state.enemies) {
          if (dist(ox, oy, e.x, e.y) < orbRadius + e.radius) {
            e.takeDamage(w.damage * this.damageMult, "#ff00ff");
            spawnExplosion(ox, oy, "#ff00ff", 3, 1.5);
          }
        }

        for (let b of state.bosses) {
          const damagedParents = new Set();
          for (let t of b.getTargetables()) {
            const actualTarget = t.parent || t;
            if (damagedParents.has(actualTarget)) continue;

            if (dist(ox, oy, t.x, t.y) < orbRadius + t.radius) {
              t.takeDamage(w.damage * this.damageMult, "#ff00ff");
              spawnExplosion(ox, oy, "#ff00ff", 3, 1.5);
              damagedParents.add(actualTarget);
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
  }

  updateMissiles() {
    const w = this.weapons.missiles;
    if (w.level <= 0) return;
    w.timer++;
    if (w.timer >= w.cooldown * this.cooldownMult) {
      w.timer = 0;
      this.fireMissiles();
    }
  }

  fireMissiles() {
    const w = this.weapons.missiles;
    for (let i = 0; i < w.count; i++) {
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
    }
  }

  takeDamage(amount, damageColor = "#ff2255") {
    if (state.godMode) return;
    if (this.invulnerabilityTimer > 0) return;
    
    this.hp -= amount;
    this.invulnerabilityTimer = this.invulnerabilityMaxTime;
    const offsetX = (Math.random() * 2 - 1) * (this.radius * 0.8);
    const offsetY = (Math.random() * 2 - 1) * (this.radius * 0.8);
    state.floatingTexts.push(new FloatingText(this.x + offsetX, this.y + offsetY, `-${Math.round(amount)}`, damageColor, 16));
    spawnExplosion(this.x, this.y, "#ff0055", 8, 2.5);

    if (this.hp <= 0) {
      this.hp = 0;
      triggerGameOver();
    }
    updateHUD();
  }

  gainXP(val) {
    this.xp += val;
    state.floatingTexts.push(new FloatingText(this.x + (Math.random() * 20 - 10), this.y - 15, `+${val} XP`, "#00ffcc", 11));
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
    this.maxHp = 100;
    this.hp = Math.min(this.hp, 100);
    this.weapons = {
      blaster: { level: 1, timer: 0, cooldown: 35, projectileCount: 1, damage: 22, range: 500, speed: 9, homing: 0, homingUpgrades: 0 },
      orbitals: { level: 0, count: 2, radius: 70, angle: 0, speed: 0.05, damage: 14, tickTimer: 0, tickInterval: 12, size: 8 },
      nova: { level: 0, count: 8, timer: 0, cooldown: 120, speed: 6, spiral: false },
      shockwave: { level: 0, timer: 0, cooldown: 180, radius: 175, damage: 48 },
      missiles: { level: 0, count: 6, timer: 0, cooldown: 90, speed: 7, homing: 0.05, aoe: 50, damage: 35 }
    };
    this.magnetUpgrades = 0;
    this.blasterRateUpgrades = 0;
  }

  draw(ctx) {
    if (this.invulnerabilityTimer > 0 && Math.floor(performance.now() / 80) % 2 === 0) {
      // Blink
    } else {
      drawPolygon(ctx, this.x, this.y, this.radius, 3, this.angle, "#00ffff", 15, "rgba(0, 255, 255, 0.2)");
    }

    const orb = this.weapons.orbitals;
    if (orb.level > 0) {
      for (let i = 0; i < orb.count; i++) {
        const curAng = orb.angle + (i * 2 * Math.PI) / orb.count;
        const ox = this.x + Math.cos(curAng) * orb.radius;
        const oy = this.y + Math.sin(curAng) * orb.radius;
        drawPolygon(ctx, ox, oy, 7, 6, curAng * 2, "#ff00ff", 12, "rgba(255, 0, 255, 0.4)");
      }
    }
  }
}


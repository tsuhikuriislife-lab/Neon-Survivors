import { state } from '../../engine/gameState.js';
import { keys, mouse, getMovementVector, aimInput, updateAimJoystickUI } from '../../engine/Input.js';
import { dist } from '../../engine/Utils.js';
import { spawnExplosion } from '../effects/spawnExplosion.js';
import { Projectile } from '../projectiles/Projectile.js';
import { Shockwave } from '../projectiles/Shockwave.js';
import { NovaProjectile } from '../projectiles/NovaProjectile.js';
import { MissileProjectile } from '../projectiles/MissileProjectile.js';
import { ClusterBombMissile } from '../projectiles/ClusterBombMissile.js';
import { LaserBeam } from '../projectiles/LaserBeam.js';
import { showUpgradeMenu, triggerGameOver, updateHUD } from '../../ui/UIManager.js';
import { audioManager } from '../../engine/AudioManager.js';
import { textures, drawCachedTexture, getOrCachePolygon } from '../../engine/TextureCache.js';
import { worldLayer } from '../../main.js';
import { metaUpgradesTree } from '../../data/metaUpgrades.js';
import { SaveManager } from '../../engine/SaveManager.js';

export class Player {
  constructor() {
    this.x = state.width / 2;
    this.y = state.height / 2;
    this.radius = 16;
     
    const profile = SaveManager.loadProfile();
    this.customization = profile.customization || {
        shipColor: '#00ffff',
        engineColor: '#00ffff',
        blasterColor: '#00ffff',
        blasterParticleColor: '#00ffff'
    };

    this.baseSpeed = 4.2;
    this.speedMult = 1.0;
    this.speed = 3.8;
    this.speedUpgradesCount = 0;
    this.maxHp = 100;
    this.hp = 100;
    this.overhealth = 0;
    this.hasOverhealthUpgrade = false;
    this.healthPickupRadius = 35;
    this.hullUpgradesCount = 0;
    this.hpRegen = 0.5;
    this.regenUpgradesCount = 0;
    this.level = 1;
    this.xp = 0;
    this.nextXp = 10;
    this.pickupRadius = 130;
    this.pickupRadiusMult = 1.0;
    this.orbitalsRadius = 80;
    this.orbitalsAngle = 0;

    // --- PIXI Setup ---
    this.container = new PIXI.Container();
    
    // Main ship sprite
    this.sprite = new PIXI.Sprite(textures['player_ship']);
    this.sprite.anchor.set(0.5);
    this.container.addChild(this.sprite);

    // Orbital container
    this.orbitalContainer = new PIXI.Container();
    this.container.addChild(this.orbitalContainer);
    this.orbitalSprites = [];

    // Second orbital container for Dual Orbit
    this.orbitalContainer2 = new PIXI.Container();
    this.container.addChild(this.orbitalContainer2);
    this.orbitalSprites2 = [];

    // Shield Aura Graphics
    this.shieldGraphics = new PIXI.Graphics();
    this.container.addChild(this.shieldGraphics);

    // Laser Bar Graphics
    this.uiGraphics = new PIXI.Graphics();
    this.container.addChild(this.uiGraphics);

    worldLayer.addChild(this.container);
    this.magnetUpgrades = 0;
    this.angle = 0;
    this.hasRevivedOnce = false;
    this.revivesUsed = 0;
    
    this.missilesQueue = 0;
    this.missileFireTimer = 0;
    this.shockwaveQueue = 0;
    this.shockwaveFireTimer = 0;
    this.shockwaveBurstPoints = [];

    this.invulnerabilityMaxTime = 1.5;
    this.invulnerabilityTimer = 0;
    this.iFrameUpgradesCount = 0;

    this.slowTimer = 0;
    this.damageMult = 1.0;
    this.damageUpgradesCount = 0;
    this.cooldownMult = 1.0;
    this.blasterRateUpgrades = 0;
    this.critChance = 0.05;
    this.critDamage = 1.5;
    this.xpMultiplier = 1.0;
    
    this.doubleGemChance = 0;
    this.doubleGemUpgradesCount = 0;
    this.autoMagnetChance = 0;
    this.autoMagnetUpgrades = 0;
    
    this.healDropChance = 0;
    this.chipDropChance = 0;
    this.doubleChipChance = 0;
    this.endgameChipBonus = 0;

    this.thorns = 0;
    this.extraRevives = 0;
    this.cooldownReduction = 0;
    this.bossDamageMult = 0;
    this.dashCooldownReduction = 0;
    this.healOnLevelUp = 0;
    this.baseRerolls = 0;
    this.bossChipBounty = 0;
    this.startXP = 0;

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
      explodeRadius: 400,
      explodeDamage: 600,
      saveChargeChance: 0.0,
      saveChanceUpgrades: 0,
      extraChargesUpgrades: 0
    };

    this.weapons = {

      blaster: { level: 1, timer: 0, cooldown: 30, cooldownMult: 1.0, projectileCount: 1, damage: 10, range: 500, speed: 12, homing: 0, homingUpgrades: 0 },
      orbitals: { level: 0, count: 2, radius: 120, angle: 0, speed: 0.05, speedMult: 1.0, damage: 35, tickTimer: 0, tickInterval: 10, size: 12, sizeMult: 1.0, countUpgrades: 0, sizeUpgrades: 0, speedUpgrades: 0 },
      nova: { level: 0, count: 6, timer: 0, cooldown: 400, speed: 6, speedMult: 1.0, spiral: false },
      shockwave: { level: 0, count: 1, countUpgrades: 0, timer: 0, cooldown: 230, cooldownMult: 1.0, radius: 175, radiusMult: 1.0, damage: 150, damageMult: 1.0, rangeUpgrades: 0, rateUpgrades: 0, unbound: false },
      missiles: { level: 0, count: 6, timer: 0, cooldown: 220, speed: 7, speedMult: 1.0, homing: 0.05, aoe: 140, aoeMult: 1.0, damage: 23, countUpgrades: 0, speedUpgrades: 0, homingUpgrade: false, aoeUpgrades: 0 },
      laserCannon: { level: 0, chargeTimer: 0, maxCharge: 1140, fullyCharged: false, damage: 80, width: 25, duration: 24, chargeSpeedMult: 1, damageMult: 1, widthMult: 1, subLasers: false, dot: false, dotDamage: 20, dotDuration: 5, tickDamage: false, soundNode: null, chargeUpgrades: 0, dmgUpgrades: 0, widthUpgrades: 0, lifeUpgrades: 0, dotUpgrades: 0 }
    };

    // --- Apply Meta Upgrades ---
     
    for (const key in metaUpgradesTree) {
      const node = metaUpgradesTree[key];
      const level = profile.upgrades[key];
      if (level && level > 0 && node.apply) {
        node.apply(this, level);
      }
    }
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

  /**
   * (Sistema de Daño Multiplicativo)
   * Calcula el multiplicador de daño final. La regla del proyecto estipula que:
   * Daño Final = Daño Base * Multiplicador Global * Bonus de Escudo Activo.
   * Por eso usamos `*=` en lugar de sumar porcentajes planos.
   * @returns {number} Multiplicador efectivo actual.
   */
  getEffectiveDamageMult() {
    let mult = this.damageMult;
    if (this.hasActiveShield()) {
      mult *= (1.0 + (this.shield.damageBonusUpgrades || 0) * 0.05);
    }
    return mult;
  }

  /**
   * Calcula el multiplicador de enfriamiento (cooldown).
   * Un valor menor significa que las armas disparan más rápido (ej: 0.8 = 20% más rápido).
   * Se usa división `mult / (1 + bonus)` para evitar que el cooldown llegue a 0 o negativo.
   */
  getEffectiveCooldownMult() {
    let mult = this.cooldownMult;
    if (this.hasActiveShield()) {
      const speedBonus = (this.shield.rateBonusUpgrades || 0) * 0.05;
      mult = mult / (1 + speedBonus);
    }
    if (this.cooldownReduction && this.cooldownReduction > 0) {
      mult *= Math.max(0.1, 1 - this.cooldownReduction);
    }
    return mult;
  }

  update(dt) {
    if (this.invulnerabilityTimer > 0) {
      this.invulnerabilityTimer -= dt;
      const flicker = Math.sin(this.invulnerabilityTimer * 28) > 0;
      if (this.sprite) this.sprite.alpha = flicker ? 0.35 : 0.95;
    } else if (this.sprite && this.sprite.alpha !== 1.0) {
      this.sprite.alpha = 1.0;
    }

    if (this.hpRegen > 0 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.hpRegen * dt);
    }

    if (this.overhealth > 0) {
      this.overhealth = Math.max(0, this.overhealth - (1.5 * dt));
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
            state.floatingTextPool.acquire(this.x, this.y - 25, "+1 SHIELD", cColor, 14);
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
      this.speed = this.baseSpeed * this.speedMult * 0.75;
    } else {
      this.speed = this.baseSpeed;
      this.speed = this.baseSpeed * this.speedMult;
    }
    
    const isFiringLaser = (this.weapons.laserCannon && this.weapons.laserCannon.level > 0 && !this.weapons.laserCannon.overheated && (aimInput.active || mouse.down));
    if (isFiringLaser) {
      this.speed *= 0.45; // 55% movement speed penalty while firing
    }

    if (this.activeSkill && this.activeSkill.isActive && this.activeSkill.id === 'dash') {
      this.speed *= 2.5;
      if (state.particlePool && Math.random() < 0.65) {
        state.particlePool.acquire(this.x + (Math.random() * 10 - 5), this.y + (Math.random() * 10 - 5), this.activeSkill.color || "#ffff00", 3, 0.08, 3.5);
      }
    }

    // --- LÓGICA DE MOVIMIENTO VECTORIAL (CON INERCIA) ---
    // Obtenemos el vector normalizado (longitud = 1) desde Input.js para asegurar
    // que moverse en diagonal no sea más rápido que moverse en línea recta.
    const move = getMovementVector();
    let dx = move.dx;
    let dy = move.dy;
    let targetVx = dx * this.speed;
    let targetVy = dy * this.speed;

    if (this.vx === undefined) this.vx = 0;
    if (this.vy === undefined) this.vy = 0;

    const isDashing = this.activeSkill && this.activeSkill.isActive && this.activeSkill.id === 'dash';
    
    if (isDashing) {
      // El dash es un impulso explosivo, por lo que anula la inercia e impone la velocidad directamente
      this.vx = targetVx;
      this.vy = targetVy;
    } else {
      // Interpolación lineal (Lerp) para aceleración y fricción orgánicas. 
      // 0.25 ofrece una respuesta muy ágil (snappy) pero que visualmente tiene peso.
      this.vx += (targetVx - this.vx) * 0.25;
      this.vy += (targetVy - this.vy) * 0.25;
    }

    // Aplicamos la velocidad inercial a las coordenadas
    this.x += this.vx;
    this.y += this.vy;

    // --- LÍMITES DEL MAPA (CLAMPING) ---
    // Mantiene al jugador dentro del canvas virtual de 1920x1920.
    // `Math.max` previene que salga por la izquierda/arriba (valores negativos).
    // `Math.min` previene que salga por la derecha/abajo, restando su radio para no cortar el sprite.
    this.x = Math.max(this.radius, Math.min(state.width - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(state.height - this.radius, this.y));

    if (aimInput.active && this.weapons.laserCannon && this.weapons.laserCannon.level > 0 && !this.weapons.laserCannon.overheated) {
      const targetAngle = aimInput.angle;
      let diff = targetAngle - this.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      
      if (!this.weapons.laserCannon.activeLaser) {
        this.angle = targetAngle; // Snap immediately on first shot
      } else {
        const turnRate = 0.015; // Constant turn speed
        if (Math.abs(diff) <= turnRate) {
          this.angle = targetAngle;
        } else {
          this.angle += Math.sign(diff) * turnRate;
        }
      }
    } else if (mouse.down && this.weapons.laserCannon && this.weapons.laserCannon.level > 0 && !this.weapons.laserCannon.overheated) {
      const targetAngle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
      let diff = targetAngle - this.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      
      if (!this.weapons.laserCannon.activeLaser) {
        this.angle = targetAngle; // Snap immediately on first shot
      } else {
        const turnRate = 0.015; // Constant turn speed
        if (Math.abs(diff) <= turnRate) {
          this.angle = targetAngle;
        } else {
          this.angle += Math.sign(diff) * turnRate;
        }
      }
    } else if (dx !== 0 || dy !== 0) {
      const targetAngle = Math.atan2(dy, dx);
      let diff = targetAngle - this.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.angle += diff * 0.3; // Rotación fluida en lugar de snap instantáneo
      
      if (Math.random() < 0.35 && state.particlePool) {
        state.particlePool.acquire(this.x, this.y, this.customization.engineColor, 1, 0.05, 2);
      }
    }

    this.updateBlaster();
    this.updateOrbitals();
    this.updateShockwave();
    this.updateNova();
    this.updateMissiles();
    this.updateLaserCannon();
    this.updateActiveSkill(dt);

    // --- PIXI Sync ---
    this.container.x = this.x;
    this.container.y = this.y;
    this.sprite.rotation = this.angle;
    this.orbitalContainer.rotation = this.orbitalsAngle;
    if (this.orbitalContainer2) {
      this.orbitalContainer2.rotation = -this.orbitalsAngle;
    }
    
    this.updateShieldAura();
    this.updateUIBars();
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
    this.activeSkill.timer = this.activeSkill.cooldown * (1 - (this.dashCooldownReduction || 0));
    
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
    if (w.timer >= (w.cooldown / (w.cooldownMult || 1.0)) * this.getEffectiveCooldownMult()) {
      w.timer = 0;
      this.fireBlaster();
    }
  }

  fireBlaster() {
    const w = this.weapons.blaster;
    const effectiveRange = w.range * (w.rangeMult || 1.0);
    const count = w.projectileCount;
    const dmg = w.damage * this.getEffectiveDamageMult();
    const homing = w.homing || 0;

    // 1. Recolectar a todos los objetivos potenciales
    let potentialTargets = [];
    state.spatialGrid.queryRadius(this.x, this.y, effectiveRange, (e) => {
      if (e.hp > 0) potentialTargets.push(e);
    });

    for (let b of state.bosses) {
      for (let target of b.getTargetables()) {
        const d = dist(this.x, this.y, target.x, target.y);
        if (d <= effectiveRange) {
          potentialTargets.push(target);
        }
      }
    }

    // 2. Función auxiliar para disparar un proyectil individual
    const spawnProj = (baseAngle, spreadIndex, totalSpreadShots) => {
      const spread = totalSpreadShots > 1 ? (spreadIndex - (totalSpreadShots - 1) / 2) * 0.09 : 0;
      const finalAngle = baseAngle + spread;
      const effectiveSpeed = w.speed * (w.speedMult || 1.0);
      const vx = Math.cos(finalAngle) * effectiveSpeed;
      const vy = Math.sin(finalAngle) * effectiveSpeed;

      if (state.projectilePool) {
        state.projectilePool.acquire(this.x, this.y, vx, vy, dmg, this.customization.blasterParticleColor, 4, false, homing);
      } else {
        state.projectiles.push(new Projectile(this.x, this.y, vx, vy, dmg, this.customization.blasterParticleColor, 4, false, homing));
      }
    };

    // 3. Si no hay enemigos, disparar todo al frente
    if (potentialTargets.length === 0) {
      for (let i = 0; i < count; i++) {
        spawnProj(this.angle, i, count);
      }
    } else {
      // 4. Ordenar por distancia y seleccionar los objetivos más cercanos
      let targetDistances = potentialTargets.map(t => ({
        entity: t,
        d: dist(this.x, this.y, t.x, t.y)
      }));
      targetDistances.sort((a, b) => a.d - b.d);
      
      // Tomamos como máximo "count" enemigos (uno para cada proyectil)
      let validTargets = targetDistances.map(t => t.entity).slice(0, count);
      
      // 5. Repartir los proyectiles de forma equitativa (Round-Robin)
      let targetCounts = new Map();
      for (let i = 0; i < count; i++) {
        let t = validTargets[i % validTargets.length];
        targetCounts.set(t, (targetCounts.get(t) || 0) + 1);
      }
      
      // 6. Disparar a cada objetivo con spread local si recibe múltiples disparos
      targetCounts.forEach((shots, target) => {
        const targetAngle = Math.atan2(target.y - this.y, target.x - this.x);
        for (let i = 0; i < shots; i++) {
          spawnProj(targetAngle, i, shots);
        }
      });
    }

    audioManager.playSound('fire_main_gun', { volume: 0.3, throttleMs: 100 });
  }

  updateOrbitals() {
    const w = this.weapons.orbitals;
    if (w.level <= 0) return;
    this.orbitalsAngle += w.speed * w.speedMult;
    w.angle = this.orbitalsAngle;

    const numOrbits = w.dualOrbit ? 2 : 1;
    
    if (!w.states) w.states = [];
    if (!w.states2) w.states2 = [];

    const syncStatesAndSprites = (spritesArray, statesArray, container, targetCount, texName, effSize, orbitRadius) => {
        while (statesArray.length < targetCount) {
            statesArray.push({ disabledTimer: 0 });
        }
        while (spritesArray.length < targetCount) {
            const sprite = new PIXI.Sprite(textures[texName]);
            sprite.anchor.set(0.5);
            spritesArray.push(sprite);
            container.addChild(sprite);
        }
        while (spritesArray.length > targetCount) {
            const sprite = spritesArray.pop();
            container.removeChild(sprite);
            sprite.destroy();
            statesArray.pop();
        }
        for (let i = 0; i < targetCount; i++) {
            const sprite = spritesArray[i];
            sprite.texture = textures[texName];
            const curAng = (i * 2 * Math.PI) / targetCount;
            sprite.x = Math.cos(curAng) * orbitRadius;
            sprite.y = Math.sin(curAng) * orbitRadius;
            const scaleFactor = effSize / 12;
            sprite.scale.set(scaleFactor, scaleFactor);
            sprite.rotation = curAng * 2;
            sprite.tint = 0xffffff;
        }
    };

    const effSize = w.size * w.sizeMult;
    const texName = effSize > 10 ? 'player_orbital_12' : 'player_orbital_8';

    syncStatesAndSprites(this.orbitalSprites, w.states, this.orbitalContainer, w.count, texName, effSize, w.radius);
    
    if (w.dualOrbit) {
        syncStatesAndSprites(this.orbitalSprites2, w.states2, this.orbitalContainer2, w.count, texName + '_green', effSize, w.radius + 60);
    } else {
        // Clear second orbit if it was somehow deactivated
        while (this.orbitalSprites2.length > 0) {
            const sprite = this.orbitalSprites2.pop();
            this.orbitalContainer2.removeChild(sprite);
            sprite.destroy();
        }
        w.states2 = [];
    }

    const processCollisions = (spritesArray, statesArray, orbitAngleOffset, orbitRadius, colorHexStr) => {
        for (let i = 0; i < spritesArray.length; i++) {
            const stateObj = statesArray[i];
            if (stateObj.disabledTimer > 0) stateObj.disabledTimer--;

            const curAng = orbitAngleOffset + (i * 2 * Math.PI) / spritesArray.length;
            const ox = this.x + Math.cos(curAng) * orbitRadius;
            const oy = this.y + Math.sin(curAng) * orbitRadius;
            const orbRadius = effSize;
            
            const sourceSprite = spritesArray[i];
            const isDisabled = stateObj.disabledTimer > 0;
            const orbDmg = (w.damage * this.getEffectiveDamageMult()) * (isDisabled ? 0.3 : 1.0);

            if (isDisabled) {
                if (stateObj.disabledTimer <= 30 && stateObj.disabledTimer % 10 < 5) {
                    sourceSprite.alpha = 0.8;
                } else {
                    sourceSprite.alpha = 0.3;
                }
            } else {
                sourceSprite.alpha = 1.0;
            }
            
            if (!isDisabled && state.particlePool && Math.random() < 0.65) {
                state.particlePool.acquire(ox, oy, colorHexStr, 0.3, 0.12, orbRadius * 0.7);
            }
            
            if (!isDisabled) {
                let blocked = false;
                const projLists = [state.enemyProjectiles, state.acceleratingProjectiles, state.fallingProjectiles];
                if (state.projectilePool && state.projectilePool.pool) {
                    projLists.push(state.projectilePool.pool);
                }

                for (let list of projLists) {
                    if (!list) continue;
                    for (let p of list) {
                        if (p.active === false || p.isUnblockable) continue;
                        if (p.isEnemy === false) continue;
                        
                        if (dist(ox, oy, p.x, p.y) < orbRadius + (p.radius || 10)) {
                            if (p.hasOwnProperty('active')) p.active = false;
                            else p.x = -99999;
                            if (p.sprite) p.sprite.visible = false;
                            if (typeof p.destroy === 'function') p.destroy();
                            blocked = true;
                            break;
                        }
                    }
                    if (blocked) break;
                }

                if (blocked) {
                    stateObj.disabledTimer = 90;
                    spawnExplosion(ox, oy, "#ffffff", 8, 2.5);
                    audioManager.playSound('hit_satellite', { volume: 0.5, throttleMs: 50 });
                    continue;
                }
            }

            const speedRatio = (w.speed * w.speedMult) / 0.05; 
            const cooldownSeconds = (w.tickInterval / 60.0) / speedRatio;

            state.spatialGrid.queryRadius(ox, oy, orbRadius, (e) => {
                if (e.hp <= 0) return;
                const actualTarget = e.parent || e;
                if (actualTarget.canBeHitBy && actualTarget.canBeHitBy(sourceSprite, cooldownSeconds)) {
                    e.takeDamage(orbDmg, colorHexStr);
                    state.recordDamage('orbitals', orbDmg);
                    spawnExplosion(ox, oy, colorHexStr, 3, 1.5);
                    audioManager.playSound('hit_satellite', { volume: 0.5, throttleMs: 50 });
                }
            });

            for (let b of state.bosses) {
                for (let t of b.getTargetables()) {
                    const actualTarget = t.parent || t;
                    if (dist(ox, oy, t.x, t.y) < orbRadius + t.radius) {
                        if (actualTarget.canBeHitBy && actualTarget.canBeHitBy(sourceSprite, cooldownSeconds)) {
                            t.takeDamage(orbDmg, colorHexStr);
                            state.recordDamage('orbitals', orbDmg);
                            spawnExplosion(ox, oy, colorHexStr, 3, 1.5);
                            audioManager.playSound('hit_satellite', { volume: 0.5, throttleMs: 50 });
                        }
                    }
                }
            }
        }
    };

    processCollisions(this.orbitalSprites, w.states, w.angle, w.radius, "#ff00ff");
    if (w.dualOrbit) {
        processCollisions(this.orbitalSprites2, w.states2, -w.angle, w.radius + 60, "#00ff00");
    }
  }

  /**
   * Actualiza el temporizador y el disparo en cascada de Seismic Pulse.
   * Al completarse la recarga, carga la cola de pulsos según w.count.
   */
  updateShockwave() {
    const w = this.weapons.shockwave;
    if (w.level <= 0) return;

    w.timer++;
    if (w.timer >= (w.cooldown / (w.cooldownMult || 1.0)) * this.getEffectiveCooldownMult()) {
      w.timer = 0;
      this.shockwaveQueue = w.count || 1;
      this.shockwaveBurstPoints = []; // Reiniciamos el registro de puntos de la ráfaga actual
    }

    if (this.shockwaveQueue > 0) {
      if (this.shockwaveFireTimer <= 0) {
        this.fireSingleShockwave();
        this.shockwaveQueue--;
        // Retardo de 4 frames (~0.06s) entre cada pulso en cascada
        this.shockwaveFireTimer = 4;
      } else {
        this.shockwaveFireTimer--;
      }
    }
  }

  /**
   * Dispara una onda individual de Seismic Pulse.
   * Si unbound es true (Chaotic Resonance), se ubica aleatoriamente en la arena
   * garantizando que nunca se genere dentro del radio de otro pulso de la misma ráfaga.
   */
  fireSingleShockwave() {
    const w = this.weapons.shockwave;
    const finalRadius = w.radius * (w.radiusMult || 1.0);
    const finalDamage = w.damage * (w.damageMult || 1.0) * this.getEffectiveDamageMult();

    let spawnX = this.x;
    let spawnY = this.y;

    if (w.unbound) {
      const margin = 50;
      const arenaW = state.width || 1920;
      const arenaH = state.height || 1920;
      // Distancia mínima requerida para que ningún pulso se genere dentro del radio del otro
      const minDistance = finalRadius * 2;

      let found = false;
      // Algoritmo de muestreo con rechazo (máximo 30 intentos rápidos)
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

      // Fallback seguro si no encontró posición tras los intentos
      if (!found) {
        spawnX = Math.random() * (arenaW - margin * 2) + margin;
        spawnY = Math.random() * (arenaH - margin * 2) + margin;
      }

      this.shockwaveBurstPoints.push({ x: spawnX, y: spawnY });
    }

    state.shockwaves.push(new Shockwave(spawnX, spawnY, finalRadius, finalDamage));

    // Atenuación de volumen con cadencia x4 para evitar saturación de audio
    const sfxVolume = w.unbound ? 0.45 : 0.7;
    audioManager.playSound('fire_shockwave', { volume: sfxVolume, throttleMs: 50 });
  }

  updateNova() {
    const w = this.weapons.nova;
    if (w.level <= 0) return;
    w.timer++;
    if (w.timer >= (w.cooldown / (w.cooldownMult || 1.0)) * this.getEffectiveCooldownMult()) {
      w.timer = 0;
      this.fireNova();
    }
  }

  fireNova() {
    const w = this.weapons.nova;
    const damage = this.weapons.blaster.damage * 1.5 * this.getEffectiveDamageMult();
    const effSpeed = w.speed * w.speedMult;
    const color = w.isLightning ? "#ffff00" : "#0088ff";
    
    for (let i = 0; i < w.count; i++) {
      const a = (i * 2 * Math.PI) / w.count;
      state.projectiles.push(new NovaProjectile(
        this.x, 
        this.y, 
        Math.cos(a) * effSpeed, 
        Math.sin(a) * effSpeed, 
        damage,
        w.spiral,
        color
      ));
    }
    audioManager.playSound('fire_nova', { volume: 0.6, throttleMs: 100 });
  }

  updateMissiles() {
    const w = this.weapons.missiles;
    if (w.level <= 0) return;
    
    w.timer++;
    if (w.timer >= (w.cooldown / (w.cooldownMult || 1.0)) * this.getEffectiveCooldownMult()) {
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
    const effSpeed = w.speed * w.speedMult;
    
    const MissileClass = w.isCluster ? ClusterBombMissile : MissileProjectile;
    
    state.projectiles.push(new MissileClass(
      this.x,
      this.y,
      Math.cos(angle) * effSpeed,
      Math.sin(angle) * effSpeed,
      w.damage * this.getEffectiveDamageMult(),
      w.homing,
      w.aoe * w.aoeMult
    ));
    audioManager.playSound('fire_missile', { volume: 0.5, throttleMs: 50 });
  }

  updateLaserCannon() {
    const w = this.weapons.laserCannon;
    if (w.level <= 0) return;

    if (w.heat === undefined) {
      w.heat = 0;
      w.maxHeat = 240; // 4 seconds to overheat
      w.overheated = false;
      w.activeLaser = null;
      w.activeSubLasers = [];
      w.tickDamage = true; // Force tick damage for continuous beams
      w.duration = 9999;
      w.chargeTimer = 0;
      w.chargeRequired = 90; // 1.5 seconds at 60fps
      w.timeNotFiring = 0;
      w.timeFiring = 0;
    }

    const isFiring = (mouse.down || aimInput.active);

    if (isFiring && !w.overheated) {
      w.timeNotFiring = 0;
      if (w.chargeTimer < w.chargeRequired) {
        // Charging phase
        w.chargeTimer++;
        
        // Ensure laser is off while charging
        this.destroyActiveLasers(w);
        if (state.camera && typeof state.camera.setAimOffset === 'function') state.camera.setAimOffset(0, 0);

        // Calculate and draw expanding circle
        if (!this.laserChargeGraphics) {
          this.laserChargeGraphics = new PIXI.Graphics();
          if (this.container) this.container.addChild(this.laserChargeGraphics);
        }
        
        this.laserChargeGraphics.clear();
        const radius = (w.chargeTimer / w.chargeRequired) * 20; // Max radius 40
        
        // El circulo debe salir de la punta donde está mirando el jugador
        const tipX = Math.cos(this.angle) * this.radius;
        const tipY = Math.sin(this.angle) * this.radius;
        
        this.laserChargeGraphics.beginFill(0xffff00, 0.8); // Color amarillo rellenado
        this.laserChargeGraphics.drawCircle(tipX, tipY, radius);
        this.laserChargeGraphics.endFill();
      } else {
        // Firing phase
        if (this.laserChargeGraphics) {
          this.laserChargeGraphics.clear();
        }

        // Heating up
        w.timeFiring = (w.timeFiring || 0) + 1;
        const n = Math.floor(w.timeFiring / 120); // n aumenta cada 2 segundos (120 frames)
        const exponentialHeat = Math.pow(1.4, n);

        // Trade-offs: Las mejoras aumentan el costo de calor
        const tradeOffMult = 1.0 
                             + (w.subLasers ? 0.5 : 0) // +50% calor por sub-láseres
                             + ((w.dmgUpgrades || 0) * 0.1) // +10% calor por cada mejora de daño
                             + ((w.widthUpgrades || 0) * 0.1); // +10% calor por cada mejora de tamaño

        const heatRate = this.hasActiveShield() ? (1 - (this.shield.rateBonusUpgrades || 0) * 0.05) : 1;
        
        w.heat += 1.0 * heatRate * (w.heatGenMult || 1.0) * tradeOffMult * exponentialHeat;
        
        if (w.heat >= w.maxHeat) {
          // Overheat trigger
          w.heat = w.maxHeat; // lock at exactly max
          w.overheated = true;
          // Option B: Castigo severo progresivo. Inicia en 2s (120 frames) para la base (240 heat).
          const batteryRatio = w.maxHeat / 240;
          w.overheatLockTimer = Math.floor(120 * batteryRatio); 
          this.destroyActiveLasers(w);
          if (state.camera && typeof state.camera.setAimOffset === 'function') state.camera.setAimOffset(0, 0);
          audioManager.playSound('error', { volume: 0.5, throttleMs: 200 }); // Error/Overheat sound
        } else {
          // Firing logic
          let angle = this.angle; // The ship is now turning slowly, the laser must follow the ship's physical rotation

          if (state.camera && typeof state.camera.setAimOffset === 'function') {
             const aimDist = 160;
             state.camera.setAimOffset(Math.cos(angle) * aimDist, Math.sin(angle) * aimDist);
          }

          const effectiveLaserDmg = (w.damage * w.damageMult * this.getEffectiveDamageMult()) * 0.5; // Scaled down per tick since it hits 12 times/sec

          if (!w.activeLaser) {
             w.activeLaser = new LaserBeam(this.x, this.y, angle, effectiveLaserDmg, w.width * w.widthMult, 9999, false, w.dot ? w.dotDamage : 0, w.dot ? w.dotDuration : 0, true);
             state.laserBeams.push(w.activeLaser);
             
             if (w.subLasers) {
               const subWidth = (w.width * w.widthMult) * 0.25;
               const subDmg = effectiveLaserDmg * 0.25;
               w.activeSubLasers = [
                 new LaserBeam(this.x, this.y, angle - Math.PI / 6, subDmg, subWidth, 9999, true, w.dot ? w.dotDamage : 0, w.dot ? w.dotDuration : 0, true),
                 new LaserBeam(this.x, this.y, angle + Math.PI / 6, subDmg, subWidth, 9999, true, w.dot ? w.dotDamage : 0, w.dot ? w.dotDuration : 0, true)
               ];
               state.laserBeams.push(...w.activeSubLasers);
             }
          } else {
             // Update coordinates of continuous beam
             w.activeLaser.startX = this.x;
             w.activeLaser.startY = this.y;
             w.activeLaser.angle = angle;
             w.activeLaser.damage = effectiveLaserDmg;
             w.activeLaser.life = 9999;
             
             if (w.subLasers && w.activeSubLasers && w.activeSubLasers.length === 2) {
               w.activeSubLasers[0].startX = this.x; w.activeSubLasers[0].startY = this.y; w.activeSubLasers[0].angle = angle - Math.PI / 6; w.activeSubLasers[0].life = 9999; w.activeSubLasers[0].damage = effectiveLaserDmg * 0.25;
               w.activeSubLasers[1].startX = this.x; w.activeSubLasers[1].startY = this.y; w.activeSubLasers[1].angle = angle + Math.PI / 6; w.activeSubLasers[1].life = 9999; w.activeSubLasers[1].damage = effectiveLaserDmg * 0.25;
             }
          }
          
          // Firing particles & sound
          if (state.particlePool && Math.random() < 0.2) {
             const p = state.particlePool.acquire(this.x, this.y, "#00ff00", 3, 0.05, 3);
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
      w.chargeTimer = 0; // Reset charge if not firing or overheated
      if (this.laserChargeGraphics) {
        this.laserChargeGraphics.clear();
      }

      if (state.camera && typeof state.camera.setAimOffset === 'function') {
         state.camera.setAimOffset(0, 0);
      }
      this.destroyActiveLasers(w);
      w.timeNotFiring++; // Track time without firing
      
      // Disminuimos progresivamente timeFiring cuando no dispara para evitar
      // el exploit de soltar el clic 1 frame y reiniciar el multiplicador exponencial.
      w.timeFiring = Math.max(0, (w.timeFiring || 0) - 2);

      if (w.overheated && w.overheatLockTimer > 0) {
        w.overheatLockTimer--; // stays locked at maxHeat
      } else {
        // Option C: Retraso de enfriamiento de 1.5s (90 frames)
        // If overheated, the delay was the lock timer itself, so we don't apply an extra delay.
        if (!w.overheated && w.timeNotFiring < 90) {
          // Aún reteniendo calor...
        } else {
          // Option A: Enfriamiento Desvinculado (Valor Plano)
          let baseCoolRate = w.overheated ? 0.35 : 0.75;
          if (w.coolantInstalled) baseCoolRate *= 2.0;

          // Aceleración de enfriamiento: 
          // Por cada segundo (60 frames) que pase sin disparar (después del retraso inicial), aumenta 25% la velocidad.
          const extraFrames = Math.max(0, w.timeNotFiring - (w.overheated ? 0 : 90));
          let acceleration = 1.0 + (extraFrames / 60) * 0.25;
          acceleration = Math.min(acceleration, 5.0); // Limitamos a un máximo de 5x para que no sea instantáneo

          const finalCoolRate = baseCoolRate * acceleration;
          w.heat = Math.max(0, w.heat - finalCoolRate);
          
          if (w.heat === 0) {
            w.overheated = false;
            w.timeFiring = 0; // Se reinicia completamente el multiplicador al enfriar al 100%
          }
        }
      }
    }
    
    // Clear justReleased flags to prevent other logic from firing
    mouse.justReleased = false;
    aimInput.justReleased = false;
  }

  destroyActiveLasers(w) {
    if (w.activeLaser) {
      w.activeLaser.life = 0;
      w.activeLaser = null;
    }
    if (w.activeSubLasers) {
      w.activeSubLasers.forEach(l => { if(l) l.life = 0; });
      w.activeSubLasers = [];
    }
  }

  takeDamage(amount, damageColor = "#ff2255", attacker = null) {
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

    let actualAmount = amount;
    if (this.damageReduction && this.damageReduction > 0) {
      actualAmount *= (1 - this.damageReduction);
    }
    
    let remainingDamage = Math.floor(Math.max(1, actualAmount));
    const originalDamage = remainingDamage;

    if (this.overhealth > 0) {
      const blocked = Math.min(this.overhealth, remainingDamage);
      this.overhealth -= blocked;
      remainingDamage -= blocked;
    }
    
    this.hp -= remainingDamage;
    
    // Thorns logic
    if (this.thorns > 0 && attacker && typeof attacker.takeDamage === 'function' && originalDamage > 0) {
      const thornsDmg = Math.max(1, Math.floor(originalDamage * this.thorns));
      attacker.takeDamage(thornsDmg, "#ffff00");
    }

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
    // Increase size and decrease damage
    const explosionRadius = this.shield.explodeRadius || 400; // Increased from 240
    const explosionDamage = (this.shield.explodeDamage || 600) * this.getEffectiveDamageMult(); // Decreased from 1200
    const knockback = 80; // Massive knockback for the shield

    // Visual Explosion in matching charge color
    spawnExplosion(this.x, this.y, color, 35, 4.5);
    
    // Shockwave entity handles BOTH damage and knockback accurately over time as it expands
    state.shockwaves.push(new Shockwave(this.x, this.y, explosionRadius, explosionDamage, color, 'shield', knockback));
    audioManager.playSound('fire_shockwave', { volume: 0.8, throttleMs: 50 });
  }

  grantUpgradeInvulnerability() {
    const statTime = this.invulnerabilityMaxTime || 1.5;
    if (this.invulnerabilityTimer <= statTime) {
      this.invulnerabilityTimer += statTime;
    }
  }

  heal(amount) {
    if (this.hp < this.maxHp) {
      const healAmount = Math.min(amount, this.maxHp - this.hp);
      this.hp += healAmount;
      const leftover = amount - healAmount;
      
      if (leftover > 0 && this.hasOverhealthUpgrade) {
        this.overhealth = Math.min(this.maxHp, this.overhealth + leftover);
      }
    } else if (this.hasOverhealthUpgrade) {
      this.overhealth = Math.min(this.maxHp, this.overhealth + amount);
    }
    
    if (state.floatingTextPool) {
      state.floatingTextPool.acquire(this.x, this.y - 15, `+${Math.floor(amount)}`, "#33ff55", 14);
    }
    audioManager.playSound('pickup_gem', { volume: 0.4, pitch: 1.2, throttleMs: 50 });
    updateHUD();
  }

  gainXP(val) {
    // Allow XP to accumulate decimals so fractional percentage bonuses aren't lost on small gems
    const finalVal = val * (this.xpMultiplier || 1.0);
    this.xp += finalVal;
    if (state.floatingTextPool) {
      state.floatingTextPool.acquire(this.x + (Math.random() * 20 - 10), this.y - 15, `+${Math.floor(finalVal)} XP`, "#00ffcc", 11);
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
    
    if (this.healOnLevelUp && this.healOnLevelUp > 0) {
      this.heal(this.healOnLevelUp);
    }
    
    showUpgradeMenu();
    updateHUD();
  }

  resetUpgrades() {
    this.baseSpeed = 4.2; // Corregido de 3.8
    this.speedMult = 1.0;
    this.speed = 3.8;
    this.speedUpgradesCount = 0;
    this.hpRegen = 0.5; // Corregido de 0
    this.regenUpgradesCount = 0;
    this.pickupRadius = 130;
    this.pickupRadiusMult = 1.0;
    this.magnetUpgrades = 0;
    this.invulnerabilityMaxTime = 1.5;
    this.iFrameUpgradesCount = 0;
    this.damageMult = 1.0;
    this.damageUpgradesCount = 0;
    this.cooldownMult = 1.0;
    
    // Weapon-specific upgrade counters
    this.blasterRateUpgrades = 0;
    this.blasterSpeedUpgrades = 0;
    this.blasterRangeUpgrades = 0;
    
    this.critChance = 0.05; // Corregido de 0.0
    this.critDamage = 1.5;
    this.xpMultiplier = 1.0;
    this.doubleGemChance = 0;
    this.doubleGemUpgradesCount = 0;
    this.autoMagnetChance = 0;
    this.autoMagnetUpgrades = 0;
    
    this.healDropChance = 0;
    this.chipDropChance = 0;
    this.doubleChipChance = 0;
    this.endgameChipBonus = 0;

    this.thorns = 0;
    this.extraRevives = 0;
    this.cooldownReduction = 0;
    this.bossDamageMult = 0;
    this.dashCooldownReduction = 0;
    this.healOnLevelUp = 0;
    this.baseRerolls = 0;
    this.bossChipBounty = 0;
    this.startXP = 0;

    this.acquiredUpgrades = {};
    this.shockwaveQueue = 0;
    this.shockwaveFireTimer = 0;
    this.shockwaveBurstPoints = [];
    if (this.weapons && this.weapons.shockwave) {
      this.weapons.shockwave.count = 1;
      this.weapons.shockwave.countUpgrades = 0;
      this.weapons.shockwave.unbound = false;
      this.weapons.shockwave.damageMult = 1.0;
    }
    
    this.maxHp = 100;
    this.hp = Math.min(this.hp, 100);
    this.overhealth = 0;
    this.hasOverhealthUpgrade = false;
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
      explodeRadius: 400,
      explodeDamage: 600,
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

    this.shockwaveQueue = 0;
    this.shockwaveFireTimer = 0;
    this.shockwaveBurstPoints = [];

    this.weapons = {

      blaster: { level: 1, timer: 0, cooldown: 60, cooldownMult: 1.0, projectileCount: 1, damage: 22, range: 500, speed: 12, homing: 0, homingUpgrades: 0 },
      orbitals: { level: 0, count: 2, radius: 120, angle: 0, speed: 0.05, speedMult: 1.0, damage: 35, tickTimer: 0, tickInterval: 10, size: 12, sizeMult: 1.0, countUpgrades: 0, sizeUpgrades: 0, speedUpgrades: 0 },
      nova: { level: 0, count: 6, timer: 0, cooldown: 400, speed: 6, speedMult: 1.0, spiral: false },
      shockwave: { level: 0, count: 1, countUpgrades: 0, timer: 0, cooldown: 230, cooldownMult: 1.0, radius: 175, radiusMult: 1.0, damage: 150, damageMult: 1.0, rangeUpgrades: 0, rateUpgrades: 0, unbound: false },
      missiles: { level: 0, count: 6, timer: 0, cooldown: 220, speed: 7, speedMult: 1.0, homing: 0.05, aoe: 140, aoeMult: 1.0, damage: 23, countUpgrades: 0, speedUpgrades: 0, homingUpgrade: false, aoeUpgrades: 0 },
      laserCannon: { level: 0, chargeTimer: 0, maxCharge: 1140, fullyCharged: false, damage: 250, width: 25, duration: 24, chargeSpeedMult: 1, damageMult: 1, widthMult: 1, subLasers: false, dot: false, dotDamage: 20, dotDuration: 5, tickDamage: false, soundNode: null, chargeUpgrades: 0, dmgUpgrades: 0, widthUpgrades: 0, lifeUpgrades: 0, dotUpgrades: 0 }
    };
    
    if (this.orbitalSprites) {
      while (this.orbitalSprites.length > 0) {
        const sprite = this.orbitalSprites.pop();
        if (sprite.parent) sprite.parent.removeChild(sprite);
        sprite.destroy();
      }
    }
    if (this.orbitalSprites2) {
      while (this.orbitalSprites2.length > 0) {
        const sprite = this.orbitalSprites2.pop();
        if (sprite.parent) sprite.parent.removeChild(sprite);
        sprite.destroy();
      }
    }

    updateAimJoystickUI();
  }

  updateShieldAura() {
    this.shieldGraphics.clear();
    if (!this.hasActiveShield()) return;

    const chargeColor = this.getShieldColor(this.shield.charges);
    const chargeColorHex = parseInt(chargeColor.replace('#', '0x'), 16);
    
    const shieldRadius = this.radius + 10;
    const t = performance.now() * 0.003;
    const pulse = Math.sin(t * 3) * 1.5;

    this.shieldGraphics.lineStyle(2, chargeColorHex, 1);
    this.shieldGraphics.beginFill(chargeColorHex, 0.06 + (this.shield.charges * 0.04));
    this.shieldGraphics.drawCircle(0, 0, shieldRadius + pulse);
    this.shieldGraphics.endFill();

    const charges = this.shield.charges;
    for (let i = 0; i < charges; i++) {
      const pipAngle = t * 2 + (i * 2 * Math.PI / charges);
      const px = Math.cos(pipAngle) * (shieldRadius + 4);
      const py = Math.sin(pipAngle) * (shieldRadius + 4);
      this.shieldGraphics.beginFill(chargeColorHex, 1);
      this.shieldGraphics.drawCircle(px, py, 2.5);
      this.shieldGraphics.endFill();
    }
  }

  updateUIBars() {
    this.uiGraphics.clear();

    // 1. Aiming Line
    let isAiming = false;
    let aimAngle = 0;
    const w = this.weapons.laserCannon;
    
    if (w && w.level > 0 && !w.overheated && (aimInput.active || mouse.down)) {
      isAiming = true;
      aimAngle = aimInput.active ? aimInput.angle : Math.atan2(mouse.y - this.y, mouse.x - this.x);
    }
    
    if (isAiming) {
      const maxLen = 2000;
      const endX = Math.cos(aimAngle) * maxLen;
      const endY = Math.sin(aimAngle) * maxLen;
      
      const isYellow = (this.weapons.laserCannon.level > 0 && this.weapons.laserCannon.tickDamage);
      this.uiGraphics.lineStyle(1.2, isYellow ? 0xffffaa : 0xb4ffb4, 0.85);
      this.uiGraphics.moveTo(0, 0);
      this.uiGraphics.lineTo(endX, endY);
      
      if (this.weapons.laserCannon.level > 0 && this.weapons.laserCannon.subLasers) {
        this.uiGraphics.lineStyle(1.5, isYellow ? 0xffff00 : 0x00ff00, 0.25);
        for (let offset of [-Math.PI / 6, Math.PI / 6]) {
          const subEndX = Math.cos(aimAngle + offset) * maxLen;
          const subEndY = Math.sin(aimAngle + offset) * maxLen;
          this.uiGraphics.moveTo(0, 0);
          this.uiGraphics.lineTo(subEndX, subEndY);
        }
      }
    }

    // 2. Laser Heat Bar
    if (w && w.level > 0) {
      const barWidth = 36;
      const barHeight = 4;
      const barX = -barWidth / 2;
      const barY = 24;
      const radius = 2;
      const heatRatio = Math.min(1.0, Math.max(0.0, (w.heat || 0) / (w.maxHeat || 1)));

      const frameCount = (Date.now() / 100) % 2;
      const isFlashing = w.overheated && frameCount < 1.0;
      const outlineColor = w.overheated ? 0xff0000 : 0xffaa00;
      const fillColor = w.overheated ? (isFlashing ? 0xff0000 : 0xaa0000) : (heatRatio > 0.75 ? 0xffaa00 : 0x00ff66);

      this.uiGraphics.lineStyle(1, outlineColor, 0.6);
      this.uiGraphics.beginFill(0x0a140f, 0.7);
      this.uiGraphics.drawRoundedRect(barX, barY, barWidth, barHeight, radius);
      this.uiGraphics.endFill();

      const fillW = Math.max(0.01, barWidth * heatRatio);
      if (fillW > 0) {
        this.uiGraphics.beginFill(fillColor, 1.0);
        this.uiGraphics.drawRoundedRect(barX, barY, fillW, barHeight, radius);
        this.uiGraphics.endFill();
      }
    }

    // 3. Shield Recharge Bar
    if (this.shield && this.shield.unlocked && this.shield.charges < this.shield.maxCharges) {
      const hasLaser = w && w.level > 0;
      const barWidth = 36;
      const barHeight = 4;
      const barX = -barWidth / 2;
      const barY = hasLaser ? 32 : 24;
      const radius = 2;
      
      let chargeColorStr = this.getShieldTargetRechargeColor();
      if (!chargeColorStr.startsWith('#')) chargeColorStr = '#ffffff';
      const chargeColorHex = parseInt(chargeColorStr.replace('#', '0x'), 16);
      const rechargeRatio = Math.min(1.0, Math.max(0.0, this.shield.rechargeTimer / this.shield.baseRechargeTime));

      this.uiGraphics.lineStyle(1, chargeColorHex, 1.0);
      this.uiGraphics.beginFill(0x0a1419, 0.75);
      this.uiGraphics.drawRoundedRect(barX, barY, barWidth, barHeight, radius);
      this.uiGraphics.endFill();

      const fillW = Math.max(0.01, barWidth * rechargeRatio);
      if (fillW > 0) {
        this.uiGraphics.beginFill(chargeColorHex, 1.0);
        this.uiGraphics.drawRoundedRect(barX, barY, fillW, barHeight, radius);
        this.uiGraphics.endFill();
      }
    }
  }

  collectChip(value = 1) {
    state.droppedChips = (state.droppedChips || 0) + value;
    if (state.floatingTextPool) {
      state.floatingTextPool.acquire(this.x, this.y - 15, `+${value} CHIP`, "#ffaa00", 14);
    }
    audioManager.playSound('pickup_gem', { volume: 0.4, pitch: 1.5, throttleMs: 50 });
  }

  destroy() {
    if (this.weapons && this.weapons.laserCannon && this.weapons.laserCannon.soundNode) {
      try {
        this.weapons.laserCannon.soundNode.stop();
        this.weapons.laserCannon.soundNode.disconnect();
      } catch (e) {}
      this.weapons.laserCannon.soundNode = null;
    }
    if (this.orbitalSprites) {
      while (this.orbitalSprites.length > 0) {
        const s = this.orbitalSprites.pop();
        if (s && s.parent) s.parent.removeChild(s);
        if (s && s.destroy) s.destroy();
      }
    }
    if (this.orbitalSprites2) {
      while (this.orbitalSprites2.length > 0) {
        const s = this.orbitalSprites2.pop();
        if (s && s.parent) s.parent.removeChild(s);
        if (s && s.destroy) s.destroy();
      }
    }
    if (this.container) {
      if (this.container.parent) {
        this.container.parent.removeChild(this.container);
      }
      this.container.destroy({ children: true });
      this.container = null;
      this.sprite = null;
      this.orbitalContainer = null;
      this.orbitalContainer2 = null;
      this.shieldGraphics = null;
      this.uiGraphics = null;
      this.laserChargeGraphics = null;
    }
  }
}

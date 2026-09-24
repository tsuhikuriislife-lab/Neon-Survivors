import { state } from '../../engine/gameState.js';
import { keys, getMovementVector } from '../../engine/Input.js';
import { dist } from '../../engine/Utils.js';
import { spawnExplosion } from '../effects/spawnExplosion.js';
import { Shockwave } from '../projectiles/Shockwave.js';
import { showUpgradeMenu, triggerGameOver, updateHUD } from '../../ui/UIManager.js';
import { audioManager } from '../../engine/AudioManager.js';
import { textures, drawCachedTexture, getOrCachePolygon } from '../../engine/TextureCache.js';
import { worldLayer } from '../../main.js';
import { metaUpgradesTree } from '../../data/metaUpgrades.js';
import { SaveManager } from '../../engine/SaveManager.js';

export class BasePlayer {
  initWeapons() {
    this.weapons = {};
  }

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

    this.initWeapons();

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

  /**
   * Updates player movement, defenses, weapons, and skill state for one simulation step.
   * @param {number} dt - Fixed simulation delta in seconds.
   * @returns {void}
   */
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

    if (dx !== 0 || dy !== 0) {
      const targetAngle = Math.atan2(dy, dx);
      let diff = targetAngle - this.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.angle += diff * 0.3; // Rotación fluida en lugar de snap instantáneo
      
      if (Math.random() < 0.35 && state.particlePool) {
        state.particlePool.acquire(this.x, this.y, this.customization.engineColor, 1, 0.05, 2);
      }
    }

    for (const key in this.weapons) {
      if (this.weapons[key].update) {
        this.weapons[key].update(dt);
      }
    }
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

    if (this.weapons) {
      for (const key in this.weapons) {
        if (this.weapons[key].destroy) {
          this.weapons[key].destroy();
        }
      }
    }
    this.initWeapons();
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

  /**
   * Draws the automatic Laser Cannon cooldown and shield recharge indicators.
   * @returns {void}
   */
  updateUIBars() {
    this.uiGraphics.clear();

    const w = this.weapons.laserCannon;

    // The bar fills as the automatic shot cooldown elapses.
    if (w && w.level > 0) {
      const barWidth = 36;
      const barHeight = 4;
      const barX = -barWidth / 2;
      const barY = 24;
      const radius = 2;
      const effectiveCooldown = Math.max(
        1,
        Math.round((w.cooldown / (w.cooldownMult || 1.0)) * this.getEffectiveCooldownMult())
      );
      const cooldownRatio = Math.min(1.0, Math.max(0.0, w.timer / effectiveCooldown));

      this.uiGraphics.lineStyle(1, 0x00ff66, 0.7);
      this.uiGraphics.beginFill(0x0a140f, 0.7);
      this.uiGraphics.drawRoundedRect(barX, barY, barWidth, barHeight, radius);
      this.uiGraphics.endFill();

      const fillWidth = barWidth * cooldownRatio;
      if (fillWidth > 0) {
        this.uiGraphics.beginFill(0x00ff66, 1.0);
        this.uiGraphics.drawRoundedRect(barX, barY, fillWidth, barHeight, radius);
        this.uiGraphics.endFill();
      }
    }

    // 2. Shield Recharge Bar
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
    if (this.weapons) {
      for (const key in this.weapons) {
        if (this.weapons[key].destroy) {
          this.weapons[key].destroy();
        }
      }
    }
    if (this.container) {
      if (this.container.parent) {
        this.container.parent.removeChild(this.container);
      }
      this.container.destroy({ children: true });
      this.container = null;
      this.sprite = null;
    }
    this.shieldGraphics = null;
    this.uiGraphics = null;
  }
}

import { Weapon } from './Weapon.js';
import { state } from '../../../engine/gameState.js';
import { dist } from '../../../engine/Utils.js';
import { spawnExplosion } from '../../effects/spawnExplosion.js';
import { audioManager } from '../../../engine/AudioManager.js';
import { textures } from '../../../engine/TextureCache.js';

export class OrbitalsSystem extends Weapon {
  constructor(player) {
    super(player);
    this.level = 0;
    this.count = 2;
    this.radius = 120;
    this.angle = 0;
    this.speed = 0.05;
    this.speedMult = 1.0;
    this.damage = 35;
    this.tickTimer = 0;
    this.tickInterval = 10;
    this.size = 12;
    this.sizeMult = 1.0;
    
    this.dualOrbit = false;
    
    // Orbital container
    this.orbitalContainer = new PIXI.Container();
    this.player.container.addChild(this.orbitalContainer);
    this.orbitalSprites = [];

    // Second orbital container for Dual Orbit
    this.orbitalContainer2 = new PIXI.Container();
    this.player.container.addChild(this.orbitalContainer2);
    this.orbitalSprites2 = [];
  }

  update(dt) {
    if (this.level <= 0) {
      this.orbitalContainer.visible = false;
      this.orbitalContainer2.visible = false;
      return;
    }
    this.orbitalContainer.visible = true;
    this.orbitalContainer2.visible = true;

    this.player.orbitalsAngle += this.speed * this.speedMult;
    this.angle = this.player.orbitalsAngle;
    this.orbitalContainer.rotation = this.angle;
    this.orbitalContainer2.rotation = -this.angle;

    const numOrbits = this.dualOrbit ? 2 : 1;
    
    if (!this.states) this.states = [];
    if (!this.states2) this.states2 = [];

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

    const effSize = this.size * this.sizeMult;
    const texName = effSize > 10 ? 'player_orbital_12' : 'player_orbital_8';

    syncStatesAndSprites(this.orbitalSprites, this.states, this.orbitalContainer, this.count, texName, effSize, this.radius);
    
    if (this.dualOrbit) {
        syncStatesAndSprites(this.orbitalSprites2, this.states2, this.orbitalContainer2, this.count, texName + '_green', effSize, this.radius + 60);
    } else {
        // Clear second orbit if it was somehow deactivated
        while (this.orbitalSprites2.length > 0) {
            const sprite = this.orbitalSprites2.pop();
            this.orbitalContainer2.removeChild(sprite);
            sprite.destroy();
        }
        this.states2 = [];
    }

    const processCollisions = (spritesArray, statesArray, orbitAngleOffset, orbitRadius, colorHexStr) => {
        for (let i = 0; i < spritesArray.length; i++) {
            const stateObj = statesArray[i];
            if (stateObj.disabledTimer > 0) stateObj.disabledTimer--;

            const curAng = orbitAngleOffset + (i * 2 * Math.PI) / spritesArray.length;
            const ox = this.player.x + Math.cos(curAng) * orbitRadius;
            const oy = this.player.y + Math.sin(curAng) * orbitRadius;
            const orbRadius = effSize;
            
            const sourceSprite = spritesArray[i];
            const isDisabled = stateObj.disabledTimer > 0;
            const orbDmg = (this.damage * this.player.getEffectiveDamageMult()) * (isDisabled ? 0.3 : 1.0);

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

            const speedRatio = (this.speed * this.speedMult) / 0.05; 
            const cooldownSeconds = (this.tickInterval / 60.0) / speedRatio;

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

    processCollisions(this.orbitalSprites, this.states, this.angle, this.radius, "#ff00ff");
    if (this.dualOrbit) {
        processCollisions(this.orbitalSprites2, this.states2, -this.angle, this.radius + 60, "#00ff00");
    }
  }

  destroy() {
    this.orbitalContainer.destroy({ children: true });
    this.orbitalContainer2.destroy({ children: true });
  }
}


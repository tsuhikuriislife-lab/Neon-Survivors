import { state } from './gameState.js';
import { resetInputState } from './Input.js';
import { Player } from '../entities/player/Player.js';
import { startUILoop, triggerHUDUpdate, showBossRewardMenu } from '../ui/UIManager.js';
import { bitmapFont } from "./BitmapFont.js";
import { handleSpawning, spawnRandomBoss, updatePendingBossSpawn, updateWave } from '../systems/WaveManager.js';
import { dist } from './Utils.js';
import { spawnExplosion } from '../entities/effects/spawnExplosion.js';
import { MenuBackgroundShowcase, VectorTitleRenderer } from './MenuScene.js';
import { audioManager } from './AudioManager.js';
import { worldLayer } from '../main.js';

export let menuShowcase = null;
export let vectorTitle = null;

export function initGame() {
  state.isInMenu = false;
  state.reset();
  if (menuShowcase) {
    menuShowcase.destroy();
    menuShowcase = null;
  }
  if (vectorTitle) {
    vectorTitle.destroy();
    vectorTitle = null;
  }

  state.player = new Player();
  if (state.camera) {
    state.camera.reset();
    state.camera.x = state.player.x;
    state.camera.y = state.player.y;
    state.camera.targetX = state.player.x;
    state.camera.targetY = state.player.y;
  }
  startUILoop();
  triggerHUDUpdate();
}

let gridOffset = 0;
const tileCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
let tileCtx = null;
if (tileCanvas) {
  tileCanvas.width = 40;
  tileCanvas.height = 40;
  tileCtx = tileCanvas.getContext('2d', { alpha: true });
}
let cachedLinesProps = null;
let gridPattern = null;

// --- PIXI Environment Setup ---
export const backgroundGraphics = new PIXI.Graphics();
export let gridTilingSprite = null;
export const arenaBoundaryGraphics = new PIXI.Graphics();
export let floorControlsSprite = null;
let environmentInitialized = false;

export let floorControlsCanvas = null;

function generateFloorControlsCanvas() {
  if (typeof document === 'undefined') return;
  floorControlsCanvas = document.createElement('canvas');
  floorControlsCanvas.width = state.width || 1920;
  floorControlsCanvas.height = state.height || 1080;
  const offCtx = floorControlsCanvas.getContext('2d');
  
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const cx = floorControlsCanvas.width / 2;
  const cy = floorControlsCanvas.height / 2;
  
  if (!isTouch) {
    const mx = cx - 360;
    const my = cy + 120;
    const rx = cx + 360;
    const ry = cy + 120;

    offCtx.lineWidth = 2;
    offCtx.strokeStyle = `rgba(0, 255, 255, 0.22)`;
    offCtx.fillStyle = `rgba(0, 255, 255, 0.04)`;
    offCtx.beginPath();
    offCtx.roundRect(mx - 22, my - 55 - 22, 44, 44, 6);
    offCtx.roundRect(mx - 55 - 22, my - 22, 44, 44, 6);
    offCtx.roundRect(mx - 22, my - 22, 44, 44, 6);
    offCtx.roundRect(mx + 55 - 22, my - 22, 44, 44, 6);
    offCtx.fill();
    offCtx.stroke();

    offCtx.beginPath();
    offCtx.roundRect(rx - 25, ry - 55, 50, 80, 25);
    offCtx.fill();
    offCtx.stroke();

    offCtx.fillStyle = `rgba(0, 255, 136, 0.25)`;
    offCtx.strokeStyle = `rgba(0, 255, 136, 0.6)`;
    offCtx.beginPath();
    offCtx.roundRect(rx - 23, ry - 53, 22, 35, [22, 0, 0, 0]);
    offCtx.fill();
    offCtx.stroke();

    offCtx.strokeStyle = `rgba(0, 255, 255, 0.25)`;
    offCtx.beginPath();
    offCtx.moveTo(rx, ry - 55);
    offCtx.lineTo(rx, ry - 18);
    offCtx.stroke();

    if (bitmapFont) {
      bitmapFont.drawCachedText(offCtx, "W", mx, my - 55 - 4, 16, "#00ffff", true, "center", "middle", 0.65);
      bitmapFont.drawCachedText(offCtx, "A", mx - 55, my - 4, 16, "#00ffff", true, "center", "middle", 0.65);
      bitmapFont.drawCachedText(offCtx, "S", mx, my - 4, 16, "#00ffff", true, "center", "middle", 0.65);
      bitmapFont.drawCachedText(offCtx, "D", mx + 55, my - 4, 16, "#00ffff", true, "center", "middle", 0.65);

      bitmapFont.drawCachedText(offCtx, "MOVEMENT", mx, my + 55, 15, "#00ffff", true, "center", "alphabetic", 0.75);
      bitmapFont.drawCachedText(offCtx, "LASER CANNON", rx, ry + 55, 15, "#00ff88", true, "center", "alphabetic", 0.75);

      bitmapFont.drawCachedText(offCtx, "WASD / ARROW KEYS", mx, my + 75, 12, "#a0aec0", false, "center", "alphabetic", 0.5);
      bitmapFont.drawCachedText(offCtx, "HOLD CLICK: AIM", rx, ry + 75, 12, "#a0aec0", false, "center", "alphabetic", 0.5);
      bitmapFont.drawCachedText(offCtx, "RELEASE: FIRE", rx, ry + 93, 12, "#a0aec0", false, "center", "alphabetic", 0.5);
    }
  } else {
    const mx = cx - 360;
    const my = cy + 120;
    const rx = cx + 360;
    const ry = cy + 120;

    offCtx.lineWidth = 2;
    offCtx.strokeStyle = `rgba(0, 255, 255, 0.22)`;
    offCtx.fillStyle = `rgba(0, 255, 255, 0.04)`;
    offCtx.beginPath();
    offCtx.arc(mx, my - 20, 50, 0, Math.PI * 2);
    offCtx.fill();
    offCtx.stroke();

    offCtx.fillStyle = `rgba(0, 255, 255, 0.2)`;
    offCtx.strokeStyle = `rgba(0, 255, 255, 0.6)`;
    offCtx.beginPath();
    offCtx.arc(mx, my - 20, 22, 0, Math.PI * 2);
    offCtx.fill();
    offCtx.stroke();

    const drawChevron = (x, y, angle) => {
      offCtx.save();
      offCtx.translate(x, y);
      offCtx.rotate(angle);
      offCtx.strokeStyle = `rgba(0, 255, 255, 0.4)`;
      offCtx.lineWidth = 2;
      offCtx.beginPath();
      offCtx.moveTo(-6, -4); offCtx.lineTo(0, 3); offCtx.lineTo(6, -4);
      offCtx.stroke();
      offCtx.restore();
    };
    drawChevron(mx, my - 20 - 36, Math.PI);
    drawChevron(mx, my - 20 + 36, 0);
    drawChevron(mx - 36, my - 20, Math.PI / 2);
    drawChevron(mx + 36, my - 20, -Math.PI / 2);

    offCtx.strokeStyle = `rgba(0, 255, 136, 0.22)`;
    offCtx.fillStyle = `rgba(0, 255, 136, 0.04)`;
    offCtx.lineWidth = 2;
    offCtx.beginPath();
    offCtx.arc(rx, ry - 20, 50, 0, Math.PI * 2);
    offCtx.fill();
    offCtx.stroke();

    offCtx.strokeStyle = `rgba(0, 255, 136, 0.6)`;
    offCtx.lineWidth = 1.5;
    offCtx.beginPath();
    offCtx.moveTo(rx - 25, ry - 20); offCtx.lineTo(rx + 25, ry - 20);
    offCtx.moveTo(rx, ry - 20 - 25); offCtx.lineTo(rx, ry - 20 + 25);
    offCtx.stroke();

    if (bitmapFont) {
      bitmapFont.drawCachedText(offCtx, "LEFT ZONE", mx, my + 55, 15, "#00ffff", true, "center", "alphabetic", 0.75);
      bitmapFont.drawCachedText(offCtx, "RIGHT ZONE", rx, ry + 55, 15, "#00ff88", true, "center", "alphabetic", 0.75);

      bitmapFont.drawCachedText(offCtx, "JOYSTICK: MOVE", mx, my + 75, 12, "#a0aec0", false, "center", "alphabetic", 0.5);
      bitmapFont.drawCachedText(offCtx, "DRAG: AIM LASER", rx, ry + 75, 12, "#a0aec0", false, "center", "alphabetic", 0.5);
      bitmapFont.drawCachedText(offCtx, "RELEASE: FIRE", rx, ry + 93, 12, "#a0aec0", false, "center", "alphabetic", 0.5);
    }
  }
}

function initEnvironmentLayers() {
  if (environmentInitialized) return;
  worldLayer.addChildAt(arenaBoundaryGraphics, 0);
  
  if (tileCanvas) {
    gridTilingSprite = new PIXI.TilingSprite(PIXI.Texture.from(tileCanvas), state.width, state.height);
    worldLayer.addChildAt(gridTilingSprite, 0);
  }
  
  worldLayer.addChildAt(backgroundGraphics, 0);
  environmentInitialized = true;
}

export function updateBackgroundLayer() {
  initEnvironmentLayers();

  const bgProps = state.environment.background.getComputedProps(state.gameTime);
  const linesProps = state.environment.gridLines.getComputedProps(state.gameTime);
  
  // 1. Base background
  const bgColorHex = parseInt((bgProps.color || "#04030a").replace('#', '0x'), 16) || 0x04030a;
  backgroundGraphics.clear();
  backgroundGraphics.beginFill(bgColorHex);
  backgroundGraphics.drawRect(0, 0, state.width, state.height);
  backgroundGraphics.endFill();

  // 2. Grid (update tileCanvas if changed)
  const linesColorStr = linesProps.color || "rgba(0, 255, 255, 0.04)";
  const linesWidth = Math.max(1, (linesProps.computedBrightness || 1.0));
  const linesKey = linesColorStr + '_' + linesWidth.toFixed(2);

  if (tileCanvas && cachedLinesProps !== linesKey) {
    tileCtx.clearRect(0, 0, 40, 40);
    tileCtx.strokeStyle = linesColorStr;
    tileCtx.lineWidth = linesWidth;
    tileCtx.beginPath();
    tileCtx.moveTo(20, 0);
    tileCtx.lineTo(20, 40);
    tileCtx.moveTo(0, 20);
    tileCtx.lineTo(40, 20);
    tileCtx.stroke();
    cachedLinesProps = linesKey;
    if (gridTilingSprite) {
      gridTilingSprite.texture.update();
    }
  }

  if (gridTilingSprite) {
    gridOffset = (gridOffset + 0.5) % 40;
    gridTilingSprite.tilePosition.y = gridOffset;
  }

  // 3. Floor Controls
  if (!state.isInMenu && state.gameTime < 60) {
    if (!floorControlsCanvas) {
      generateFloorControlsCanvas();
    }
    if (!floorControlsSprite && floorControlsCanvas) {
      floorControlsSprite = new PIXI.Sprite(PIXI.Texture.from(floorControlsCanvas));
      worldLayer.addChildAt(floorControlsSprite, 2);
    }
    
    if (floorControlsSprite) {
      const fadeStart = 50;
      const fadeEnd = 60;
      let alphaFactor = 1.0;
      if (state.gameTime > fadeStart) {
        alphaFactor = Math.max(0, (fadeEnd - state.gameTime) / (fadeEnd - fadeStart));
      }
      floorControlsSprite.alpha = alphaFactor;
    }
  } else if (floorControlsSprite) {
    floorControlsSprite.visible = false;
  }

  // 4. Arena Boundary
  const borderProps = state.environment.borders.getComputedProps(state.gameTime);
  const glow = 15 + Math.sin(state.gameTime * 2) * 5;
  
  arenaBoundaryGraphics.clear();

  // Parse colors to hex
  let outerHex = 0xff00ff;
  let innerHex = 0xffffff;
  let cornerHex = 0xff00ff;
  try {
    const pOuter = (borderProps.outerColor || "#ff00ff").replace('#','');
    outerHex = parseInt(pOuter, 16);
  } catch(e) {}
  
  try {
    // "rgba(255, 255, 255, 0.7)" -> we just use 0xffffff with alpha
    innerHex = 0xffffff;
  } catch(e) {}
  
  try {
    const pCorner = (borderProps.cornerColor || "#ff00ff").replace('#','');
    cornerHex = parseInt(pCorner, 16);
  } catch(e) {}

  // Outer glow (simulated with thick low-alpha line)
  arenaBoundaryGraphics.lineStyle(10, outerHex, 0.3);
  arenaBoundaryGraphics.drawRect(0, 0, state.width, state.height);

  // Inner line
  arenaBoundaryGraphics.lineStyle(1.5, innerHex, 0.7);
  arenaBoundaryGraphics.drawRect(0, 0, state.width, state.height);

  // Corners
  const cornerLen = 50;
  arenaBoundaryGraphics.lineStyle(3, cornerHex, 1.0);
  
  // Top-Left
  arenaBoundaryGraphics.moveTo(0, cornerLen);
  arenaBoundaryGraphics.lineTo(0, 0);
  arenaBoundaryGraphics.lineTo(cornerLen, 0);
  
  // Top-Right
  arenaBoundaryGraphics.moveTo(state.width - cornerLen, 0);
  arenaBoundaryGraphics.lineTo(state.width, 0);
  arenaBoundaryGraphics.lineTo(state.width, cornerLen);
  
  // Bottom-Right
  arenaBoundaryGraphics.moveTo(state.width, state.height - cornerLen);
  arenaBoundaryGraphics.lineTo(state.width, state.height);
  arenaBoundaryGraphics.lineTo(state.width - cornerLen, state.height);
  
  // Bottom-Left
  arenaBoundaryGraphics.moveTo(cornerLen, state.height);
  arenaBoundaryGraphics.lineTo(0, state.height);
  arenaBoundaryGraphics.lineTo(0, state.height - cornerLen);
}

export const bossBeaconGraphics = new PIXI.Graphics();
let beaconAdded = false;

export function updateBossSpawnBeacon() {
  const pending = state.pendingBossSpawn;
  if (!beaconAdded) {
    worldLayer.addChild(bossBeaconGraphics);
    beaconAdded = true;
  }
  
  bossBeaconGraphics.clear();
  
  if (!pending) {
    return;
  }

  const progress = 1 - (pending.timer / pending.duration);
  const pulseSpeed = 4 + progress * 14;
  const pulse = (Math.sin(performance.now() * 0.001 * pulseSpeed * Math.PI) + 1) / 2;

  // Use the boss beacon position
  const bx = pending.x;
  const by = pending.y;

  const maxRadius = 130 + progress * 30;
  
  // Since PIXI gradients are tough, we can draw a series of circles to simulate a gradient
  const steps = 10;
  for (let i = 0; i < steps; i++) {
    const r = maxRadius * (1 - i/steps);
    // alpha decreases as radius increases
    const alpha = (0.15 + pulse * 0.2) * (i/steps);
    bossBeaconGraphics.beginFill(0xff0032, alpha);
    bossBeaconGraphics.drawCircle(bx, by, r);
    bossBeaconGraphics.endFill();
  }

  // Concentric rotating beacon rings
  const rot = performance.now() * 0.002;
  
  // Unfortunately setLineDash is not natively in PIXI Graphics. We will draw arcs.
  bossBeaconGraphics.lineStyle(2.5, 0xff0055, 0.6 + pulse * 0.4);
  bossBeaconGraphics.arc(bx, by, maxRadius * 0.85, rot, rot + Math.PI * 1.8); 
  
  bossBeaconGraphics.lineStyle(2, 0xff78a0, 0.7 + pulse * 0.3);
  bossBeaconGraphics.beginPath();
  bossBeaconGraphics.arc(bx, by, maxRadius * 0.5, -rot * 1.5, -rot * 1.5 + Math.PI * 1.8);
  bossBeaconGraphics.stroke();

  // Central crosshair & warning core
  bossBeaconGraphics.lineStyle(2, 0xffffff, 0.8 + pulse * 0.2);
  const crossSize = 24 + pulse * 8;
  bossBeaconGraphics.moveTo(bx - crossSize, by); bossBeaconGraphics.lineTo(bx + crossSize, by);
  bossBeaconGraphics.moveTo(bx, by - crossSize); bossBeaconGraphics.lineTo(bx, by + crossSize);
  bossBeaconGraphics.stroke();

  bossBeaconGraphics.lineStyle(0);
  bossBeaconGraphics.beginFill(0xffffff, 1.0);
  bossBeaconGraphics.drawCircle(bx, by, 7 + pulse * 4);
  bossBeaconGraphics.endFill();
}

export function loop(timestamp) {
  // Freezes all game updates and canvas rendering while an ad is active
  // releasing 100% of CPU and GPU resources to the video ad player
  if (state.isAdPlaying) {
    state.lastFrameTime = timestamp;
    return;
  }

  const dt = Math.min(0.1, (timestamp - state.lastFrameTime) / 1000);
  state.lastFrameTime = timestamp;

  // =========================================================================
  // START SCREEN / MAIN MENU MODE
  // =========================================================================
  if (state.isInMenu) {
    if (!menuShowcase) menuShowcase = new MenuBackgroundShowcase();
    if (!vectorTitle) vectorTitle = new VectorTitleRenderer("NEON SURVIVORS");

    menuShowcase.update(dt);
    vectorTitle.update(dt);

    if (state.camera) {
      const time = menuShowcase.time;
      state.camera.targetX = 960 + Math.sin(time * 0.22) * 80;
      state.camera.targetY = 960 + Math.cos(time * 0.18) * 50;
      state.camera.x += (state.camera.targetX - state.camera.x) * (dt * 2.0);
      state.camera.y += (state.camera.targetY - state.camera.y) * (dt * 2.0);
      state.camera.applyToLayer(worldLayer);
    }

    audioManager.playMusic('music_main');

    updateBackgroundLayer();

    return;
  }

  if (state.isPaused !== state.wasPaused) {
    if (state.isPaused) {
      if (state.player && typeof state.player.onPause === 'function') {
        state.player.onPause();
      }
    }
    state.wasPaused = state.isPaused;
  }

  if (!state.isPaused) {
    state.gameTime += dt;

    if (state.gameTime >= state.nextBossTime) {
      if (!state.disableBossSpawns) {
        spawnRandomBoss();
      }
      state.nextBossTime += 300;
    }

    updatePendingBossSpawn(dt);
    updateWave(dt);
    updateBossSpawnBeacon();
    handleSpawning();

    // Update Environment Transitions (Background, Lines, Borders)
    state.environment.update(dt, state.gameTime);

    // 1. Update Enemies & Cleanup Dead Enemies via Swap-and-Pop
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      e.update(state.player);
      if (e.hp <= 0) {
        state.enemies[i] = state.enemies[state.enemies.length - 1];
        state.enemies.pop();
      }
    }

    // 2. Update Spatial Hash Grid with all current enemies
    state.spatialGrid.clear();
    const currentEnemies = state.enemies;
    const enemyLen = currentEnemies.length;
    for (let i = 0; i < enemyLen; i++) {
      state.spatialGrid.insert(currentEnemies[i]);
    }

    // 3. Resolve Enemy-Enemy and Enemy-Boss soft-body collision separation
    if (!state.disableEnemyCollisions) {
      state.spatialGrid.resolveSeparation(state.enemies, state.bosses);
    }

    if (state.player) {
      state.player.update(dt);
    }

    // Update Camera (Player tracking, cinematic focus, screenshake, zoom)
    state.camera.update(dt, state.player);

    // Update Hazard Areas
    for (let i = state.hazardAreas.length - 1; i >= 0; i--) {
      if (!state.hazardAreas[i].update(state.player)) {
        if (state.hazardAreas[i].destroy) state.hazardAreas[i].destroy(); state.hazardAreas[i] = state.hazardAreas[state.hazardAreas.length - 1];
        state.hazardAreas.pop();
      }
    }

    // Update Pooled Projectiles & Fast Collision Checks
    if (state.projectilePool) {
      const pPool = state.projectilePool.pool;
      const pPoolLen = pPool.length;
      for (let i = 0; i < pPoolLen; i++) {
        const p = pPool[i];
        if (!p.active) continue;

        if (!p.update(state.width, state.height)) {
          continue;
        }

        if (!p.isEnemy) {
          let hit = false;
          state.spatialGrid.queryRadius(p.x, p.y, p.radius, (e) => {
            if (e.hp <= 0) return false;

            spawnExplosion(p.x, p.y, "#00ffff", 4, 2);
            audioManager.playSound('hit_main_gun', { volume: 0.4, throttleMs: 40 });
            state.recordDamage('blaster', p.damage);

            e.takeDamage(p.damage, p.color);

            p.active = false; p.sprite.visible = false;
            hit = true;
            return true;
          });

          if (hit) continue;

          // Check bosses
          for (let b of state.bosses) {
            for (let target of b.getTargetables()) {
              if (dist(p.x, p.y, target.x, target.y) < p.radius + target.radius) {
                spawnExplosion(p.x, p.y, "#00ffff", 5, 2.5);
                audioManager.playSound('hit_main_gun', { volume: 0.4, throttleMs: 40 });
                state.recordDamage('blaster', p.damage);
                target.takeDamage(p.damage, p.color);
                p.active = false; p.sprite.visible = false;
                hit = true;
                break;
              }
            }
            if (hit) break;
          }
        } else {
          // Enemy pooled projectile vs player
          if (state.player && dist(p.x, p.y, state.player.x, state.player.y) < p.radius + state.player.radius) {
            state.player.takeDamage(p.damage, p.color);
            spawnExplosion(p.x, p.y, p.color, 6, 2);
            p.active = false; p.sprite.visible = false;
          }
        }
      }
    }

    // Update Custom Projectiles (Nova, Missiles, etc.)
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
      const p = state.projectiles[i];
      if (!p.update()) {
        if (p.destroy) p.destroy(); state.projectiles[i] = state.projectiles[state.projectiles.length - 1];
        state.projectiles.pop();
        continue;
      }

      let hit = false;
      state.spatialGrid.queryRadius(p.x, p.y, p.radius, (e) => {
        if (e.hp <= 0) return false;
        if (p.canHit && !p.canHit(e)) return false;

        spawnExplosion(p.x, p.y, "#00ffff", 4, 2);
        
        if (p.constructor.name === 'NovaProjectile') {
          audioManager.playSound('hit_nova', { volume: 0.5, throttleMs: 60 });
          const ang = Math.atan2(e.y - p.y, e.x - p.x);
          e.x += Math.cos(ang) * 10;
          e.y += Math.sin(ang) * 10;
          state.recordDamage('nova', p.damage);
        } else if (p.constructor.name === 'MissileProjectile') {
          p.onHit();
        } else {
          audioManager.playSound('hit_main_gun', { volume: 0.4, throttleMs: 40 });
          state.recordDamage('blaster', p.damage);
        }

        e.takeDamage(p.damage, p.color);
        
        if (!p.pierce) {
          if (p.destroy) p.destroy(); state.projectiles[i] = state.projectiles[state.projectiles.length - 1];
          state.projectiles.pop();
          hit = true;
          return true;
        }
      });

      if (hit) continue;

      for (let b of state.bosses) {
        for (let target of b.getTargetables()) {
          if (dist(p.x, p.y, target.x, target.y) < p.radius + target.radius) {
            if (p.canHit && !p.canHit(target)) continue;

            spawnExplosion(p.x, p.y, "#00ffff", 5, 2.5);

            if (p.constructor.name === 'NovaProjectile') {
              audioManager.playSound('hit_nova', { volume: 0.5, throttleMs: 60 });
              state.recordDamage('nova', p.damage);
            } else if (p.constructor.name === 'MissileProjectile') {
              p.onHit();
            } else {
              audioManager.playSound('hit_main_gun', { volume: 0.4, throttleMs: 40 });
              state.recordDamage('blaster', p.damage);
            }

            target.takeDamage(p.damage, p.color);

            if (!p.pierce) {
              if (p.destroy) p.destroy(); state.projectiles[i] = state.projectiles[state.projectiles.length - 1];
              state.projectiles.pop();
              hit = true;
              break;
            }
          }
        }
        if (hit) break;
      }
    }

    // Update Custom Enemy Projectiles
    for (let i = state.enemyProjectiles.length - 1; i >= 0; i--) {
      const ep = state.enemyProjectiles[i];
      if (!ep.update()) {
        if (state.enemyProjectiles[i].destroy) state.enemyProjectiles[i].destroy(); state.enemyProjectiles[i] = state.enemyProjectiles[state.enemyProjectiles.length - 1];
        state.enemyProjectiles.pop();
        continue;
      }
      if (dist(ep.x, ep.y, state.player.x, state.player.y) < ep.radius + state.player.radius) {
        state.player.takeDamage(ep.damage, ep.color);
        spawnExplosion(ep.x, ep.y, ep.color, 6, 2);
        if (state.enemyProjectiles[i].destroy) state.enemyProjectiles[i].destroy(); state.enemyProjectiles[i] = state.enemyProjectiles[state.enemyProjectiles.length - 1];
        state.enemyProjectiles.pop();
      }
    }

    for (let i = state.acceleratingProjectiles.length - 1; i >= 0; i--) {
      const ap = state.acceleratingProjectiles[i];
      if (!ap.update()) {
        if (state.acceleratingProjectiles[i].destroy) state.acceleratingProjectiles[i].destroy(); state.acceleratingProjectiles[i] = state.acceleratingProjectiles[state.acceleratingProjectiles.length - 1];
        state.acceleratingProjectiles.pop();
        continue;
      }
      if (dist(ap.x, ap.y, state.player.x, state.player.y) < ap.radius + state.player.radius) {
        state.player.takeDamage(ap.damage, ap.color);
        spawnExplosion(ap.x, ap.y, ap.color, 6, 2);
        if (state.acceleratingProjectiles[i].destroy) state.acceleratingProjectiles[i].destroy(); state.acceleratingProjectiles[i] = state.acceleratingProjectiles[state.acceleratingProjectiles.length - 1];
        state.acceleratingProjectiles.pop();
      }
    }

    for (let i = state.fallingProjectiles.length - 1; i >= 0; i--) {
      const fp = state.fallingProjectiles[i];
      if (!fp.update()) {
        if (state.fallingProjectiles[i].destroy) state.fallingProjectiles[i].destroy(); state.fallingProjectiles[i] = state.fallingProjectiles[state.fallingProjectiles.length - 1];
        state.fallingProjectiles.pop();
        continue;
      }
      if (dist(fp.x, fp.y, state.player.x, state.player.y) < fp.radius + state.player.radius) {
        state.player.takeDamage(fp.damage, fp.color);
        spawnExplosion(fp.x, fp.y, fp.color, 6, 2);
        if (state.fallingProjectiles[i].destroy) state.fallingProjectiles[i].destroy(); state.fallingProjectiles[i] = state.fallingProjectiles[state.fallingProjectiles.length - 1];
        state.fallingProjectiles.pop();
      }
    }

    for (let i = state.shockwaves.length - 1; i >= 0; i--) {
      if (!state.shockwaves[i].update()) {
        if (state.shockwaves[i].destroy) state.shockwaves[i].destroy(); state.shockwaves[i] = state.shockwaves[state.shockwaves.length - 1];
        state.shockwaves.pop();
      }
    }

    for (let i = state.laserBeams.length - 1; i >= 0; i--) {
      if (!state.laserBeams[i].update()) {
        if (state.laserBeams[i].destroy) state.laserBeams[i].destroy(); state.laserBeams[i] = state.laserBeams[state.laserBeams.length - 1];
        state.laserBeams.pop();
      }
    }

    // Cleanup any dead enemies from projectile hits
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      if (state.enemies[i].hp <= 0) {
        state.enemies[i] = state.enemies[state.enemies.length - 1];
        state.enemies.pop();
      }
    }

    const processDot = (t) => {
      if (t.laserDot && t.laserDot.duration > 0) {
        t.laserDot.timer--;
        if (t.laserDot.timer <= 0) {
          t.laserDot.timer = 60;
          t.laserDot.duration--;
          t.takeDamage(t.laserDot.damage, "#00ff00");
        }
        if (Math.random() < 0.1 && state.particlePool) {
          state.particlePool.acquire(t.x, t.y, "#00ff00", 2, 0.05, 2);
        }
      }
    };
    state.enemies.forEach(processDot);

    // Update Bosses
    for (let i = state.bosses.length - 1; i >= 0; i--) {
      const b = state.bosses[i];
      b.update(state.player);
      b.getTargetables().forEach(processDot);
      if (b.getTargetables().length === 0) {
        const bossName = b.constructor.name;
        state.bosses[i] = state.bosses[state.bosses.length - 1];
        state.bosses.pop();
        
        if (!state.bossDefeatTimes.first) {
          state.bossDefeatTimes.first = state.gameTime;
        }
        if (bossName === 'KyrenBoss' && !state.bossDefeatTimes.kyren) {
          state.bossDefeatTimes.kyren = state.gameTime;
        }
        if (bossName === 'AmalgamBossRoot' && !state.bossDefeatTimes.amalgam) {
          state.bossDefeatTimes.amalgam = state.gameTime;
        }

        showBossRewardMenu(bossName);
      }
    }

    // Update Object Pools (Zero GC Churn)
    if (state.gemPool) state.gemPool.update(state.player);
    if (state.particlePool) state.particlePool.update();
    if (state.floatingTextPool) state.floatingTextPool.update();

    // Legacy arrays update if any
    for (let i = state.gems.length - 1; i >= 0; i--) {
      if (!state.gems[i].update(state.player)) {
        state.gems[i] = state.gems[state.gems.length - 1];
        state.gems.pop();
      }
    }

    for (let i = state.particles.length - 1; i >= 0; i--) {
      state.particles[i].update();
      if (state.particles[i].alpha <= 0) {
        state.particles[i] = state.particles[state.particles.length - 1];
        state.particles.pop();
      }
    }

    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
      state.floatingTexts[i].update();
      if (state.floatingTexts[i].alpha <= 0) {
        state.floatingTexts[i] = state.floatingTexts[state.floatingTexts.length - 1];
        state.floatingTexts.pop();
      }
    }
    
    

    let desiredMusic = 'music_main';
    if (state.bosses.length > 0) {
      const bossName = state.bosses[0].constructor.name;
      if (bossName === 'AmalgamBossRoot') desiredMusic = 'music_boss_amalgam';
      else if (bossName === 'DevourerOfTaxBoss') desiredMusic = 'music_boss_devourer';
      else if (bossName === 'KyrenBoss') desiredMusic = 'music_boss_kyren';
    }
    audioManager.playMusic(desiredMusic);

    
  }

  // =========================================================================
  // PIXI SYNC PHASE
  // =========================================================================
  updateBackgroundLayer();
  if (state.camera) {
    state.camera.applyToLayer(worldLayer);
  }

}

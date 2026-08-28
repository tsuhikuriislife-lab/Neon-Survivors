import { state } from './gameState.js';
import { Player } from '../entities/player/Player.js';
import { updateHUD } from '../ui/UIManager.js';
import { handleSpawning, spawnRandomBoss, updatePendingBossSpawn } from '../systems/WaveManager.js';
import { dist } from './Utils.js';
import { spawnExplosion } from '../entities/effects/spawnExplosion.js';
import { MenuBackgroundShowcase, VectorTitleRenderer } from './MenuScene.js';

export const menuShowcase = new MenuBackgroundShowcase();
export const vectorTitle = new VectorTitleRenderer("NEON SURVIVORS");

export function initGame() {
  state.isInMenu = false;
  state.reset();
  state.player = new Player();
  if (state.camera) {
    state.camera.x = state.player.x;
    state.camera.y = state.player.y;
    state.camera.targetX = state.player.x;
    state.camera.targetY = state.player.y;
  }
  updateHUD();
}

let gridOffset = 0;
export function drawBackground(ctx) {
  gridOffset = (gridOffset + 0.5) % 40;
  
  // Arena base background
  ctx.fillStyle = "#04030a";
  ctx.fillRect(0, 0, state.width, state.height);

  ctx.strokeStyle = "rgba(0, 255, 255, 0.04)";
  ctx.lineWidth = 1;

  for (let x = 0; x <= state.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, state.height);
    ctx.stroke();
  }
  for (let y = gridOffset; y <= state.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(state.width, y);
    ctx.stroke();
  }

  drawFloorControls(ctx);
}

export function drawFloorControls(ctx) {
  if (state.gameTime >= 60) return;
  if (state.isInMenu || state.gameTime >= 60) return;

  const fadeStart = 50;
  const fadeEnd = 60;
  let alphaFactor = 1.0;
  if (state.gameTime > fadeStart) {
    alphaFactor = Math.max(0, (fadeEnd - state.gameTime) / (fadeEnd - fadeStart));
  }

  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const cx = state.width / 2;
  const cy = state.height / 2;

  ctx.save();

  if (!isTouch) {
    // ==========================================
    // DESKTOP FLOOR CONTROLS
    // ==========================================
    
    // --- Left Side: Movement (WASD / Arrows) ---
    const mx = cx - 360;
    const my = cy + 120;

    const drawKey = (kx, ky, label, arrow) => {
      ctx.strokeStyle = `rgba(0, 255, 255, ${0.22 * alphaFactor})`;
      ctx.fillStyle = `rgba(0, 255, 255, ${0.04 * alphaFactor})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(kx - 22, ky - 22, 44, 44, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = `rgba(0, 255, 255, ${0.65 * alphaFactor})`;
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, kx, ky - 4);

      ctx.fillStyle = `rgba(255, 255, 255, ${0.35 * alphaFactor})`;
      ctx.font = "11px monospace";
      ctx.fillText(arrow, kx, ky + 11);
    };

    drawKey(mx, my - 55, "W", "▲");
    drawKey(mx - 55, my, "A", "◀");
    drawKey(mx, my, "S", "▼");
    drawKey(mx + 55, my, "D", "▶");

    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = `rgba(0, 255, 255, ${0.75 * alphaFactor})`;
    ctx.font = "bold 15px monospace";
    ctx.fillText("MOVIMIENTO", mx, my + 55);

    ctx.fillStyle = `rgba(160, 174, 192, ${0.5 * alphaFactor})`;
    ctx.font = "12px monospace";
    ctx.fillText("WASD / TECLAS DE DIRECCIÓN", mx, my + 75);


    // --- Right Side: Mouse Aim & Laser Cannon ---
    const rx = cx + 360;
    const ry = cy + 120;

    ctx.strokeStyle = `rgba(0, 255, 255, ${0.22 * alphaFactor})`;
    ctx.fillStyle = `rgba(0, 255, 255, ${0.04 * alphaFactor})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(rx - 25, ry - 55, 50, 80, 25);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = `rgba(0, 255, 136, ${0.25 * alphaFactor})`;
    ctx.strokeStyle = `rgba(0, 255, 136, ${0.6 * alphaFactor})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(rx - 23, ry - 53, 22, 35, [22, 0, 0, 0]);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = `rgba(0, 255, 255, ${0.25 * alphaFactor})`;
    ctx.beginPath();
    ctx.moveTo(rx, ry - 55);
    ctx.lineTo(rx, ry - 18);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = `rgba(0, 255, 136, ${0.75 * alphaFactor})`;
    ctx.font = "bold 15px monospace";
    ctx.fillText("LÁSER CANNON", rx, ry + 55);

    ctx.fillStyle = `rgba(160, 174, 192, ${0.5 * alphaFactor})`;
    ctx.font = "12px monospace";
    ctx.fillText("MANTENER CLICK: APUNTAR", rx, ry + 75);
    ctx.fillText("SOLTAR: DISPARAR", rx, ry + 93);

  } else {
    // ==========================================
    // MOBILE / TOUCH FLOOR CONTROLS
    // ==========================================
    
    // --- Left Zone: Movement Joystick ---
    const mx = cx - 360;
    const my = cy + 120;

    ctx.strokeStyle = `rgba(0, 255, 255, ${0.22 * alphaFactor})`;
    ctx.fillStyle = `rgba(0, 255, 255, ${0.04 * alphaFactor})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mx, my - 20, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = `rgba(0, 255, 255, ${0.2 * alphaFactor})`;
    ctx.strokeStyle = `rgba(0, 255, 255, ${0.6 * alphaFactor})`;
    ctx.beginPath();
    ctx.arc(mx, my - 20, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const drawChevron = (x, y, angle) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.strokeStyle = `rgba(0, 255, 255, ${0.4 * alphaFactor})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-6, -4); ctx.lineTo(0, 3); ctx.lineTo(6, -4);
      ctx.stroke();
      ctx.restore();
    };
    drawChevron(mx, my - 20 - 36, Math.PI);
    drawChevron(mx, my - 20 + 36, 0);
    drawChevron(mx - 36, my - 20, Math.PI / 2);
    drawChevron(mx + 36, my - 20, -Math.PI / 2);

    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = `rgba(0, 255, 255, ${0.75 * alphaFactor})`;
    ctx.font = "bold 15px monospace";
    ctx.fillText("ZONA IZQUIERDA", mx, my + 55);

    ctx.fillStyle = `rgba(160, 174, 192, ${0.5 * alphaFactor})`;
    ctx.font = "12px monospace";
    ctx.fillText("JOYSTICK: MOVERSE", mx, my + 75);


    // --- Right Zone: Aim & Fire Laser Joystick ---
    const rx = cx + 360;
    const ry = cy + 120;

    ctx.strokeStyle = `rgba(0, 255, 136, ${0.22 * alphaFactor})`;
    ctx.fillStyle = `rgba(0, 255, 136, ${0.04 * alphaFactor})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(rx, ry - 20, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = `rgba(0, 255, 136, ${0.6 * alphaFactor})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(rx - 25, ry - 20); ctx.lineTo(rx + 25, ry - 20);
    ctx.moveTo(rx, ry - 20 - 25); ctx.lineTo(rx, ry - 20 + 25);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = `rgba(0, 255, 136, ${0.75 * alphaFactor})`;
    ctx.font = "bold 15px monospace";
    ctx.fillText("ZONA DERECHA", rx, ry + 55);

    ctx.fillStyle = `rgba(160, 174, 192, ${0.5 * alphaFactor})`;
    ctx.font = "12px monospace";
    ctx.fillText("DESLIZAR: APUNTAR LÁSER", rx, ry + 75);
    ctx.fillText("SOLTAR: DISPARAR", rx, ry + 93);
  }

  ctx.restore();
}

export function drawArenaBoundary(ctx) {
  ctx.save();
  // Outer arena glow
  ctx.strokeStyle = "rgba(0, 255, 255, 0.35)";
  ctx.lineWidth = 4;
  ctx.shadowColor = "#00ffff";
  ctx.shadowBlur = 15;
  ctx.strokeRect(0, 0, state.width, state.height);

  // Inner sharp line
  ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 0;
  ctx.strokeRect(0, 0, state.width, state.height);

  // Glowing corner accents
  const cornerLen = 50;
  ctx.strokeStyle = "#ff00ff";
  ctx.lineWidth = 3;
  ctx.shadowColor = "#ff00ff";
  ctx.shadowBlur = 12;

  // Top-Left
  ctx.beginPath();
  ctx.moveTo(0, cornerLen); ctx.lineTo(0, 0); ctx.lineTo(cornerLen, 0);
  ctx.stroke();

  // Top-Right
  ctx.beginPath();
  ctx.moveTo(state.width - cornerLen, 0); ctx.lineTo(state.width, 0); ctx.lineTo(state.width, cornerLen);
  ctx.stroke();

  // Bottom-Right
  ctx.beginPath();
  ctx.moveTo(state.width, state.height - cornerLen); ctx.lineTo(state.width, state.height); ctx.lineTo(state.width - cornerLen, state.height);
  ctx.stroke();

  // Bottom-Left
  ctx.beginPath();
  ctx.moveTo(cornerLen, state.height); ctx.lineTo(0, state.height); ctx.lineTo(0, state.height - cornerLen);
  ctx.stroke();

  ctx.restore();
}

export function drawBossSpawnBeacon(ctx, pending) {
  if (!pending) return;

  const progress = 1 - (pending.timer / pending.duration);
  const pulseSpeed = 4 + progress * 14;
  const pulse = (Math.sin(performance.now() * 0.001 * pulseSpeed * Math.PI) + 1) / 2;

  ctx.save();
  ctx.translate(pending.x, pending.y);

  // Outer danger glow
  const maxRadius = 130 + progress * 30;
  const gradient = ctx.createRadialGradient(0, 0, 10, 0, 0, maxRadius);
  gradient.addColorStop(0, `rgba(255, 0, 50, ${0.45 + pulse * 0.35})`);
  gradient.addColorStop(0.5, `rgba(255, 0, 50, ${0.15 + pulse * 0.2})`);
  gradient.addColorStop(1, "rgba(255, 0, 50, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, maxRadius, 0, Math.PI * 2);
  ctx.fill();

  // Concentric rotating beacon rings
  const rot = performance.now() * 0.002;
  
  ctx.strokeStyle = `rgba(255, 0, 85, ${0.6 + pulse * 0.4})`;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = "#ff0055";
  ctx.shadowBlur = 15;
  ctx.setLineDash([16, 10]);
  ctx.beginPath();
  ctx.arc(0, 0, maxRadius * 0.85, rot, rot + Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(255, 120, 160, ${0.7 + pulse * 0.3})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.arc(0, 0, maxRadius * 0.5, -rot * 1.5, -rot * 1.5 + Math.PI * 2);
  ctx.stroke();

  // Central crosshair & warning core
  ctx.setLineDash([]);
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 + pulse * 0.2})`;
  ctx.lineWidth = 2;
  const crossSize = 24 + pulse * 8;
  ctx.beginPath();
  ctx.moveTo(-crossSize, 0); ctx.lineTo(crossSize, 0);
  ctx.moveTo(0, -crossSize); ctx.lineTo(0, crossSize);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.shadowBlur = 20;
  ctx.shadowColor = "#ff0055";
  ctx.beginPath();
  ctx.arc(0, 0, 7 + pulse * 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function loop(timestamp, ctx) {
  const dt = Math.min(0.1, (timestamp - state.lastFrameTime) / 1000);
  state.lastFrameTime = timestamp;

  // =========================================================================
  // START SCREEN / MAIN MENU MODE
  // =========================================================================
  if (state.isInMenu) {
    menuShowcase.update(dt);
    vectorTitle.update(dt);

    if (state.camera) {
      const time = menuShowcase.time;
      state.camera.targetX = 960 + Math.sin(time * 0.22) * 80;
      state.camera.targetY = 960 + Math.cos(time * 0.18) * 50;
      state.camera.x += (state.camera.targetX - state.camera.x) * (dt * 2.0);
      state.camera.y += (state.camera.targetY - state.camera.y) * (dt * 2.0);
    }

    import('./AudioManager.js').then(({ audioManager }) => {
      audioManager.playMusic('music_main');
    });

    // Clear Canvas
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const cam = state.camera || { x: 960, y: 960, baseScale: 1, userZoom: 1, dpr: 1, screenWidth: window.innerWidth, screenHeight: window.innerHeight };
    const dpr = cam.dpr || 1;
    const effectiveScale = (cam.baseScale || 1) * (cam.userZoom || 1);
    const screenW = cam.screenWidth || window.innerWidth;
    const screenH = cam.screenHeight || window.innerHeight;

    // 1. Draw World Layer (Arena background + Showcased Enemies & Bosses)
    ctx.scale(dpr, dpr);
    ctx.translate(screenW / 2, screenH / 2);
    ctx.scale(effectiveScale, effectiveScale);
    ctx.translate(-cam.x, -cam.y);

    drawBackground(ctx);
    drawArenaBoundary(ctx);
    menuShowcase.draw(ctx);

    ctx.restore();

    // 2. Draw Screen UI Layer (Vector Title)
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    vectorTitle.draw(ctx, screenW, screenH);
    ctx.restore();

    requestAnimationFrame((ts) => loop(ts, ctx));
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
    handleSpawning();

    if (state.player) {
      state.player.update(dt);
      if (state.camera) {
        state.camera.targetX = state.player.x;
        state.camera.targetY = state.player.y;
        const lerpSpeed = Math.min(1, dt * 10);
        state.camera.x += (state.camera.targetX - state.camera.x) * lerpSpeed;
        state.camera.y += (state.camera.targetY - state.camera.y) * lerpSpeed;
      }
    }

    for (let i = state.hazardAreas.length - 1; i >= 0; i--) {
      if (!state.hazardAreas[i].update(state.player)) {
        state.hazardAreas.splice(i, 1);
      }
    }

    for (let i = state.projectiles.length - 1; i >= 0; i--) {
      const p = state.projectiles[i];
      if (!p.update()) {
        state.projectiles.splice(i, 1);
        continue;
      }

      let hit = false;
      for (let j = state.enemies.length - 1; j >= 0; j--) {
        const e = state.enemies[j];
        if (dist(p.x, p.y, e.x, e.y) < p.radius + e.radius) {
          if (p.canHit && !p.canHit(e)) continue;

          spawnExplosion(p.x, p.y, "#00ffff", 4, 2);
          
          import('./AudioManager.js').then(({ audioManager }) => {
            if (p.constructor.name === 'NovaProjectile') {
                audioManager.playSound('hit_nova', { volume: 0.5, throttleMs: 60 });
            } else if (p.constructor.name === 'Projectile') {
                audioManager.playSound('hit_main_gun', { volume: 0.4, throttleMs: 40 });
            }
          });

          // Ligero retroceso (knockback) para Nova
          if (p.constructor.name === 'NovaProjectile') {
            const ang = Math.atan2(e.y - p.y, e.x - p.x);
            e.x += Math.cos(ang) * 10;
            e.y += Math.sin(ang) * 10;
          }

          if (p.constructor.name === 'MissileProjectile') {
            p.onHit();
          }

          if (p.constructor.name === 'NovaProjectile') {
            state.recordDamage('nova', p.damage);
          } else if (p.constructor.name === 'Projectile') {
            state.recordDamage('blaster', p.damage);
          }

          if (!e.takeDamage(p.damage, p.color)) {
            state.enemies.splice(j, 1);
          }
          
          if (!p.pierce) {
            state.projectiles.splice(i, 1);
            hit = true;
            break;
          }
        }
      }

      if (hit) continue;

      for (let b of state.bosses) {
        for (let target of b.getTargetables()) {
          if (dist(p.x, p.y, target.x, target.y) < p.radius + target.radius) {
            if (p.canHit && !p.canHit(target)) continue;

            spawnExplosion(p.x, p.y, "#00ffff", 5, 2.5);

            import('./AudioManager.js').then(({ audioManager }) => {
              if (p.constructor.name === 'NovaProjectile') {
                  audioManager.playSound('hit_nova', { volume: 0.5, throttleMs: 60 });
              } else if (p.constructor.name === 'Projectile') {
                  audioManager.playSound('hit_main_gun', { volume: 0.4, throttleMs: 40 });
              }
            });

            if (p.constructor.name === 'MissileProjectile') {
              p.onHit();
            }

            if (p.constructor.name === 'NovaProjectile') {
              state.recordDamage('nova', p.damage);
            } else if (p.constructor.name === 'Projectile') {
              state.recordDamage('blaster', p.damage);
            }

            target.takeDamage(p.damage, p.color);

            if (!p.pierce) {
              state.projectiles.splice(i, 1);
              hit = true;
              break;
            }
          }
        }
        if (hit) break;
      }
    }

    for (let i = state.enemyProjectiles.length - 1; i >= 0; i--) {
      const ep = state.enemyProjectiles[i];
      if (!ep.update()) {
        state.enemyProjectiles.splice(i, 1);
        continue;
      }
      if (dist(ep.x, ep.y, state.player.x, state.player.y) < ep.radius + state.player.radius) {
        state.player.takeDamage(ep.damage, ep.color);
        spawnExplosion(ep.x, ep.y, ep.color, 6, 2);
        state.enemyProjectiles.splice(i, 1);
      }
    }

    for (let i = state.acceleratingProjectiles.length - 1; i >= 0; i--) {
      const ap = state.acceleratingProjectiles[i];
      if (!ap.update()) {
        state.acceleratingProjectiles.splice(i, 1);
        continue;
      }
      if (dist(ap.x, ap.y, state.player.x, state.player.y) < ap.radius + state.player.radius) {
        state.player.takeDamage(ap.damage, ap.color);
        spawnExplosion(ap.x, ap.y, ap.color, 6, 2);
        state.acceleratingProjectiles.splice(i, 1);
      }
    }

    for (let i = state.fallingProjectiles.length - 1; i >= 0; i--) {
      const fp = state.fallingProjectiles[i];
      if (!fp.update()) {
        state.fallingProjectiles.splice(i, 1);
        continue;
      }
      if (dist(fp.x, fp.y, state.player.x, state.player.y) < fp.radius + state.player.radius) {
        state.player.takeDamage(fp.damage, fp.color);
        spawnExplosion(fp.x, fp.y, fp.color, 6, 2);
        state.fallingProjectiles.splice(i, 1);
      }
    }

    for (let i = state.shockwaves.length - 1; i >= 0; i--) {
      if (!state.shockwaves[i].update()) {
        state.shockwaves.splice(i, 1);
      }
    }

    for (let i = state.laserBeams.length - 1; i >= 0; i--) {
      if (!state.laserBeams[i].update()) {
        state.laserBeams.splice(i, 1);
      }
    }

    for (let i = state.enemies.length - 1; i >= 0; i--) {
      state.enemies[i].update(state.player);
      if (state.enemies[i].hp <= 0) {
        state.enemies.splice(i, 1);
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
        if (Math.random() < 0.1) {
          import('../entities/effects/Particle.js').then(({ Particle }) => {
            state.particles.push(new Particle(t.x, t.y, "#00ff00", 2, 0.05, 2));
          });
        }
      }
    };
    state.enemies.forEach(processDot);

    for (let i = state.bosses.length - 1; i >= 0; i--) {
      state.bosses[i].update(state.player);
      state.bosses[i].getTargetables().forEach(processDot);
      if (state.bosses[i].getTargetables().length === 0) {
        const bossName = state.bosses[i].constructor.name;
        state.bosses.splice(i, 1);
        
        if (!state.bossDefeatTimes.first) {
          state.bossDefeatTimes.first = state.gameTime;
        }
        if (bossName === 'KyrenBoss' && !state.bossDefeatTimes.kyren) {
          state.bossDefeatTimes.kyren = state.gameTime;
        }
        if (bossName === 'AmalgamBossRoot' && !state.bossDefeatTimes.amalgam) {
          state.bossDefeatTimes.amalgam = state.gameTime;
        }

        import('../ui/UIManager.js').then(({ showBossRewardMenu }) => {
          showBossRewardMenu(bossName);
        });
      }
    }

    for (let i = state.gems.length - 1; i >= 0; i--) {
      if (!state.gems[i].update(state.player)) {
        state.gems.splice(i, 1);
      }
    }

    for (let i = state.particles.length - 1; i >= 0; i--) {
      state.particles[i].update();
      if (state.particles[i].alpha <= 0) state.particles.splice(i, 1);
    }

    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
      state.floatingTexts[i].update();
      if (state.floatingTexts[i].alpha <= 0) state.floatingTexts.splice(i, 1);
    }
    
    import('../ui/UIManager.js').then(({ updateActiveSkillHUD }) => {
      updateActiveSkillHUD();
    });

    import('./AudioManager.js').then(({ audioManager }) => {
      let desiredMusic = 'music_main';
      if (state.bosses.length > 0) {
        const bossName = state.bosses[0].constructor.name;
        if (bossName === 'AmalgamBossRoot') desiredMusic = 'music_boss_amalgam';
        else if (bossName === 'DevourerOfTaxBoss') desiredMusic = 'music_boss_devourer';
        else if (bossName === 'KyrenBoss') desiredMusic = 'music_boss_kyren';
      }
      audioManager.playMusic(desiredMusic);
    });

    updateHUD();
  }

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const cam = state.camera || { x: 960, y: 540, baseScale: 1, userZoom: 1, dpr: 1, screenWidth: window.innerWidth, screenHeight: window.innerHeight };
  const dpr = cam.dpr || 1;
  const effectiveScale = (cam.baseScale || 1) * (cam.userZoom || 1);
  const screenW = cam.screenWidth || window.innerWidth;
  const screenH = cam.screenHeight || window.innerHeight;

  ctx.scale(dpr, dpr);
  ctx.translate(screenW / 2, screenH / 2);
  ctx.scale(effectiveScale, effectiveScale);
  ctx.translate(-cam.x, -cam.y);

  drawBackground(ctx);
  drawArenaBoundary(ctx);
  drawBossSpawnBeacon(ctx, state.pendingBossSpawn);

  state.hazardAreas.forEach(h => h.draw(ctx));
  state.gems.forEach(g => g.draw(ctx));
  state.enemies.forEach(e => e.draw(ctx));
  state.bosses.forEach(b => b.draw(ctx));
  state.projectiles.forEach(p => p.draw(ctx));
  state.enemyProjectiles.forEach(ep => ep.draw(ctx));
  state.acceleratingProjectiles.forEach(ap => ap.draw(ctx));
  state.fallingProjectiles.forEach(fp => fp.draw(ctx));
  state.shockwaves.forEach(s => s.draw(ctx));
  state.laserBeams.forEach(l => l.draw(ctx));
  if (state.player) state.player.draw(ctx);
  state.particles.forEach(p => p.draw(ctx));
  state.floatingTexts.forEach(f => f.draw(ctx));

  ctx.restore();

  requestAnimationFrame((ts) => loop(ts, ctx));
}


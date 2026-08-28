import { state } from './gameState.js';
import { Player } from '../entities/player/Player.js';
import { updateHUD } from '../ui/UIManager.js';
import { handleSpawning, spawnRandomBoss } from '../systems/WaveManager.js';
import { dist } from './Utils.js';
import { spawnExplosion } from '../entities/effects/spawnExplosion.js';

export function initGame() {
  state.reset();
  state.player = new Player();
  updateHUD();
}

let gridOffset = 0;
export function drawBackground(ctx) {
  gridOffset = (gridOffset + 0.5) % 40;
  ctx.strokeStyle = "rgba(0, 255, 255, 0.04)";
  ctx.lineWidth = 1;

  for (let x = 0; x < state.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, state.height);
    ctx.stroke();
  }
  for (let y = gridOffset; y < state.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(state.width, y);
    ctx.stroke();
  }
}

export function loop(timestamp, ctx) {
  const dt = Math.min(0.1, (timestamp - state.lastFrameTime) / 1000);
  state.lastFrameTime = timestamp;

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

    handleSpawning();

    if (state.player) {
      state.player.update(dt);
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

  ctx.clearRect(0, 0, state.width, state.height);
  drawBackground(ctx);

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

  requestAnimationFrame((ts) => loop(ts, ctx));
}


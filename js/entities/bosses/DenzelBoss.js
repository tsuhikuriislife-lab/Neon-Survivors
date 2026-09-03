import { state } from '../../engine/gameState.js';
import { dist } from '../../engine/Utils.js';
import { spawnExplosion } from '../effects/spawnExplosion.js';
import { FallingProjectile } from '../projectiles/FallingProjectile.js';
import { audioManager } from '../../engine/AudioManager.js';
import { Boss } from './Boss.js';
import { getOrCachePolygon, textures, drawCachedTexture } from '../../engine/TextureCache.js';
import { worldLayer } from '../../main.js';


export class DenzelBoss extends Boss {
  constructor(x, y, hp, maxHp) {
    super(x, y, "Denzel", maxHp, 75, "#ffffff", hp);
    this.targetY = 300;
    this.radius = 75;
    this.color = "#ffffff";
    this.vx = 4.2;
    this.angle = 0;
    this.fireTimer = 0;
    this.dead = false;
    this.texture = textures['boss_denzel'];
  }

  takeDamage(amt, damageColor = "#ffffff") {
    if (this.dead || this.hp <= 0) return false;
    let finalAmount = amt;
    let isCrit = false;

    if (state.player && Math.random() < (state.player.critChance || 0)) {
      finalAmount *= (state.player.critDamage || 1.5);
      isCrit = true;
    }

    this.hp -= finalAmount;
    const offsetX = (Math.random() * 2 - 1) * (this.radius * 0.8);
    const offsetY = (Math.random() * 2 - 1) * (this.radius * 0.8);
    const fontSize = isCrit ? 24 : 14;

    if (state.floatingTextPool) {
      state.floatingTextPool.acquire(this.x + offsetX, this.y + offsetY, Math.round(finalAmount), damageColor, fontSize, isCrit);
    }

    if (this.hp <= 0) {
      this.hp = 0;
      if (!this.dead) {
        this.dead = true;
        this.die();
        audioManager.playSound('enemy_death_boss', { volume: 0.8, throttleMs: 200 });
        spawnExplosion(this.x, this.y, "#ffffff", 25, 5);
      }
    }
  }

  update(player) {
    if (this.dead) return;
    this.angle -= 0.05;

    if (Math.abs(this.y - this.targetY) > 3) {
      this.y += Math.sign(this.targetY - this.y) * 2;
    } else {
      this.y = this.targetY;
    }

    this.x += this.vx;
    if (this.x < 50 || this.x > state.width - 50) {
      this.vx *= -1;
    }

    this.fireTimer++;
    if (this.fireTimer >= 100) {
      this.fireTimer = 0;
      for (let i = -1; i <= 1; i++) {
        state.fallingProjectiles.push(new FallingProjectile(this.x, this.y, i * 2.2, -7, 18, "#ffffff"));
      }
      audioManager.playSound('enemy_projectile', { volume: 0.6, throttleMs: 100 });
    }

    if (dist(this.x, this.y, player.x, player.y) < this.radius + player.radius) {
      player.takeDamage(22, this.color);
    }
    super.update(player);
  }

}

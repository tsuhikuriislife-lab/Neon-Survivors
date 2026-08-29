import { state } from '../../engine/gameState.js';
import { Enemy } from './Enemy.js';
import { MotherChildEnemy } from './MotherChildEnemy.js';
import { textures } from '../../engine/TextureCache.js';

export class MotherEnemy extends Enemy {
  constructor(x, y) {
    super(x, y);
    this.type = 'mother';
    this.radius = 60;
    this.sides = 8;
    this.speed = 0.8;
    this.maxHp = 300 + state.gameTime * 0.5;
    this.hp = this.maxHp;
    this.color = "#004400";
    this.xpValue = 0; 
    this.damage = 50;
    this.deathSoundKey = 'enemy_death_big';
    this.texture = textures['enemy_mother'];
  }

  update(player) {
    const a = Math.atan2(player.y - this.y, player.x - this.x);
    this.x += Math.cos(a) * this.speed;
    this.y += Math.sin(a) * this.speed;
    super.update(player);
  }

  dropLoot() {
    const scaleLevel = state.bossDefeatTimes.amalgam ? Math.floor((state.gameTime - state.bossDefeatTimes.amalgam) / 150) : 0;
    const childCount = Math.min(8, 3 + scaleLevel);
    const isOutsideMap = this.x < 0 || this.x > state.width || this.y < 0 || this.y > state.height;
    
    for (let i = 0; i < childCount; i++) {
      let cx = this.x;
      let cy = this.y;
      if (isOutsideMap) {
        const margin = 80;
        cx = margin + Math.random() * (state.width - margin * 2);
        cy = margin + Math.random() * (state.height - margin * 2);
      }
      const child = new MotherChildEnemy(cx, cy);
      state.enemies.push(child);
    }
    
    for (let i = 0; i < 3; i++) {
      let gx, gy;
      if (isOutsideMap) {
        const margin = 80;
        gx = margin + Math.random() * (state.width - margin * 2);
        gy = margin + Math.random() * (state.height - margin * 2);
      } else {
        gx = this.x + (Math.random() * 40 - 20);
        gy = this.y + (Math.random() * 40 - 20);
      }
      if (state.gemPool) {
        state.gemPool.acquire(gx, gy, 15);
      }
    }
  }
}

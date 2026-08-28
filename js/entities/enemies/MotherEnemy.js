import { state } from '../../engine/gameState.js';
import { Enemy } from './Enemy.js';
import { Gem } from '../collectibles/Gem.js';
import { spawnExplosion } from '../effects/spawnExplosion.js';

export class MotherEnemy extends Enemy {
  constructor(x, y) {
    super(x, y);
    this.type = 'mother';
    this.radius = 60;
    this.sides = 8;
    this.speed = 0.8;
    this.maxHp = 300 + state.gameTime * 0.5;
    this.hp = this.maxHp;
    this.color = "#004400"; // Dark green
    this.xpValue = 0; 
    this.damage = 50;
    this.deathSoundKey = 'enemy_death_big';
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
    
    import('./MotherChildEnemy.js').then(({ MotherChildEnemy }) => {
      for (let i = 0; i < childCount; i++) {
        const child = new MotherChildEnemy(this.x, this.y);
        state.enemies.push(child);
      }
    });
    
    for(let i = 0; i < 3; i++) {
      state.gems.push(new Gem(this.x + (Math.random()*40-20), this.y + (Math.random()*40-20), 15));
    }
  }
}


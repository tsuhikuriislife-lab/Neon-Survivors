import { Boss } from './Boss.js';
import { state } from '../../engine/gameState.js';
import { getOrCachePolygon, textures, drawCachedTexture } from '../../engine/TextureCache.js';
import { worldLayer } from '../../main.js';


export class TestingBoss extends Boss {
  constructor() {
    super(state.width / 2, state.height / 2, "Dummy Target", 999999, 160, "#00ffff");
    this.texture = textures['boss_testing'];
  }

  takeDamage(amt, damageColor = this.color, hitX = this.x, hitY = this.y) {
    super.takeDamage(amt, damageColor, hitX, hitY);
    this.hp = this.maxHp;
  }

  update(player) {
    this.x = state.width / 2;
    this.y = state.height / 2;
    this.angle = (this.angle || 0) + 0.01;
    super.update(player);
  }

}

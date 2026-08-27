import { state } from '../engine/gameState.js';
import { FloatingText } from '../entities/Effects.js';
import { Enemy } from '../entities/Enemy.js';
import { KyrenBoss, DevourerOfTaxBoss, AmalgamBossRoot } from '../entities/Bosses.js';

export function spawnRandomBoss() {
  const choice = Math.floor(Math.random() * 3);
  if (choice === 0) {
    state.bosses.push(new KyrenBoss());
  } else if (choice === 1) {
    state.bosses.push(new DevourerOfTaxBoss());
  } else {
    state.currentAmalgamBoss = new AmalgamBossRoot();
    state.bosses.push(state.currentAmalgamBoss);
  }
  state.floatingTexts.push(new FloatingText(state.width / 2 - 100, state.height / 2 - 50, "⚠️ ALERTA: JEFE DETECTADO ⚠️", "#ff0055", 22));
}

export function handleSpawning() {
  if (state.disableSpawns) return;
  
  state.spawnTimer++;
  const hasActiveBoss = state.bosses.some(b => b.getTargetables().length > 0);

  let baseInterval;
  if (state.gameTime < 180) {
    baseInterval = Math.max(65, 95 - Math.floor((state.gameTime / 180) * 30));
  } else if (state.gameTime < 480) {
    baseInterval = Math.max(35, 65 - Math.floor(((state.gameTime - 180) / 300) * 30));
  } else {
    baseInterval = Math.max(14, 35 - Math.floor(((state.gameTime - 480) / 300) * 20));
  }

  if (hasActiveBoss) {
    baseInterval = Math.floor(baseInterval / 0.25);
  }

  if (state.spawnTimer >= baseInterval) {
    state.spawnTimer = 0;
    
    let enemyType;
    if (state.gameTime < 180) {
      enemyType = 'small';
    } else if (state.gameTime < 480) {
      enemyType = Math.random() < 0.45 ? 'medium' : 'small';
    } else {
      const roll = Math.random();
      if (roll < 0.30) {
        enemyType = 'large';
      } else if (roll < 0.65) {
        enemyType = 'medium';
      } else {
        enemyType = 'small';
      }
    }

    state.enemies.push(new Enemy(enemyType));
  }
}


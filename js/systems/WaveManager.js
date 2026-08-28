import { state } from '../engine/gameState.js';
import { FloatingText } from '../entities/effects/FloatingText.js';
import { StandardEnemy } from '../entities/enemies/StandardEnemy.js';
import { SwarmerEnemy } from '../entities/enemies/SwarmerEnemy.js';
import { RangerEnemy } from '../entities/enemies/RangerEnemy.js';
import { MotherEnemy } from '../entities/enemies/MotherEnemy.js';
import { KyrenBoss } from '../entities/bosses/KyrenBoss.js';
import { DevourerOfTaxBoss } from '../entities/bosses/DevourerOfTaxBoss.js';
import { AmalgamBossRoot } from '../entities/bosses/AmalgamBossRoot.js';

export function spawnRandomBoss() {
  let bosses = ['KyrenBoss', 'DevourerOfTaxBoss', 'AmalgamBossRoot'];
  if (state.lastBossName) {
    bosses = bosses.filter(b => b !== state.lastBossName);
  }
  const choice = bosses[Math.floor(Math.random() * bosses.length)];
  state.lastBossName = choice;

  if (choice === 'KyrenBoss') {
    state.bosses.push(new KyrenBoss());
  } else if (choice === 'DevourerOfTaxBoss') {
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
    baseInterval = Math.max(40, 65 - Math.floor((state.gameTime / 180) * 25));
  } else if (state.gameTime < 480) {
    baseInterval = Math.max(20, 40 - Math.floor(((state.gameTime - 180) / 300) * 20));
  } else {
    baseInterval = Math.max(10, 20 - Math.floor(((state.gameTime - 480) / 300) * 10));
  }

  if (hasActiveBoss) {
    baseInterval = Math.floor(baseInterval / 0.25);
  }

  if (state.spawnTimer >= baseInterval) {
    state.spawnTimer = 0;
    
    if (state.bossDefeatTimes.first && Math.random() < 0.15) {
       const count = 5 + Math.floor(Math.random() * 4); // 5 to 8 swarmers
       const dummy = new StandardEnemy('small');
       const sx = dummy.x; const sy = dummy.y;
       for (let i = 0; i < count; i++) {
         const sw = new SwarmerEnemy(sx + (Math.random() * 40 - 20), sy + (Math.random() * 40 - 20));
         state.enemies.push(sw);
       }
       return;
    }

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

    if (state.bossDefeatTimes.kyren && Math.random() < 0.20) {
       state.enemies.push(new RangerEnemy());
       return;
    }
    if (state.bossDefeatTimes.amalgam && Math.random() < 0.05) {
       state.enemies.push(new MotherEnemy());
       return;
    }

    state.enemies.push(new StandardEnemy(enemyType));
  }
}


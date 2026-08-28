import { state } from '../engine/gameState.js';
import { drawPolygon } from '../engine/Utils.js';
import { KyrenBoss } from '../entities/bosses/KyrenBoss.js';
import { DenzelBoss } from '../entities/bosses/DenzelBoss.js';
import { DevourerOfTaxBoss } from '../entities/bosses/DevourerOfTaxBoss.js';
import { CarlosMinion } from '../entities/bosses/CarlosMinion.js';
import { SebastianMinion } from '../entities/bosses/SebastianMinion.js';
import { AmalgamBossRoot } from '../entities/bosses/AmalgamBossRoot.js';
import { TestingBoss } from '../entities/bosses/TestingBoss.js';

export const bossRegistry = [];

export function registerBoss(def) {
  const existing = bossRegistry.findIndex(b => b.id === def.id);
  if (existing >= 0) {
    bossRegistry[existing] = def;
  } else {
    bossRegistry.push(def);
  }
}

export function getAllBosses() {
  return bossRegistry;
}

export function getMainBosses() {
  return bossRegistry.filter(b => b.isMainBoss);
}

export function getBossById(id) {
  return bossRegistry.find(b => b.id === id);
}

// 1. Kyren
registerBoss({
  id: 'KyrenBoss',
  name: 'Kyren',
  isMainBoss: true,
  defaultSpawnX: () => state.width / 2,
  defaultSpawnY: () => state.height / 2 - Math.min(state.width, state.height) * 0.35,
  instantiate: (x, y) => {
    const b = new KyrenBoss(x, y);
    state.bosses.push(b);
    return b;
  },
  drawPreview: (ctx) => {
    drawPolygon(ctx, 50, 50, 30, 8, 0, "#00ffcc", 10, "rgba(0, 255, 204, 0.1)");
    drawPolygon(ctx, 50, 50, 15, 8, 0, "#ffffff", 5, "rgba(255, 255, 255, 0.2)");
  }
});

// 2. Devourer of Tax
registerBoss({
  id: 'DevourerOfTaxBoss',
  name: 'Devourer of Tax',
  isMainBoss: true,
  defaultSpawnX: () => state.width / 2,
  defaultSpawnY: () => 250,
  instantiate: (x, y) => {
    const b = new DevourerOfTaxBoss(x, y);
    state.bosses.push(b);
    return b;
  },
  drawPreview: (ctx) => {
    drawPolygon(ctx, 50, 50, 30, 3, -Math.PI/2, "#39ff14", 10, "rgba(57, 255, 20, 0.3)");
  }
});

// 3. Amalgam
registerBoss({
  id: 'AmalgamBossRoot',
  name: 'Amalgam',
  isMainBoss: true,
  defaultSpawnX: () => state.width / 2,
  defaultSpawnY: () => state.height / 2,
  instantiate: (x, y) => {
    state.currentAmalgamBoss = new AmalgamBossRoot(x, y);
    state.bosses.push(state.currentAmalgamBoss);
    return state.currentAmalgamBoss;
  },
  drawPreview: (ctx) => {
    drawPolygon(ctx, 50, 50, 30, 10, 0, "#ff0033", 10, "rgba(255, 0, 51, 0.2)");
  }
});

// 4. Denzel (Sub-boss de Kyren)
registerBoss({
  id: 'DenzelBoss',
  name: 'Denzel',
  isMainBoss: false,
  defaultSpawnX: () => state.width / 2,
  defaultSpawnY: () => 250,
  instantiate: (x, y) => {
    const b = new DenzelBoss(x || state.width / 2, y || 250, 6000, 6000);
    state.bosses.push(b);
    return b;
  },
  drawPreview: (ctx) => {
    drawPolygon(ctx, 50, 50, 24, 6, 0, "#ffffff", 8, "rgba(255, 255, 255, 0.2)");
  }
});

// 5. Carlos (Minion de Devourer)
registerBoss({
  id: 'CarlosMinion',
  name: 'Carlos (Minion)',
  isMainBoss: false,
  defaultSpawnX: () => state.width / 2 - 100,
  defaultSpawnY: () => state.height / 2,
  instantiate: (x, y) => {
    const b = new CarlosMinion(x || state.width / 2 - 100, y || state.height / 2, 3500);
    state.bosses.push(b);
    return b;
  },
  drawPreview: (ctx) => {
    drawPolygon(ctx, 50, 50, 20, 3, 0, "#00ff88", 6, "rgba(0, 255, 136, 0.2)");
  }
});

// 6. Sebastian (Minion de Devourer)
registerBoss({
  id: 'SebastianMinion',
  name: 'Sebastian (Minion)',
  isMainBoss: false,
  defaultSpawnX: () => state.width / 2 + 100,
  defaultSpawnY: () => state.height / 2,
  instantiate: (x, y) => {
    const b = new SebastianMinion(x || state.width / 2 + 100, y || state.height / 2, 3500);
    state.bosses.push(b);
    return b;
  },
  drawPreview: (ctx) => {
    drawPolygon(ctx, 50, 50, 20, 3, Math.PI, "#ff5500", 6, "rgba(255, 85, 0, 0.2)");
  }
});

// 7. Dummy Target
registerBoss({
  id: 'TestingBoss',
  name: 'Dummy Target',
  isMainBoss: false,
  defaultSpawnX: () => state.width / 2,
  defaultSpawnY: () => state.height / 2,
  instantiate: (x, y) => {
    const b = new TestingBoss();
    state.bosses.push(b);
    return b;
  },
  drawPreview: (ctx) => {
    drawPolygon(ctx, 50, 50, 30, 10, 0, "#00ffff", 10, "rgba(0, 255, 255, 0.2)");
  }
});


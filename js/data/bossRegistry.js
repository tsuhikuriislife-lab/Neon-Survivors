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
  theme: {
    primaryColor: '#00f0ff',
    secondaryColor: '#ffaa00',
    innerColor: 'rgba(255, 255, 255, 0.95)',
    glow: 32,
    spawnShake: { strength: 26, duration: 0.7, rotation: 0.09, scale: 0.07 },
    spawnPulse: { rate: 4, amplitude: 0.6 },
    focusZoom: 1.32,
    focusDuration: 3.5
  },
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
  theme: {
    primaryColor: '#39ff14',
    secondaryColor: '#ffaa00',
    innerColor: 'rgba(255, 255, 100, 0.95)',
    glow: 35,
    spawnShake: { strength: 30, duration: 0.8, rotation: 0.1, scale: 0.08 },
    spawnPulse: { rate: 5, amplitude: 0.7 },
    focusZoom: 1.26,
    focusDuration: 3.5
  },
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
  theme: {
    primaryColor: '#ff0033',
    secondaryColor: '#ff00ff',
    innerColor: 'rgba(255, 120, 180, 0.95)',
    glow: 36,
    spawnShake: { strength: 28, duration: 0.75, rotation: 0.09, scale: 0.07 },
    spawnPulse: { rate: 4, amplitude: 0.65 },
    focusZoom: 1.35,
    focusDuration: 3.5
  },
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
  theme: {
    primaryColor: '#ffffff',
    secondaryColor: '#00ffff',
    innerColor: 'rgba(255, 255, 255, 1.0)',
    glow: 28,
    spawnShake: { strength: 20, duration: 0.5, rotation: 0.06, scale: 0.05 },
    spawnPulse: { rate: 3, amplitude: 0.5 },
    focusZoom: 1.25,
    focusDuration: 3.0
  },
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
  theme: {
    primaryColor: '#00ff88',
    secondaryColor: '#39ff14',
    innerColor: 'rgba(255, 255, 255, 0.9)',
    glow: 24,
    spawnShake: { strength: 16, duration: 0.4, rotation: 0.04, scale: 0.03 },
    spawnPulse: { rate: 3, amplitude: 0.4 },
    focusZoom: 1.2,
    focusDuration: 2.5
  },
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
  theme: {
    primaryColor: '#ff5500',
    secondaryColor: '#ffd700',
    innerColor: 'rgba(255, 255, 255, 0.9)',
    glow: 24,
    spawnShake: { strength: 16, duration: 0.4, rotation: 0.04, scale: 0.03 },
    spawnPulse: { rate: 3, amplitude: 0.4 },
    focusZoom: 1.2,
    focusDuration: 2.5
  },
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
  theme: {
    primaryColor: '#00ffff',
    secondaryColor: '#ff00ff',
    innerColor: 'rgba(255, 255, 255, 0.9)',
    glow: 25,
    spawnShake: { strength: 18, duration: 0.5, rotation: 0.05, scale: 0.04 },
    spawnPulse: { rate: 3, amplitude: 0.4 },
    focusZoom: 1.2,
    focusDuration: 2.5
  },
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

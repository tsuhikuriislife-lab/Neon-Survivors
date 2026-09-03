import { state } from '../engine/gameState.js';
import { drawPolygon } from '../engine/Utils.js';
import { StandardEnemy } from '../entities/enemies/StandardEnemy.js';
import { SwarmerEnemy } from '../entities/enemies/SwarmerEnemy.js';
import { RangerEnemy } from '../entities/enemies/RangerEnemy.js';
import { MotherEnemy } from '../entities/enemies/MotherEnemy.js';
import { MotherChildEnemy } from '../entities/enemies/MotherChildEnemy.js';

export const enemyRegistry = [];

export function registerEnemy(def) {
  const existing = enemyRegistry.findIndex(e => e.id === def.id);
  if (existing >= 0) {
    enemyRegistry[existing] = def;
  } else {
    enemyRegistry.push(def);
  }
}

export function getAllEnemies() {
  return enemyRegistry;
}

export function getEnemyById(id) {
  return enemyRegistry.find(e => e.id === id);
}

// 1. Standard Enemy - Small
registerEnemy({
  id: 'standard_small',
  name: 'Small',
  category: 'Standard',
  instantiate: (x, y) => new StandardEnemy('small', x, y),
  drawPreview: (ctx) => {
    drawPolygon(ctx, 50, 50, 20, 3, 0, "#ff3366", 8, "rgba(255, 51, 102, 0.2)");
  }
});

// 2. Standard Enemy - Medium
registerEnemy({
  id: 'standard_medium',
  name: 'Medium',
  category: 'Standard',
  instantiate: (x, y) => new StandardEnemy('medium', x, y),
  drawPreview: (ctx) => {
    drawPolygon(ctx, 50, 50, 24, 5, 0, "#ffbb00", 8, "rgba(255, 187, 0, 0.2)");
  }
});

// 3. Standard Enemy - Large
registerEnemy({
  id: 'standard_large',
  name: 'Large',
  category: 'Standard',
  instantiate: (x, y) => new StandardEnemy('large', x, y),
  drawPreview: (ctx) => {
    drawPolygon(ctx, 50, 50, 30, 6, 0, "#a855f7", 10, "rgba(168, 85, 247, 0.2)");
  }
});

// 4. Swarmer
registerEnemy({
  id: 'swarmer',
  name: 'Swarmer',
  category: 'Special',
  instantiate: (x, y) => new SwarmerEnemy(x, y),
  drawPreview: (ctx) => {
    drawPolygon(ctx, 35, 45, 12, 3, 0, "#ff9900", 6, "rgba(255, 153, 0, 0.2)");
    drawPolygon(ctx, 65, 55, 12, 3, 0, "#ff9900", 6, "rgba(255, 153, 0, 0.2)");
    drawPolygon(ctx, 45, 65, 10, 3, 0, "#ff9900", 6, "rgba(255, 153, 0, 0.2)");
  }
});

// 5. Ranger
registerEnemy({
  id: 'ranger',
  name: 'Ranger',
  category: 'Ranged',
  instantiate: (x, y) => new RangerEnemy(x, y),
  drawPreview: (ctx) => {
    drawPolygon(ctx, 50, 50, 22, 4, Math.PI / 4, "#00ccff", 8, "rgba(0, 204, 255, 0.2)");
  }
});

// 6. Mother
registerEnemy({
  id: 'mother',
  name: 'Mother',
  category: 'Tank',
  instantiate: (x, y) => new MotherEnemy(x, y),
  drawPreview: (ctx) => {
    drawPolygon(ctx, 50, 50, 32, 8, 0, "#00ff66", 10, "rgba(0, 255, 102, 0.2)");
  }
});

// 7. Mother Larva
registerEnemy({
  id: 'mother_child',
  name: 'Mother Larva',
  category: 'Special',
  instantiate: (x, y) => new MotherChildEnemy(x, y),
  drawPreview: (ctx) => {
    drawPolygon(ctx, 50, 50, 14, 3, 0, "#00ff00", 6, "rgba(0, 255, 0, 0.2)");
  }
});


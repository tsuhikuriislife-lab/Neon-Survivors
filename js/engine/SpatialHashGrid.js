// ============================================================================
// SpatialHashGrid.js - 2D Spatial Partitioning Grid for O(1) Collision Lookups
// ============================================================================

export class SpatialHashGrid {
  constructor(width = 1920, height = 1920, cellSize = 120) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.invCellSize = 1 / cellSize;
    this.cols = Math.ceil(width / cellSize);
    this.rows = Math.ceil(height / cellSize);
    this.totalCells = this.cols * this.rows;

    this.cells = new Array(this.totalCells);
    for (let i = 0; i < this.totalCells; i++) {
      this.cells[i] = [];
    }

    this.queryStamp = 0;
  }

  clear() {
    for (let i = 0; i < this.totalCells; i++) {
      this.cells[i].length = 0;
    }
  }

  insert(entity) {
    const r = entity.radius || 15;
    const minC = Math.max(0, Math.min(this.cols - 1, Math.floor((entity.x - r) * this.invCellSize)));
    const maxC = Math.max(0, Math.min(this.cols - 1, Math.floor((entity.x + r) * this.invCellSize)));
    const minR = Math.max(0, Math.min(this.rows - 1, Math.floor((entity.y - r) * this.invCellSize)));
    const maxR = Math.max(0, Math.min(this.rows - 1, Math.floor((entity.y + r) * this.invCellSize)));

    for (let rIdx = minR; rIdx <= maxR; rIdx++) {
      const rowOffset = rIdx * this.cols;
      for (let cIdx = minC; cIdx <= maxC; cIdx++) {
        this.cells[rowOffset + cIdx].push(entity);
      }
    }
  }

  queryRadius(x, y, radius, callback) {
    this.queryStamp++;
    const minC = Math.max(0, Math.min(this.cols - 1, Math.floor((x - radius) * this.invCellSize)));
    const maxC = Math.max(0, Math.min(this.cols - 1, Math.floor((x + radius) * this.invCellSize)));
    const minR = Math.max(0, Math.min(this.rows - 1, Math.floor((y - radius) * this.invCellSize)));
    const maxR = Math.max(0, Math.min(this.rows - 1, Math.floor((y + radius) * this.invCellSize)));

    for (let rIdx = minR; rIdx <= maxR; rIdx++) {
      const rowOffset = rIdx * this.cols;
      for (let cIdx = minC; cIdx <= maxC; cIdx++) {
        const cell = this.cells[rowOffset + cIdx];
        const len = cell.length;
        for (let i = 0; i < len; i++) {
          const entity = cell[i];
          if (entity._spatialStamp === this.queryStamp) continue;
          entity._spatialStamp = this.queryStamp;

          const dx = entity.x - x;
          const dy = entity.y - y;
          const rSum = radius + (entity.radius || 0);
          if (dx * dx + dy * dy <= rSum * rSum) {
            const stop = callback(entity);
            if (stop === true) return true;
          }
        }
      }
    }
    return false;
  }

  queryBox(minX, minY, maxX, maxY, callback) {
    this.queryStamp++;
    const minC = Math.max(0, Math.min(this.cols - 1, Math.floor(minX * this.invCellSize)));
    const maxC = Math.max(0, Math.min(this.cols - 1, Math.floor(maxX * this.invCellSize)));
    const minR = Math.max(0, Math.min(this.rows - 1, Math.floor(minY * this.invCellSize)));
    const maxR = Math.max(0, Math.min(this.rows - 1, Math.floor(maxY * this.invCellSize)));

    for (let rIdx = minR; rIdx <= maxR; rIdx++) {
      const rowOffset = rIdx * this.cols;
      for (let cIdx = minC; cIdx <= maxC; cIdx++) {
        const cell = this.cells[rowOffset + cIdx];
        const len = cell.length;
        for (let i = 0; i < len; i++) {
          const entity = cell[i];
          if (entity._spatialStamp === this.queryStamp) continue;
          entity._spatialStamp = this.queryStamp;

          const r = entity.radius || 0;
          if (entity.x + r >= minX && entity.x - r <= maxX && entity.y + r >= minY && entity.y - r <= maxY) {
            const stop = callback(entity);
            if (stop === true) return true;
          }
        }
      }
    }
    return false;
  }

  getNearest(x, y, maxRange) {
    let closest = null;
    let minDistSq = maxRange * maxRange;

    this.queryRadius(x, y, maxRange, (entity) => {
      const dx = entity.x - x;
      const dy = entity.y - y;
      const dSq = dx * dx + dy * dy;
      if (dSq < minDistSq) {
        minDistSq = dSq;
        closest = entity;
      }
    });

    return closest;
  }

  queryLine(startX, startY, endX, endY, lineWidth, callback) {
    const minX = Math.min(startX, endX) - lineWidth;
    const maxX = Math.max(startX, endX) + lineWidth;
    const minY = Math.min(startY, endY) - lineWidth;
    const maxY = Math.max(startY, endY) + lineWidth;

    const lineDx = endX - startX;
    const lineDy = endY - startY;
    const lineLenSq = lineDx * lineDx + lineDy * lineDy;

    return this.queryBox(minX, minY, maxX, maxY, (entity) => {
      let t = 0;
      if (lineLenSq > 0) {
        t = Math.max(0, Math.min(1, ((entity.x - startX) * lineDx + (entity.y - startY) * lineDy) / lineLenSq));
      }
      const projX = startX + t * lineDx;
      const projY = startY + t * lineDy;
      const dx = entity.x - projX;
      const dy = entity.y - projY;
      const rSum = (lineWidth / 2) + (entity.radius || 0);

      if (dx * dx + dy * dy <= rSum * rSum) {
        return callback(entity);
      }
    });
  }

  /**
   * Resolves soft-body circle separation between all enemies in the grid.
   * Uses spatial hash grid lookups for O(N) performance instead of O(N^2).
   * 
   * @param {Array} entities - Array of active enemies
   * @param {Array} bosses - Optional array of active bosses
   * @param {number} pushRatio - Separation relaxation factor (default 0.6)
   */
  resolveSeparation(entities, bosses = [], pushRatio = 0.6) {
    const count = entities.length;
    if (count < 2 && (!bosses || bosses.length === 0)) return;

    for (let i = 0; i < count; i++) {
      const e1 = entities[i];
      if (!e1 || e1.hp <= 0) continue;

      const r1 = e1.radius || 15;
      const m1 = r1 * r1;
      let pushX = 0;
      let pushY = 0;

      // 1. Check enemy-to-enemy collisions via spatial grid
      this.queryRadius(e1.x, e1.y, r1, (e2) => {
        if (e1 === e2 || !e2 || e2.hp <= 0) return;

        const dx = e1.x - e2.x;
        const dy = e1.y - e2.y;
        const distSq = dx * dx + dy * dy;
        const r2 = e2.radius || 15;
        const minDist = r1 + r2;

        if (distSq < minDist * minDist) {
          const d = Math.sqrt(distSq);
          let nx, ny;
          if (d > 0.001) {
            nx = dx / d;
            ny = dy / d;
          } else {
            // Overlapping on exact same point: pick random direction
            const randAng = Math.random() * Math.PI * 2;
            nx = Math.cos(randAng);
            ny = Math.sin(randAng);
          }

          const overlap = minDist - d;
          const m2 = r2 * r2;
          const totalMass = m1 + m2;
          const weight = totalMass > 0 ? m2 / totalMass : 0.5;

          pushX += nx * overlap * weight * pushRatio;
          pushY += ny * overlap * weight * pushRatio;
        }
      });

      // 2. Check enemy-to-boss collisions (bosses have infinite mass, push enemies away)
      if (bosses && bosses.length > 0) {
        for (let bIdx = 0; bIdx < bosses.length; bIdx++) {
          const boss = bosses[bIdx];
          if (!boss || boss.dead) continue;

          const targets = boss.getTargetables ? boss.getTargetables() : [boss];
          for (let tIdx = 0; tIdx < targets.length; tIdx++) {
            const target = targets[tIdx];
            if (!target || target.dead) continue;

            const bdx = e1.x - target.x;
            const bdy = e1.y - target.y;
            const bDistSq = bdx * bdx + bdy * bdy;
            const bRadius = target.radius || 40;
            const bMinDist = r1 + bRadius;

            if (bDistSq < bMinDist * bMinDist) {
              const bd = Math.sqrt(bDistSq);
              let bnx, bny;
              if (bd > 0.001) {
                bnx = bdx / bd;
                bny = bdy / bd;
              } else {
                const bRandAng = Math.random() * Math.PI * 2;
                bnx = Math.cos(bRandAng);
                bny = Math.sin(bRandAng);
              }
              const bOverlap = bMinDist - bd;
              pushX += bnx * bOverlap * pushRatio;
              pushY += bny * bOverlap * pushRatio;
            }
          }
        }
      }

      // 3. Clamp maximum single-frame displacement to avoid abrupt jumps
      const maxDisplacement = 16;
      const pushMag = Math.hypot(pushX, pushY);
      if (pushMag > maxDisplacement) {
        pushX = (pushX / pushMag) * maxDisplacement;
        pushY = (pushY / pushMag) * maxDisplacement;
      }

      e1.x += pushX;
      e1.y += pushY;

      // 4. Boundary soft-clamp: if inside the arena, don't let pushes push outside
      if (e1.type !== 'swarmer') {
        if (e1.x >= 0 && e1.x <= this.width && e1.y >= 0 && e1.y <= this.height) {
          e1.x = Math.max(r1, Math.min(this.width - r1, e1.x));
          e1.y = Math.max(r1, Math.min(this.height - r1, e1.y));
        }
      }
    }
  }
}

export const spatialGrid = new SpatialHashGrid(1920, 1920, 120);


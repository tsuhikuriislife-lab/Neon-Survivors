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
}

export const spatialGrid = new SpatialHashGrid(1920, 1920, 120);


// ============================================================================
// SpatialHashGrid.js - 2D Spatial Partitioning Grid for O(1) Collision Lookups
// ============================================================================

/**
 * Cuadrícula de partición espacial (Spatial Hash Grid).
 * Divide el mundo de juego en "celdas". En lugar de iterar colisiones entre
 * miles de entidades (lo que sería O(N^2)), esta clase agrupa entidades
 * cercanas en arrays reducidos, bajando la complejidad a casi O(1).
 */
export class SpatialHashGrid {
  /**
   * Inicializa la cuadrícula de colisiones.
   * @param {number} width - Ancho total del área a rastrear.
   * @param {number} height - Alto total del área a rastrear.
   * @param {number} cellSize - Tamaño del lado de cada celda cuadrada (ej: 120px).
   */
  constructor(width = 1920, height = 1920, cellSize = 120) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    
    // Multiplicar es más rápido que dividir para la CPU. Guardamos el recíproco.
    this.invCellSize = 1 / cellSize;
    
    this.cols = Math.ceil(width / cellSize);
    this.rows = Math.ceil(height / cellSize);
    this.totalCells = this.cols * this.rows;

    // Aplanamos el grid 2D a un array 1D para mejorar el cache locality (rendimiento de memoria)
    this.cells = new Array(this.totalCells);
    for (let i = 0; i < this.totalCells; i++) {
      this.cells[i] = [];
    }

    // Este sello (stamp) se usa para evitar registrar una misma entidad dos veces
    // en una misma consulta si dicha entidad pertenece a varias celdas solapadas.
    this.queryStamp = 0;
  }

  /**
   * Limpia las referencias de las celdas sin destruir los arrays.
   * Evita crear nuevos arrays por fotograma (Garbage Collection optimization).
   */
  clear() {
    for (let i = 0; i < this.totalCells; i++) {
      this.cells[i].length = 0; // Trunca el array instantáneamente
    }
  }

  /**
   * Inserta una entidad dentro de las celdas de la cuadrícula que intercepta su radio.
   * @param {Object} entity - La entidad a rastrear (debe tener .x, .y, y opcional .radius).
   */
  insert(entity) {
    const r = entity.radius || 15;
    
    // Calculamos qué celdas ocupa la entidad limitando los valores (clamp) a los bordes del grid.
    const minC = Math.max(0, Math.min(this.cols - 1, Math.floor((entity.x - r) * this.invCellSize)));
    const maxC = Math.max(0, Math.min(this.cols - 1, Math.floor((entity.x + r) * this.invCellSize)));
    const minR = Math.max(0, Math.min(this.rows - 1, Math.floor((entity.y - r) * this.invCellSize)));
    const maxR = Math.max(0, Math.min(this.rows - 1, Math.floor((entity.y + r) * this.invCellSize)));

    // Recorremos las filas y columnas donde cayó la entidad
    for (let rIdx = minR; rIdx <= maxR; rIdx++) {
      // Calculamos el offset del array 1D (Fila * Total Columnas)
      const rowOffset = rIdx * this.cols;
      for (let cIdx = minC; cIdx <= maxC; cIdx++) {
        this.cells[rowOffset + cIdx].push(entity);
      }
    }
  }

  /**
   * Busca todas las entidades dentro de un círculo específico.
   * @param {number} x - Posición X del origen.
   * @param {number} y - Posición Y del origen.
   * @param {number} radius - Radio de búsqueda.
   * @param {Function} callback - Función que se ejecuta por cada impacto. Si retorna true, se corta la búsqueda.
   * @returns {boolean} Retorna true si se detuvo prematuramente.
   */
  queryRadius(x, y, radius, callback) {
    // Incrementamos el sello para identificar de forma única esta búsqueda en todo el grid
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
          
          // Previene contar la misma entidad dos veces si está metida en celdas colindantes
          if (entity._spatialStamp === this.queryStamp) continue;
          entity._spatialStamp = this.queryStamp;

          // Verificación matemática circular estándar: (A^2 + B^2 <= C^2)
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

  /** Busca entidades en un área rectangular. */
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
          // Validación simple de límites AABB extendida con el radio circular (simplificado)
          if (entity.x + r >= minX && entity.x - r <= maxX && entity.y + r >= minY && entity.y - r <= maxY) {
            const stop = callback(entity);
            if (stop === true) return true;
          }
        }
      }
    }
    return false;
  }

  /** Encuentra y retorna la entidad viva más cercana dentro de un rango máximo. */
  getNearest(x, y, maxRange) {
    let closest = null;
    let minDistSq = maxRange * maxRange;

    this.queryRadius(x, y, maxRange, (entity) => {
      const dx = entity.x - x;
      const dy = entity.y - y;
      const dSq = dx * dx + dy * dy; // Distancia cuadrada, evitamos sqrt por eficiencia
      if (dSq < minDistSq) {
        minDistSq = dSq;
        closest = entity;
      }
    });

    return closest;
  }

  /**
   * Lanza un rayo/línea y busca intersecciones. Útil para armas láser.
   * Emplea un área de búsqueda envolvente (AABB) y luego aplica una proyección de producto escalar.
   */
  queryLine(startX, startY, endX, endY, lineWidth, callback) {
    // 1. Creamos la caja límite (Bounding Box) alrededor de toda la línea
    const minX = Math.min(startX, endX) - lineWidth;
    const maxX = Math.max(startX, endX) + lineWidth;
    const minY = Math.min(startY, endY) - lineWidth;
    const maxY = Math.max(startY, endY) + lineWidth;

    const lineDx = endX - startX;
    const lineDy = endY - startY;
    const lineLenSq = lineDx * lineDx + lineDy * lineDy;

    // 2. Buscamos todas las entidades en esa caja
    return this.queryBox(minX, minY, maxX, maxY, (entity) => {
      let t = 0;
      
      // Proyección vectorial escalar: Encontramos el punto `t` sobre el segmento de línea 
      // que está matemáticamente más cerca del centro del enemigo (producto punto).
      if (lineLenSq > 0) {
        t = Math.max(0, Math.min(1, ((entity.x - startX) * lineDx + (entity.y - startY) * lineDy) / lineLenSq));
      }
      
      const projX = startX + t * lineDx;
      const projY = startY + t * lineDy;
      
      const dx = entity.x - projX;
      const dy = entity.y - projY;
      
      const rSum = (lineWidth / 2) + (entity.radius || 0);

      // Verificamos si la distancia desde el enemigo a su proyección en el láser es colisión
      if (dx * dx + dy * dy <= rSum * rSum) {
        return callback(entity);
      }
    });
  }

  /**
   * Resuelve el solapamiento (soft-body collision) entre todos los enemigos de la cuadricula.
   * Evita que se amontonen usando los datos cacheados del Spatial Hash.
   * 
   * @param {Array} entities - Lista de enemigos activos a repeler.
   * @param {Array} bosses - Opcional. Los jefes empujan infinitamente, no son empujados.
   * @param {number} pushRatio - Factor de rebote, evita empujes explosivos reajustándolo a 0.6.
   */
  resolveSeparation(entities, bosses = [], pushRatio = 0.6) {
    const count = entities.length;
    if (count < 2 && (!bosses || bosses.length === 0)) return;

    for (let i = 0; i < count; i++) {
      const e1 = entities[i];
      if (!e1 || e1.hp <= 0) continue;

      const r1 = e1.radius || 15;
      const m1 = r1 * r1; // Área como analogía matemática de masa para entidades grandes
      let pushX = 0;
      let pushY = 0;

      // 1. Colisiones Enemigo <-> Enemigo (búsqueda optimizada por Hash Spatial)
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
            nx = dx / d; // Vector normalizado (dirección)
            ny = dy / d;
          } else {
            // Caso borde extremo: Están en la misma coordenada excacta, elegimos dirección al azar
            const randAng = Math.random() * Math.PI * 2;
            nx = Math.cos(randAng);
            ny = Math.sin(randAng);
          }

          const overlap = minDist - d;
          const m2 = r2 * r2;
          const totalMass = m1 + m2;
          
          // Peso relativo: El enemigo más masivo es empujado menos. (Peso ponderado elástico)
          const weight = totalMass > 0 ? m2 / totalMass : 0.5;

          pushX += nx * overlap * weight * pushRatio;
          pushY += ny * overlap * weight * pushRatio;
        }
      });

      // 2. Colisiones Enemigo <-> Jefe (El jefe actúa con masa infinita)
      if (bosses && bosses.length > 0) {
        for (let bIdx = 0; bIdx < bosses.length; bIdx++) {
          const boss = bosses[bIdx];
          if (!boss || boss.dead) continue;

          // Extraemos los cuerpos del jefe (por si es tipo Serpiente o Amalgama)
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
              
              // Aquí no hay weight; el enemigo absorbe el 100% del empuje del jefe
              pushX += bnx * bOverlap * pushRatio;
              pushY += bny * bOverlap * pushRatio;
            }
          }
        }
      }

      // 3. Amortiguador de Velocidad Terminal: Previene teletransportes en solapamientos masivos
      const maxDisplacement = 16;
      const pushMag = Math.hypot(pushX, pushY);
      if (pushMag > maxDisplacement) {
        pushX = (pushX / pushMag) * maxDisplacement;
        pushY = (pushY / pushMag) * maxDisplacement;
      }

      e1.x += pushX;
      e1.y += pushY;

      // 4. Límite de la Arena: Los empujes físicos no pueden expulsar a los monstruos fuera de los bordes 
      // (a menos que sean swarmers kamikaze).
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

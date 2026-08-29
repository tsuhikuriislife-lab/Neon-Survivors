// ============================================================================
// ProceduralBatchRenderer.js - High-Performance 2D Geometry Batching Pipeline
// Zero GC per frame | CPU Frustum Culling | Instance Buffering | LOD Control
// ============================================================================

/**
 * 1. BANCO DE GEOMETRÍA ESTÁTICA (Mallas unitarias precalculadas con radio = 1.0)
 * Precalcula y congela las coordenadas locales de los vértices al inicio del motor
 * para eliminar por completo cálculos trigonométricos (Math.cos/sin) repetitivos.
 */
export const GeometryBank = {
  TRIANGLE: generateUnitPolygon(3, 0),
  DIAMOND: generateUnitPolygon(4, 0),
  PENTAGON: generateUnitPolygon(5, 0),
  HEXAGON: generateUnitPolygon(6, 0),
  OCTAGON: generateUnitPolygon(8, 0),
  CIRCLE_LOD_HIGH: generateUnitPolygon(12, 0),
  CIRCLE_LOD_LOW: generateUnitPolygon(8, 0)
};

function generateUnitPolygon(sides, rotationOffset = 0) {
  const vertices = new Float32Array(sides * 2);
  const step = (Math.PI * 2) / sides;
  for (let i = 0; i < sides; i++) {
    const angle = i * step + rotationOffset;
    vertices[i * 2] = Math.cos(angle);
    vertices[i * 2 + 1] = Math.sin(angle);
  }
  return Object.freeze({ sides, vertices });
}

/**
 * Utilidad estática para parsear colores HEX o HSL a RGB [0-255] una sola vez al instanciar entidades.
 */
export function parseColorToRgb(colorStr) {
  if (!colorStr) return { r: 255, g: 255, b: 255 };
  
  if (colorStr.startsWith('#')) {
    let hex = colorStr.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    const num = parseInt(hex, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }
  
  if (colorStr.startsWith('hsl')) {
    const matches = colorStr.match(/\d+(\.\d+)?/g);
    if (matches && matches.length >= 3) {
      const h = parseFloat(matches[0]) / 360;
      const s = parseFloat(matches[1]) / 100;
      const l = parseFloat(matches[2]) / 100;
      return hslToRgb(h, s, l);
    }
  }

  return { r: 255, g: 255, b: 255 };
}

export function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

/**
 * 2. GESTOR DE RENDERIZADO POR LOTES DINÁMICO (PROCEDURAL BATCH RENDERER)
 */
export class ProceduralBatchRenderer {
  /**
   * @param {number} maxInstances Capacidad máxima de instancias simultáneas
   */
  constructor(maxInstances = 5000) {
    this.maxInstances = maxInstances;

    // Buffer plano de instancias (10 floats por cada entidad):
    // [0: x, 1: y, 2: cosA, 3: sinA, 4: radius, 5: r, 6: g, 7: b, 8: alpha, 9: sides]
    this.INSTANCE_STRIDE = 10;
    this.instanceData = new Float32Array(this.maxInstances * this.INSTANCE_STRIDE);
    this.instanceCount = 0;

    // Cubos de índices preasignados agrupados por cantidad de lados (Zero GC)
    this.supportedSides = [3, 4, 5, 6, 8, 12];
    this.buckets = new Map();
    for (const sides of this.supportedSides) {
      this.buckets.set(sides, {
        indices: new Int32Array(this.maxInstances),
        count: 0
      });
    }

    // Límites de Frustum en espacio mundial
    this.cullMinX = 0;
    this.cullMinY = 0;
    this.cullMaxX = 0;
    this.cullMaxY = 0;

    // Métricas de diagnóstico
    this.stats = {
      submitted: 0,
      culled: 0,
      rendered: 0,
      drawCalls: 0
    };
  }

  /**
   * Prepara el pipeline al inicio de cada frame y actualiza el Frustum Culling AABB.
   * @param {Object} camera Controlador de cámara del juego
   */
  beginFrame(camera) {
    this.instanceCount = 0;

    // Reiniciar contadores de buckets a 0 (Cero reasignaciones de memoria)
    for (const bucket of this.buckets.values()) {
      bucket.count = 0;
    }

    this.stats.submitted = 0;
    this.stats.culled = 0;
    this.stats.rendered = 0;
    this.stats.drawCalls = 0;

    // Calcular límites mundiales visibles desde la cámara con margen de tolerancia
    const zoom = (camera && camera.zoom) ? camera.zoom : 1.0;
    const camX = (camera && camera.x !== undefined) ? camera.x : 960;
    const camY = (camera && camera.y !== undefined) ? camera.y : 960;
    const screenW = (camera && camera.screenWidth) ? camera.screenWidth : 1920;
    const screenH = (camera && camera.screenHeight) ? camera.screenHeight : 1080;

    const halfW = screenW / (2 * zoom);
    const halfH = screenH / (2 * zoom);
    const safetyMargin = 140; // Margen para radios grandes y efectos de resplandor

    this.cullMinX = camX - halfW - safetyMargin;
    this.cullMaxX = camX + halfW + safetyMargin;
    this.cullMinY = camY - halfH - safetyMargin;
    this.cullMaxY = camY + halfH + safetyMargin;
  }

  /**
   * Envía un polígono al pipeline.
   * Ejecuta Frustum Culling en CPU y empaqueta la instancia en el buffer lineal.
   */
  submit(sides, x, y, radius, angle, r, g, b, alpha = 1.0) {
    this.stats.submitted++;

    // 1. CPU Frustum Culling (AABB circular de 4 comparaciones escalares rápidas)
    if (
      x + radius < this.cullMinX ||
      x - radius > this.cullMaxX ||
      y + radius < this.cullMinY ||
      y - radius > this.cullMaxY
    ) {
      this.stats.culled++;
      return; // Descartado de inmediato del pipeline visual
    }

    if (this.instanceCount >= this.maxInstances) {
      return;
    }

    // 2. Empaquetar datos de la instancia
    const off = this.instanceCount * this.INSTANCE_STRIDE;
    this.instanceData[off] = x;
    this.instanceData[off + 1] = y;
    this.instanceData[off + 2] = Math.cos(angle);
    this.instanceData[off + 3] = Math.sin(angle);
    this.instanceData[off + 4] = radius;
    this.instanceData[off + 5] = r;
    this.instanceData[off + 6] = g;
    this.instanceData[off + 7] = b;
    this.instanceData[off + 8] = alpha;
    this.instanceData[off + 9] = sides;

    // 3. Registrar índice en el bucket correspondiente
    const targetSides = this.buckets.has(sides) ? sides : 12;
    const bucket = this.buckets.get(targetSides);
    bucket.indices[bucket.count++] = this.instanceCount;

    this.instanceCount++;
    this.stats.rendered++;
  }

  /**
   * Despacha y dibuja todos los lotes de geometría agrupados.
   * @param {CanvasRenderingContext2D} ctx Contexto Canvas 2D
   */
  flush(ctx) {
    if (this.instanceCount === 0) return;

    ctx.save();
    ctx.shadowBlur = 0; // Desactivar sombras de canvas durante el batching masivo para máximo framerate

    // Renderizar agrupado por tipo de polígono (Mesh Batching)
    for (const [sides, bucket] of this.buckets.entries()) {
      if (bucket.count === 0) continue;

      const mesh = this.getMeshBySides(sides);
      const vertCount = mesh.sides;
      const unitVerts = mesh.vertices;
      const bucketCount = bucket.count;

      for (let i = 0; i < bucketCount; i++) {
        const instIndex = bucket.indices[i];
        const off = instIndex * this.INSTANCE_STRIDE;

        const posX = this.instanceData[off];
        const posY = this.instanceData[off + 1];
        const cosA = this.instanceData[off + 2];
        const sinA = this.instanceData[off + 3];
        const rad = this.instanceData[off + 4];
        const r = this.instanceData[off + 5] | 0;
        const g = this.instanceData[off + 6] | 0;
        const b = this.instanceData[off + 7] | 0;
        const a = this.instanceData[off + 8];

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a * 0.28})`;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
        ctx.lineWidth = 2.0;

        ctx.beginPath();
        for (let v = 0; v < vertCount; v++) {
          const ux = unitVerts[v * 2] * rad;
          const uy = unitVerts[v * 2 + 1] * rad;

          // Transformación afín local -> mundial inline
          const wx = posX + (ux * cosA - uy * sinA);
          const wy = posY + (ux * sinA + uy * cosA);

          if (v === 0) ctx.moveTo(wx, wy);
          else ctx.lineTo(wx, wy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        this.stats.drawCalls++;
      }
    }

    ctx.restore();
  }

  getMeshBySides(sides) {
    switch (sides) {
      case 3: return GeometryBank.TRIANGLE;
      case 4: return GeometryBank.DIAMOND;
      case 5: return GeometryBank.PENTAGON;
      case 6: return GeometryBank.HEXAGON;
      case 8: return GeometryBank.OCTAGON;
      default: return GeometryBank.CIRCLE_LOD_HIGH;
    }
  }
}

// Instancia singleton global
export const proceduralBatch = new ProceduralBatchRenderer(5000);


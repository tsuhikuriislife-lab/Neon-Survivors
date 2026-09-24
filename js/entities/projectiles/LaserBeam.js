import { state } from '../../engine/gameState.js';
import { audioManager } from '../../engine/AudioManager.js';
import { worldLayer } from '../../main.js';

const DIRECTION_EPSILON = 1e-8;
const CORNER_EPSILON = 1e-6;
const MIN_BEAM_WIDTH = 2;

/**
 * A fixed world-space laser path that reflects from arena walls and pulses damage over time.
 */
export class LaserBeam {
  /**
   * Captures a reflected path at launch, so neither its origin nor direction follows the player.
   * @param {number} startX - World-space X coordinate where the beam was fired.
   * @param {number} startY - World-space Y coordinate where the beam was fired.
   * @param {number} angle - Initial direction in radians.
   * @param {number} damage - Damage applied per pulse before piercing falloff.
   * @param {number} width - Visual and collision width of the path.
   * @param {number} life - Lifetime in fixed simulation frames.
   * @param {object} options - Bounce, pulse, corrosion, and owning-weapon settings.
   */
  constructor(startX, startY, angle, damage, width, life, options = {}) {
    this.startX = startX;
    this.startY = startY;
    this.angle = angle;
    this.damage = damage;
    this.width = width;
    this.life = life;
    this.maxLife = life;

    this.bounceCount = Math.max(0, Math.floor(options.bounceCount || 0));
    this.damageInterval = Math.max(1, Math.floor(options.damageInterval || 30));
    this.dotDamage = options.dotDamage || 0;
    this.dotDuration = options.dotDuration || 0;
    this.isSubLaser = Boolean(options.isSubLaser);
    this.owner = options.owner || null;

    this.colorStr = '#ffff00';
    this.colorHex = 0xffff00;
    this.tickTimer = 0;
    this.destroyed = false;

    this.pathSegments = this.traceReflectedPath(startX, startY, angle, this.bounceCount);
    this.totalLength = 0;
    for (let i = 0; i < this.pathSegments.length; i++) {
      this.totalLength += this.pathSegments[i].length;
    }

    // These reusable collections avoid creating collision buffers during every update.
    this.hitCandidates = [];
    this.candidateIndices = new Map();

    this.graphics = new PIXI.Graphics();
    worldLayer.addChild(this.graphics);
    this.drawPath();
  }

  /**
   * Traces straight segments between arena walls and reflects the direction at each allowed hit.
   * A simultaneous horizontal and vertical hit is treated as one corner bounce.
   * @param {number} startX - World-space X coordinate where the path begins.
   * @param {number} startY - World-space Y coordinate where the path begins.
   * @param {number} angle - Initial direction in radians.
   * @param {number} bounceCount - Maximum number of wall collisions that may be reflected.
   * @returns {Array<object>} Fixed line segments ending at the wall after the final bounce.
   */
  traceReflectedPath(startX, startY, angle, bounceCount) {
    const maxX = state.width || 1920;
    const maxY = state.height || 1920;
    const segments = [];
    let x = startX;
    let y = startY;
    let directionX = Math.cos(angle);
    let directionY = Math.sin(angle);
    let bouncesLeft = bounceCount;
    let safetyCounter = bounceCount + 2;

    while (safetyCounter-- > 0) {
      const distanceToXWall = directionX > DIRECTION_EPSILON
        ? (maxX - x) / directionX
        : directionX < -DIRECTION_EPSILON
          ? (0 - x) / directionX
          : Infinity;
      const distanceToYWall = directionY > DIRECTION_EPSILON
        ? (maxY - y) / directionY
        : directionY < -DIRECTION_EPSILON
          ? (0 - y) / directionY
          : Infinity;
      const wallDistance = Math.min(distanceToXWall, distanceToYWall);

      if (!Number.isFinite(wallDistance) || wallDistance < -CORNER_EPSILON) break;

      // The nearer wall defines this segment's dynamic range.
      const travelDistance = Math.max(0, wallDistance);
      const endX = x + directionX * travelDistance;
      const endY = y + directionY * travelDistance;

      if (travelDistance > CORNER_EPSILON) {
        segments.push({
          startX: x,
          startY: y,
          endX,
          endY,
          length: travelDistance
        });
      }

      const hitXWall = Math.abs(distanceToXWall - wallDistance) <= CORNER_EPSILON;
      const hitYWall = Math.abs(distanceToYWall - wallDistance) <= CORNER_EPSILON;
      if (bouncesLeft <= 0 || (!hitXWall && !hitYWall)) break;

      // At a corner both direction components reverse, while the collision spends one bounce.
      if (hitXWall) directionX = -directionX;
      if (hitYWall) directionY = -directionY;
      bouncesLeft--;
      x = endX;
      y = endY;
    }

    return segments;
  }

  /**
   * Builds both the colored glow and bright core once; later frames only change alpha.
   * @returns {void}
   */
  drawPath() {
    if (!this.graphics) return;

    this.graphics.clear();
    const glowWidth = Math.max(MIN_BEAM_WIDTH, this.width);
    const coreWidth = Math.max(MIN_BEAM_WIDTH, this.width * 0.4);

    this.graphics.lineStyle(glowWidth, this.colorHex, 0.55);
    for (let i = 0; i < this.pathSegments.length; i++) {
      const segment = this.pathSegments[i];
      this.graphics.moveTo(segment.startX, segment.startY);
      this.graphics.lineTo(segment.endX, segment.endY);
    }

    this.graphics.lineStyle(coreWidth, 0xffffff, 0.95);
    for (let i = 0; i < this.pathSegments.length; i++) {
      const segment = this.pathSegments[i];
      this.graphics.moveTo(segment.startX, segment.startY);
      this.graphics.lineTo(segment.endX, segment.endY);
    }
  }

  /**
   * Advances the beam lifetime and applies damage at its configured pulse rate.
   * @returns {boolean} Whether this beam remains active.
   */
  update() {
    if (this.destroyed) return false;

    this.life--;
    if (this.life <= 0) {
      this.destroy();
      return false;
    }

    if (this.tickTimer > 0) this.tickTimer--;
    if (this.tickTimer <= 0) {
      this.applyDamageTick();
      this.tickTimer = this.damageInterval;
    }

    // Fade only near expiration; the fixed path itself is never rebuilt or moved.
    if (this.graphics) {
      const fadeFrames = Math.min(15, this.maxLife);
      this.graphics.alpha = this.life < fadeFrames ? this.life / fadeFrames : 1;
    }

    this.emitPathParticle();
    return true;
  }

  /**
   * Finds unique targets intersecting any segment and damages them in path order.
   * @returns {void}
   */
  applyDamageTick() {
    this.hitCandidates.length = 0;
    this.candidateIndices.clear();

    let pathDistance = 0;
    for (let i = 0; i < this.pathSegments.length; i++) {
      const segment = this.pathSegments[i];
      if (state.spatialGrid) {
        state.spatialGrid.queryLine(
          segment.startX,
          segment.startY,
          segment.endX,
          segment.endY,
          this.width,
          (enemy) => {
            if (enemy.hp <= 0) return;
            const alongSegment = this.getDistanceAlongSegment(enemy.x, enemy.y, segment);
            this.addHitCandidate(enemy, pathDistance + alongSegment);
          }
        );
      } else {
        const enemies = state.enemies || [];
        for (let j = 0; j < enemies.length; j++) {
          const enemy = enemies[j];
          if (enemy.hp <= 0 || !this.isInsideSegment(enemy, segment)) continue;
          const alongSegment = this.getDistanceAlongSegment(enemy.x, enemy.y, segment);
          this.addHitCandidate(enemy, pathDistance + alongSegment);
        }
      }

      // Boss hitboxes are tested separately because they are not members of the enemy grid.
      const bosses = state.bosses || [];
      for (let j = 0; j < bosses.length; j++) {
        const boss = bosses[j];
        const targets = boss.getTargetables ? boss.getTargetables() : (boss.dead ? [] : [boss]);
        for (let k = 0; k < targets.length; k++) {
          const target = targets[k];
          if (!target || typeof target.takeDamage !== 'function') continue;
          if (target.dead || (target.hp !== undefined && target.hp <= 0)) continue;

          const alongSegment = this.getDistanceAlongSegment(target.x, target.y, segment);
          if (!this.isInsideSegment(target, segment)) continue;
          this.addHitCandidate(target, pathDistance + alongSegment);
        }
      }

      pathDistance += segment.length;
    }

    this.hitCandidates.sort((a, b) => a.distanceAlong - b.distanceAlong);

    let piercedTargets = 0;
    for (let i = 0; i < this.hitCandidates.length; i++) {
      const item = this.hitCandidates[i];
      if (item.owner.dead || (item.owner.hp !== undefined && item.owner.hp <= 0)) continue;

      // Each living hit region is struck once per pulse, even if a reflected path crosses it twice.
      const falloff = Math.max(0.1, 1.0 - piercedTargets * 0.05);
      const damage = this.damage * falloff;
      item.target.takeDamage(damage, this.colorStr);
      state.recordDamage('laserCannon', damage);
      if (this.dotDuration > 0) this.applyCorrosion(item, falloff);

      piercedTargets++;
      audioManager.playSound('hit_laser_cannon', { volume: 0.5, throttleMs: 180 });
    }
  }

  /**
   * Stores a hitbox once per pulse and keeps its earliest position along the reflected route.
   * @param {object} target - Enemy or boss targetable intersecting the beam.
   * @param {number} distanceAlongPath - Distance from the launch point to the intersection.
   * @returns {void}
   */
  addHitCandidate(target, distanceAlongPath) {
    if (!target || typeof target.takeDamage !== 'function') return;

    const owner = target.stableTargetKey ? (target.parent || target) : target;
    const hitRegion = target.stableTargetKey || target;
    if (owner.dead || (owner.hp !== undefined && owner.hp <= 0)) return;

    const existingIndex = this.candidateIndices.get(hitRegion);
    if (existingIndex !== undefined) {
      const existing = this.hitCandidates[existingIndex];
      if (distanceAlongPath < existing.distanceAlong) {
        existing.target = target;
        existing.owner = owner;
        existing.distanceAlong = distanceAlongPath;
      }
      return;
    }

    this.candidateIndices.set(hitRegion, this.hitCandidates.length);
    this.hitCandidates.push({ target, owner, hitRegion, distanceAlongPath });
  }

  /**
   * Projects a point onto one finite line segment and returns its distance from that segment's start.
   * @param {number} x - Target world-space X coordinate.
   * @param {number} y - Target world-space Y coordinate.
   * @param {object} segment - Beam segment containing start, end, and length coordinates.
   * @returns {number} Clamped distance along the segment.
   */
  getDistanceAlongSegment(x, y, segment) {
    const dx = segment.endX - segment.startX;
    const dy = segment.endY - segment.startY;
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq <= 0) return 0;

    // The clamped dot product gives the closest point on this finite segment.
    const projectedRatio = Math.max(0, Math.min(1,
      ((x - segment.startX) * dx + (y - segment.startY) * dy) / lengthSq
    ));
    return segment.length * projectedRatio;
  }

  /**
   * Checks whether a hitbox center lies within the beam's width plus its own radius.
   * @param {object} target - Entity or boss hitbox to test.
   * @param {object} segment - Beam segment used for the nearest-point projection.
   * @returns {boolean} Whether the segment intersects the target hitbox.
   */
  isInsideSegment(target, segment) {
    const dx = segment.endX - segment.startX;
    const dy = segment.endY - segment.startY;
    const lengthSq = dx * dx + dy * dy;
    const projectedRatio = lengthSq > 0
      ? Math.max(0, Math.min(1,
        ((target.x - segment.startX) * dx + (target.y - segment.startY) * dy) / lengthSq
      ))
      : 0;
    const nearestX = segment.startX + dx * projectedRatio;
    const nearestY = segment.startY + dy * projectedRatio;
    const offsetX = target.x - nearestX;
    const offsetY = target.y - nearestY;
    const hitRadius = this.width * 0.5 + (target.radius || 0);
    return offsetX * offsetX + offsetY * offsetY <= hitRadius * hitRadius;
  }

  /**
   * Applies corrosion to the stable entity or boss segment so temporary boss wrappers retain it.
   * @param {object} item - Target record containing target, owner, and stable hit region.
   * @param {number} falloff - Piercing damage multiplier for this target.
   * @returns {void}
   */
  applyCorrosion(item, falloff) {
    const effect = {
      damage: this.dotDamage * falloff,
      duration: this.dotDuration,
      timer: 60,
      color: this.colorStr
    };

    if (item.hitRegion !== item.owner) {
      // Boss target wrappers are recreated every frame, so corrosion is stored by segment identity.
      if (!item.owner.laserDotRegions) item.owner.laserDotRegions = new WeakMap();
      item.owner.laserDotRegions.set(item.hitRegion, effect);
    } else {
      item.owner.laserDot = effect;
    }
  }

  /**
   * Emits an occasional pooled particle along the stored route without allocating a new path.
   * @returns {void}
   */
  emitPathParticle() {
    if (!state.particlePool || this.totalLength <= 0 || Math.random() >= 0.2) return;

    let distance = Math.random() * this.totalLength;
    let segment = this.pathSegments[this.pathSegments.length - 1];
    for (let i = 0; i < this.pathSegments.length; i++) {
      if (distance <= this.pathSegments[i].length) {
        segment = this.pathSegments[i];
        break;
      }
      distance -= this.pathSegments[i].length;
    }

    const progress = segment.length > 0 ? distance / segment.length : 0;
    const particleX = segment.startX + (segment.endX - segment.startX) * progress;
    const particleY = segment.startY + (segment.endY - segment.startY) * progress;
    const direction = Math.atan2(segment.endY - segment.startY, segment.endX - segment.startX);
    const perpendicular = direction + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
    const particle = state.particlePool.acquire(
      particleX,
      particleY,
      this.colorStr,
      2 + Math.random() * 2,
      0.05,
      3
    );

    if (particle) {
      particle.vx = Math.cos(perpendicular) * (Math.random() * 4 + 1);
      particle.vy = Math.sin(perpendicular) * (Math.random() * 4 + 1);
    }
  }

  /**
   * Removes the beam graphics and releases its owning weapon reference.
   * @returns {void}
   */
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;

    if (this.graphics) {
      worldLayer.removeChild(this.graphics);
      this.graphics.destroy();
      this.graphics = null;
    }

    if (this.owner && this.owner.activeBeams) this.owner.activeBeams.delete(this);
    this.owner = null;
  }
}

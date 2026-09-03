// ============================================================================
// Camera.js - Dynamic 2D Camera Controller: Screenshake, Focus & Zoom Director
// ============================================================================

export const VIRTUAL_WIDTH = 1920;
export const VIRTUAL_HEIGHT = 1080;

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export class CameraController {
  constructor() {
    this.x = 960;
    this.y = 960;
    this.targetX = 960;
    this.targetY = 960;
    this.baseScale = 1.0;
    this.userZoom = 1.0;
    this.dpr = 1.0;
    this.screenWidth = VIRTUAL_WIDTH;
    this.screenHeight = VIRTUAL_HEIGHT;

    // 1. Screenshake System
    this.shakeTimer = 0;
    this.shakeDuration = 0;
    this.shakeStrength = 0;
    this.shakeRotation = 0;
    this.shakeScale = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
    this.currentShakeRot = 0;
    this.currentShakeScale = 1.0;

    // 2. Cinematic Focus System
    this.focusData = null; // { x, y, zoom, duration, fadeIn, fadeOut, timer, state, startX, startY }

    // 3. Dynamic Zoom System
    this.zoomData = null; // { targetZoom, duration, fadeIn, fadeOut, timer, state, currentZoom }
    this.currentZoomFactor = 1.0;

    // 4. Aim Offset System (e.g. Laser Cannon Peek)
    this.aimOffsetX = 0;
    this.aimOffsetY = 0;
    this.targetAimOffsetX = 0;
    this.targetAimOffsetY = 0;
  }

  // --------------------------------------------------------------------------
  // SCREENSHAKE FEATURE
  // --------------------------------------------------------------------------
  shake({ strength = 10, duration = 0.3, rotation = 0.05, scale = 0.03 } = {}) {
    let rotRad = rotation;
    if (Math.abs(rotation) > Math.PI) {
      rotRad = rotation * (Math.PI / 180);
    }

    this.shakeStrength = Math.max(this.shakeStrength, strength);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
    this.shakeTimer = this.shakeDuration;
    this.shakeRotation = Math.max(this.shakeRotation, rotRad);
    this.shakeScale = Math.max(this.shakeScale, scale);
  }

  // --------------------------------------------------------------------------
  // AIM OFFSET CONTROL (e.g. Laser Cannon Aiming Peek)
  // --------------------------------------------------------------------------
  setAimOffset(offsetX = 0, offsetY = 0) {
    this.targetAimOffsetX = offsetX;
    this.targetAimOffsetY = offsetY;
  }

  // --------------------------------------------------------------------------
  // DYNAMIC ZOOM CONTROL FEATURE
  // --------------------------------------------------------------------------
  setZoom(zoomAmount = 1.0, duration = 0, fadeInDuration = 0.3, fadeOutDuration = 0.3) {
    if (duration === 0 && fadeInDuration === 0) {
      this.currentZoomFactor = zoomAmount;
      this.zoomData = null;
      return;
    }

    this.zoomData = {
      targetZoom: zoomAmount,
      duration: duration,
      fadeIn: Math.max(0.01, fadeInDuration),
      fadeOut: Math.max(0.01, fadeOutDuration),
      timer: 0,
      state: 'fade_in',
      startZoom: this.currentZoomFactor
    };
  }

  // --------------------------------------------------------------------------
  // CINEMATIC FOCUS FEATURE (Focus on Coordinates / Objectives)
  // --------------------------------------------------------------------------
  focusOn({ x, y, zoom = 1.25, duration = 2.0, fadeInDuration = 0.5, fadeOutDuration = 0.5 } = {}) {
    this.focusData = {
      targetX: x,
      targetY: y,
      targetZoom: zoom,
      duration: duration,
      fadeIn: Math.max(0.01, fadeInDuration),
      fadeOut: Math.max(0.01, fadeOutDuration),
      timer: 0,
      state: 'fade_in',
      startX: this.x,
      startY: this.y,
      startZoom: this.currentZoomFactor
    };
  }

  cancelFocus() {
    this.focusData = null;
  }

  // --------------------------------------------------------------------------
  // UPDATE LOOP
  // --------------------------------------------------------------------------
  update(dt, player) {
    // A. Update Screenshake
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      const progress = Math.max(0, this.shakeTimer / this.shakeDuration);
      const damping = progress * progress; // Smooth quadratic ease-out decay

      this.shakeOffsetX = (Math.random() * 2 - 1) * this.shakeStrength * damping;
      this.shakeOffsetY = (Math.random() * 2 - 1) * this.shakeStrength * damping;
      this.currentShakeRot = (Math.random() * 2 - 1) * this.shakeRotation * damping;
      this.currentShakeScale = 1.0 + (Math.random() * 2 - 1) * this.shakeScale * damping;
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
      this.currentShakeRot = 0;
      this.currentShakeScale = 1.0;
      this.shakeStrength = 0;
      this.shakeDuration = 0;
      this.shakeRotation = 0;
      this.shakeScale = 0;
    }

    // B. Update Dynamic Zoom
    if (this.zoomData) {
      const z = this.zoomData;
      z.timer += dt;

      if (z.state === 'fade_in') {
        const p = Math.min(1, z.timer / z.fadeIn);
        const t = easeInOutQuad(p);
        this.currentZoomFactor = z.startZoom + (z.targetZoom - z.startZoom) * t;
        if (p >= 1) {
          z.timer = 0;
          z.state = z.duration > 0 ? 'hold' : 'done';
        }
      } else if (z.state === 'hold') {
        if (z.timer >= z.duration) {
          z.timer = 0;
          z.state = 'fade_out';
          z.holdZoom = this.currentZoomFactor;
        }
      } else if (z.state === 'fade_out') {
        const p = Math.min(1, z.timer / z.fadeOut);
        const t = easeInOutQuad(p);
        this.currentZoomFactor = z.holdZoom + (1.0 - z.holdZoom) * t;
        if (p >= 1) {
          this.currentZoomFactor = 1.0;
          this.zoomData = null;
        }
      }
    }

    // C. Update Smooth Aim Offset (e.g. Laser Cannon)
    const aimLerp = Math.min(1, dt * 8);
    this.aimOffsetX += (this.targetAimOffsetX - this.aimOffsetX) * aimLerp;
    this.aimOffsetY += (this.targetAimOffsetY - this.aimOffsetY) * aimLerp;

    // D. Update Camera Position & Cinematic Focus
    const playerX = player ? player.x : 960;
    const playerY = player ? player.y : 960;

    if (this.focusData) {
      const f = this.focusData;
      f.timer += dt;

      if (f.state === 'fade_in') {
        const p = Math.min(1, f.timer / f.fadeIn);
        const t = easeInOutQuad(p);
        this.targetX = f.startX + (f.targetX - f.startX) * t;
        this.targetY = f.startY + (f.targetY - f.startY) * t;
        this.currentZoomFactor = f.startZoom + (f.targetZoom - f.startZoom) * t;

        if (p >= 1) {
          f.timer = 0;
          f.state = f.duration > 0 ? 'hold' : 'fade_out';
        }
      } else if (f.state === 'hold') {
        this.targetX = f.targetX;
        this.targetY = f.targetY;
        this.currentZoomFactor = f.targetZoom;

        if (f.timer >= f.duration) {
          f.timer = 0;
          f.state = 'fade_out';
          f.fromX = this.targetX;
          f.fromY = this.targetY;
          f.fromZoom = this.currentZoomFactor;
        }
      } else if (f.state === 'fade_out') {
        const p = Math.min(1, f.timer / f.fadeOut);
        const t = easeInOutQuad(p);
        this.targetX = f.fromX + ((playerX + this.aimOffsetX) - f.fromX) * t;
        this.targetY = f.fromY + ((playerY + this.aimOffsetY) - f.fromY) * t;
        this.currentZoomFactor = f.fromZoom + (1.0 - f.fromZoom) * t;

        if (p >= 1) {
          this.focusData = null;
          this.targetX = playerX + this.aimOffsetX;
          this.targetY = playerY + this.aimOffsetY;
          this.currentZoomFactor = 1.0;
        }
      }

      // Smooth tracking towards target
      const lerpSpeed = Math.min(1, dt * 14);
      this.x += (this.targetX - this.x) * lerpSpeed;
      this.y += (this.targetY - this.y) * lerpSpeed;

    } else {
      // Normal smooth player tracking with aim offset
      this.targetX = playerX + this.aimOffsetX;
      this.targetY = playerY + this.aimOffsetY;
      const lerpSpeed = Math.min(1, dt * 10);
      this.x += (this.targetX - this.x) * lerpSpeed;
      this.y += (this.targetY - this.y) * lerpSpeed;
    }
  }

  // --------------------------------------------------------------------------
  // PIXI CONTAINER TRANSFORMATION (Fixed 1920x1080 Virtual Screen Space)
  // --------------------------------------------------------------------------
  applyToLayer(layer) {
    const zoom = (this.userZoom || 1) * this.currentShakeScale * this.currentZoomFactor;
    const sw = this.screenWidth || VIRTUAL_WIDTH;
    const sh = this.screenHeight || VIRTUAL_HEIGHT;

    // Equivalent to Canvas 2D: ctx.translate(-camX * zoom + sw/2, -camY * zoom + sh/2)
    // This ensures world point (camX, camY) always maps to screen center (sw/2, sh/2)
    layer.pivot.set(0, 0);
    layer.scale.set(zoom, zoom);
    layer.x = sw / 2 - this.x * zoom + this.shakeOffsetX;
    layer.y = sh / 2 - this.y * zoom + this.shakeOffsetY;
    layer.rotation = this.currentShakeRot || 0;
  }

  reset() {
    this.x = 960;
    this.y = 960;
    this.targetX = 960;
    this.targetY = 960;
    this.screenWidth = this.screenWidth || VIRTUAL_WIDTH;
    this.screenHeight = this.screenHeight || VIRTUAL_HEIGHT;
    this.baseScale = 1.0;
    this.dpr = 1.0;
    this.shakeTimer = 0;
    this.shakeDuration = 0;
    this.shakeStrength = 0;
    this.shakeRotation = 0;
    this.shakeScale = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
    this.currentShakeRot = 0;
    this.currentShakeScale = 1.0;
    this.focusData = null;
    this.zoomData = null;
    this.currentZoomFactor = 1.0;
    this.aimOffsetX = 0;
    this.aimOffsetY = 0;
    this.targetAimOffsetX = 0;
    this.targetAimOffsetY = 0;
  }
}

export const cameraController = new CameraController();

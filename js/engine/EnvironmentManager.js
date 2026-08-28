// ============================================================================
// EnvironmentManager.js - Dynamic Arena Visual Effects (Background, Lines, Borders)
// ============================================================================

function parseColor(str) {
  if (!str) return [0, 0, 0, 1];

  if (str.startsWith('#')) {
    let hex = str.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    const num = parseInt(hex, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255, 1];
  }

  const rgbaMatch = str.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i);
  if (rgbaMatch) {
    return [
      parseFloat(rgbaMatch[1]),
      parseFloat(rgbaMatch[2]),
      parseFloat(rgbaMatch[3]),
      rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1
    ];
  }

  return [0, 255, 255, 1];
}

function lerpColor(c1, c2, t) {
  const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
  const a = Math.max(0, Math.min(1, c1[3] + (c2[3] - c1[3]) * t));
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
}

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

class EnvironmentLayer {
  constructor(defaultProps) {
    this.defaultProps = { ...defaultProps };
    this.currentProps = { ...defaultProps };
    this.targetProps = null;
    this.startProps = null;
    this.state = 'idle'; // 'idle' | 'fade_in' | 'hold' | 'fade_out'
    this.timer = 0;
    this.duration = 0;
    this.fadeIn = 0.5;
    this.fadeOut = 0.5;
  }

  set(targetConfig = {}) {
    this.duration = targetConfig.duration !== undefined ? targetConfig.duration : 0;
    this.fadeIn = targetConfig.fadeInDuration !== undefined ? Math.max(0.001, targetConfig.fadeInDuration) : 0.4;
    this.fadeOut = targetConfig.fadeOutDuration !== undefined ? Math.max(0.001, targetConfig.fadeOutDuration) : 0.4;

    this.startProps = { ...this.currentProps };
    this.targetProps = { ...this.defaultProps, ...targetConfig };
    this.timer = 0;

    if (this.fadeIn <= 0.01) {
      this.currentProps = { ...this.targetProps };
      this.state = this.duration > 0 ? 'hold' : 'idle';
    } else {
      this.state = 'fade_in';
    }
  }

  update(dt, timeSec) {
    if (this.state === 'idle') return;

    this.timer += dt;

    if (this.state === 'fade_in') {
      const p = Math.min(1, this.timer / this.fadeIn);
      const t = easeInOutQuad(p);
      this.interpolate(this.startProps, this.targetProps, t);

      if (p >= 1) {
        this.timer = 0;
        this.state = this.duration > 0 ? 'hold' : 'idle';
      }
    } else if (this.state === 'hold') {
      if (this.timer >= this.duration) {
        this.timer = 0;
        this.state = 'fade_out';
        this.startProps = { ...this.currentProps };
      }
    } else if (this.state === 'fade_out') {
      const p = Math.min(1, this.timer / this.fadeOut);
      const t = easeInOutQuad(p);
      this.interpolate(this.startProps, this.defaultProps, t);

      if (p >= 1) {
        this.currentProps = { ...this.defaultProps };
        this.state = 'idle';
      }
    }
  }

  interpolate(from, to, t) {
    for (const key in to) {
      if (key.includes('Color')) {
        const cFrom = parseColor(from[key]);
        const cTo = parseColor(to[key]);
        this.currentProps[key] = lerpColor(cFrom, cTo, t);
      } else if (key === 'color') {
        const cFrom = parseColor(from.color);
        const cTo = parseColor(to.color);
        this.currentProps.color = lerpColor(cFrom, cTo, t);
      } else if (key === 'pulse') {
        const pRateFrom = from.pulse?.rate || 0;
        const pRateTo = to.pulse?.rate || 0;
        const pAmpFrom = from.pulse?.amplitude || 0;
        const pAmpTo = to.pulse?.amplitude || 0;
        this.currentProps.pulse = {
          rate: pRateFrom + (pRateTo - pRateFrom) * t,
          amplitude: pAmpFrom + (pAmpTo - pAmpFrom) * t
        };
      } else if (typeof to[key] === 'number') {
        this.currentProps[key] = from[key] + (to[key] - from[key]) * t;
      } else {
        this.currentProps[key] = to[key];
      }
    }
  }

  getComputedProps(timeSec) {
    const props = { ...this.currentProps };
    const pulse = props.pulse;
    let pulseFactor = 1.0;

    if (pulse && pulse.rate > 0 && pulse.amplitude > 0) {
      const sine = (Math.sin(timeSec * Math.PI * 2 * pulse.rate) + 1) / 2;
      pulseFactor = 1.0 + (sine * 2 - 1) * pulse.amplitude;
    }

    props.computedBrightness = (props.brightness || 1.0) * pulseFactor;
    return props;
  }

  reset() {
    this.currentProps = { ...this.defaultProps };
    this.state = 'idle';
    this.timer = 0;
  }
}

export class EnvironmentManager {
  constructor() {
    // 1. Arena Base Background
    this.background = new EnvironmentLayer({
      color: "#04030a",
      brightness: 1.0,
      pulse: { rate: 0, amplitude: 0 }
    });

    // 2. Arena Grid Lines
    this.gridLines = new EnvironmentLayer({
      color: "rgba(0, 255, 255, 0.04)",
      brightness: 1.0,
      pulse: { rate: 0, amplitude: 0 }
    });

    // 3. Arena Perimeter Borders & Corners
    this.borders = new EnvironmentLayer({
      color: "rgba(0, 255, 255, 0.35)",
      innerColor: "rgba(255, 255, 255, 0.7)",
      cornerColor: "#ff00ff",
      glow: 15,
      brightness: 1.0,
      pulse: { rate: 0, amplitude: 0 }
    });
  }

  setBackground(config = {}) {
    this.background.set(config);
  }

  setGridLines(config = {}) {
    this.gridLines.set(config);
  }

  setBorders(config = {}) {
    this.borders.set(config);
  }

  setTheme({ background, lines, borders, duration = 0, fadeInDuration = 0.5, fadeOutDuration = 0.5 } = {}) {
    if (background) {
      this.background.set({ ...background, duration, fadeInDuration, fadeOutDuration });
    }
    if (lines) {
      this.gridLines.set({ ...lines, duration, fadeInDuration, fadeOutDuration });
    }
    if (borders) {
      this.borders.set({ ...borders, duration, fadeInDuration, fadeOutDuration });
    }
  }

  update(dt, timeSec) {
    this.background.update(dt, timeSec);
    this.gridLines.update(dt, timeSec);
    this.borders.update(dt, timeSec);
  }

  reset() {
    this.background.reset();
    this.gridLines.reset();
    this.borders.reset();
  }
}

export const environment = new EnvironmentManager();


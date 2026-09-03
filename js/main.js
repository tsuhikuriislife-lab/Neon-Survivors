import { bitmapFont } from "./engine/BitmapFont.js";
import { state } from './engine/gameState.js';
import { initInput } from './engine/Input.js';
import { initUIListeners } from './ui/UIManager.js';
import { initGame, loop } from './engine/Game.js';
import { audioManager } from './engine/AudioManager.js';
import { initTextureCache } from './engine/TextureCache.js';

export const VIRTUAL_WIDTH = 1920;
export const VIRTUAL_HEIGHT = 1080;

export const app = new PIXI.Application({
  width: VIRTUAL_WIDTH,
  height: VIRTUAL_HEIGHT,
  backgroundColor: 0x04030a,
  antialias: true,
  autoDensity: true,
  resolution: window.devicePixelRatio || 1
});
document.getElementById("game-container").insertBefore(app.view, document.getElementById("game-container").firstChild);
const oldCanvas = document.getElementById("gameCanvas");
if (oldCanvas) oldCanvas.remove();

export const worldLayer = new PIXI.Container();
export const uiLayer = new PIXI.Container();
app.stage.addChild(worldLayer);
app.stage.addChild(uiLayer);

import { particlePool, projectilePool, gemPool, floatingTextPool } from './engine/Pool.js';
particlePool.initSprites(worldLayer);
projectilePool.initSprites(worldLayer);
gemPool.initSprites(worldLayer);
floatingTextPool.initSprites(worldLayer);

export function getViewportSize() {
  if (typeof window !== 'undefined' && window.visualViewport) {
    return {
      width: window.visualViewport.width,
      height: window.visualViewport.height
    };
  }
  const winW = typeof window !== 'undefined'
    ? (window.innerWidth || document.documentElement.clientWidth || (document.body ? document.body.clientWidth : 1920))
    : 1920;
  const winH = typeof window !== 'undefined'
    ? (window.innerHeight || document.documentElement.clientHeight || (document.body ? document.body.clientHeight : 1080))
    : 1080;
  return { width: winW, height: winH };
}

function checkOrientation() {
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const viewport = getViewportSize();
  const isPortrait = viewport.height > viewport.width;
  const overlay = document.getElementById("rotate-device-overlay");

  if (isTouch && isPortrait) {
    if (overlay) overlay.style.display = "flex";
    if (!state.portraitPaused && !state.isPaused) {
      state.portraitPaused = true;
      state.isPaused = true;
      audioManager.setMusicMuffled(true);
    }
  } else {
    if (overlay) overlay.style.display = "none";
    if (state.portraitPaused) {
      state.portraitPaused = false;
      state.isPaused = false;
      audioManager.setMusicMuffled(false);
    }
  }
}

export function resize() {
  const viewport = getViewportSize();
  const winW = Math.max(1, viewport.width);
  const winH = Math.max(1, viewport.height);

  // Resize PixiJS renderer to match the actual viewport (game-container fills full screen)
  app.renderer.resize(winW, winH);

  // Update camera with actual screen dimensions
  if (state.camera) {
    state.camera.screenWidth = winW;
    state.camera.screenHeight = winH;
    state.camera.baseScale = 1.0;
    state.camera.dpr = 1.0;
  }

  // Scale uiLayer (PixiJS UI elements like the Title) to match the fixed-height logic
  const baseScale = winH / 1080;
  uiLayer.scale.set(baseScale, baseScale);
  uiLayer.x = (winW - (1920 * baseScale)) / 2;
  uiLayer.y = (winH - (1080 * baseScale)) / 2;

  // UI scale relative to 1920x1080 reference
  const scale = Math.min(winW / 1920, winH / 1080);
  const container = document.getElementById("game-container");
  if (container) {
    container.style.setProperty('--ui-scale', scale.toString());
  }

  checkOrientation();
}

// Multi-stage event handler for Safari iOS viewport lifecycle
const handleResizeAndOrientation = () => {
  resize();
  setTimeout(resize, 100);
  setTimeout(resize, 200);
  setTimeout(resize, 350);
};

window.addEventListener("resize", handleResizeAndOrientation);
window.addEventListener("orientationchange", handleResizeAndOrientation);

if (typeof window !== 'undefined' && window.visualViewport) {
  window.visualViewport.addEventListener("resize", handleResizeAndOrientation);
  window.visualViewport.addEventListener("scroll", handleResizeAndOrientation);
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    handleResizeAndOrientation();
  }
});

// Initial resize pass
resize();



bitmapFont.load().then(() => {
  initTextureCache();
audioManager.init();

const startAudio = () => {
    audioManager.resumeAudioContext();
    if (screen.orientation && typeof screen.orientation.lock === 'function') {
      screen.orientation.lock('landscape').catch(() => {});
    }
    window.removeEventListener('click', startAudio);
    window.removeEventListener('keydown', startAudio);
    window.removeEventListener('touchstart', startAudio);
    window.removeEventListener('touchend', startAudio);
};
window.addEventListener('click', startAudio);
window.addEventListener('keydown', startAudio);
window.addEventListener('touchstart', startAudio, { passive: true });
window.addEventListener('touchend', startAudio, { passive: true });

initInput();
initUIListeners();

app.ticker.add(() => {
  loop(performance.now());
});
});

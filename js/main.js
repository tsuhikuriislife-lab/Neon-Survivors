import { bitmapFont } from "./engine/BitmapFont.js";
import { state } from './engine/gameState.js';
import { initInput } from './engine/Input.js';
import { initUIListeners } from './ui/UIManager.js';
import { initGame, loop } from './engine/Game.js';
import { audioManager } from './engine/AudioManager.js';
import { initTextureCache } from './engine/TextureCache.js';

export const VIRTUAL_WIDTH = 1920;
export const VIRTUAL_HEIGHT = 1080;

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

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
  const container = document.getElementById("game-container");
  const viewport = getViewportSize();
  const winW = Math.max(1, viewport.width);
  const winH = Math.max(1, viewport.height);
  const ar = winW / winH;

  // 1. Dynamic Virtual Resolution based on Viewport Aspect Ratio (No Letterboxing / Pillarboxing)
  let virtualWidth = 1920;
  let virtualHeight = 1080;

  if (ar >= 16 / 9) {
    virtualWidth = Math.round(1080 * ar);
    virtualHeight = 1080;
  } else {
    virtualWidth = 1920;
    virtualHeight = Math.round(1920 / ar);
  }

  // 2. Set Canvas Buffer Dimensions
  canvas.width = virtualWidth;
  canvas.height = virtualHeight;

  // 3. Scale Factor for UI
  const scale = Math.min(winW / 1920, winH / 1080);
  if (container) {
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.setProperty('--ui-scale', scale.toString());
  }

  // 4. Camera virtual viewport setup
  state.camera.screenWidth = virtualWidth;
  state.camera.screenHeight = virtualHeight;
  state.camera.baseScale = 1.0;
  state.camera.dpr = 1.0;

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

requestAnimationFrame((ts) => loop(ts, ctx));
});

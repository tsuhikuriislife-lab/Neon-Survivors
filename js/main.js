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
  const winW = viewport.width;
  const winH = viewport.height;

  // 1. Internal Canvas Buffer is strictly fixed at 1920x1080
  canvas.width = VIRTUAL_WIDTH;
  canvas.height = VIRTUAL_HEIGHT;

  // 2. Uniform Aspect Ratio (16:9) Letterboxing / Pillarboxing Scale
  const scale = Math.min(winW / VIRTUAL_WIDTH, winH / VIRTUAL_HEIGHT);
  const containerW = Math.round(VIRTUAL_WIDTH * scale);
  const containerH = Math.round(VIRTUAL_HEIGHT * scale);

  if (container) {
    container.style.width = `${containerW}px`;
    container.style.height = `${containerH}px`;
    container.style.setProperty('--ui-scale', scale.toString());
  }

  // 3. Camera virtual viewport setup
  state.camera.screenWidth = VIRTUAL_WIDTH;
  state.camera.screenHeight = VIRTUAL_HEIGHT;
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

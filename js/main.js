import { state } from './engine/gameState.js';
import { initInput } from './engine/Input.js';
import { initUIListeners } from './ui/UIManager.js';
import { initGame, loop } from './engine/Game.js';
import { audioManager } from './engine/AudioManager.js';

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function checkOrientation() {
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const isPortrait = window.innerHeight > window.innerWidth;
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

function resize() {
  const dpr = window.devicePixelRatio || 1;
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;

  canvas.width = screenW * dpr;
  canvas.height = screenH * dpr;
  canvas.style.width = `${screenW}px`;
  canvas.style.height = `${screenH}px`;

  state.camera.baseScale = Math.min(screenW / state.width, screenH / state.height);
  state.camera.screenWidth = screenW;
  state.camera.screenHeight = screenH;
  state.camera.dpr = dpr;

  checkOrientation();
}
window.addEventListener("resize", resize);
window.addEventListener("orientationchange", () => {
  setTimeout(resize, 100);
});
resize();

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

initGame();
requestAnimationFrame((ts) => loop(ts, ctx));


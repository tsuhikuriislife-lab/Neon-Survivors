import { state } from './engine/gameState.js';
import { initInput } from './engine/Input.js';
import { initUIListeners } from './ui/UIManager.js';
import { initGame, loop } from './engine/Game.js';
import { audioManager } from './engine/AudioManager.js';

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resize() {
  state.width = canvas.width = window.innerWidth;
  state.height = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

audioManager.init();
const startAudio = () => {
    audioManager.resumeAudioContext();
    window.removeEventListener('click', startAudio);
    window.removeEventListener('keydown', startAudio);
};
window.addEventListener('click', startAudio);
window.addEventListener('keydown', startAudio);

initInput();
initUIListeners();

initGame();
requestAnimationFrame((ts) => loop(ts, ctx));


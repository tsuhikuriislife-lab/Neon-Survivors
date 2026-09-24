import { state } from '../engine/gameState.js';
function getDynamicRarityRoll(finiteAvailable, isBoss = false) {
    let probs = isBoss ? {
        legendary: 0.10,
        rare: 0.30,
        uncommon: 0.60,
        common: 0.0
    } : {
        legendary: 0.05,
        rare: 0.15,
        uncommon: 0.20,
        common: 0.60
    };

    let activeRarities = Object.keys(probs).filter(r => 
        probs[r] > 0 && finiteAvailable.some(u => u.rarity === r)
    );

    if (activeRarities.length === 0) {
        // Fallback to infinite upgrades probabilities if no finite upgrades are left
        activeRarities = Object.keys(probs).filter(r => probs[r] > 0);
    } else {
        // Distribute probabilities of exhausted rarities equally among active ones
        const inactiveRarities = Object.keys(probs).filter(r => probs[r] > 0 && !activeRarities.includes(r));
        let leftoverProb = inactiveRarities.reduce((sum, r) => sum + probs[r], 0);
        
        if (leftoverProb > 0) {
            const addPerActive = leftoverProb / activeRarities.length;
            activeRarities.forEach(r => probs[r] += addPerActive);
        }
    }

    const roll = Math.random();
    let cumulative = 0;
    for (let rarity of activeRarities) {
        cumulative += probs[rarity];
        if (roll < cumulative) return rarity;
    }
    return activeRarities[activeRarities.length - 1]; // safety fallback
}

import { cancelAiming, resetInputState } from '../engine/Input.js';
import { formatTime, drawPolygon, enterFullscreen } from '../engine/Utils.js';
import { upgradeDatabase } from '../data/upgrades.js';
import { acquireUpgrade, canAcquireUpgrade, getUpgradeCount, getUpgradeMaxCount } from '../data/upgradeUtils.js';
import { initGame, resumeGame } from '../engine/Game.js';
import { SaveManager } from '../engine/SaveManager.js';
import { Enemy } from '../entities/enemies/Enemy.js';
import { audioManager } from '../engine/AudioManager.js';
import { triggerBossSpawnSequence, startWave } from '../systems/WaveManager.js';
import { getAllBosses } from '../data/bossRegistry.js';
import { getAllEnemies } from '../data/enemyRegistry.js';
import { spawnExplosion } from '../entities/effects/spawnExplosion.js';
import { TestingBoss } from "../entities/bosses/TestingBoss.js";


let DOM = null;
let adminToolsEnabled = false;
let endRunTimer = null;
let pendingRewardTimers = new Set();
let runActionGeneration = 0;
let autoUpgradePanelTimeout = null;
let autoUpgradePanelGeneration = 0;
const AUTO_UPGRADE_PANEL_DURATION_MS = 3000;
const AUTO_UPGRADE_PREFERENCE_KEY = "neon-survivors-auto-upgrade";

/** Cancela acciones UI diferidas para que no afecten una partida posterior. */
export function clearPendingUIActions() {
  runActionGeneration++;
  if (endRunTimer !== null) {
    clearTimeout(endRunTimer);
    endRunTimer = null;
  }
  for (const timer of pendingRewardTimers) clearTimeout(timer);
  pendingRewardTimers.clear();
}

/** Restablece elementos visuales que pertenecen a una sola partida. */
export function resetRunUI() {
  const runModalIds = [
    "levelModal", "bossRewardModal", "optionsModal", "adminModal",
    "adminSubModal", "acquiredUpgradesModal", "revivePromptModal", "gameOverModal"
  ];
  for (const id of runModalIds) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = "none";
  }

  clearAutoUpgradeSelectionPanel();

  const testingPanel = document.getElementById("testing-panel");
  if (testingPanel) testingPanel.style.display = "none";
  const testingToggle = document.getElementById("adminToggleTestingPanel");
  if (testingToggle) testingToggle.checked = false;
  for (const id of ["adminGodMode", "adminDisableSpawns", "adminDisableBossSpawns", "adminDisableEnemyCollisions"]) {
    const toggle = document.getElementById(id);
    if (toggle) toggle.checked = false;
  }
  const progress = document.getElementById("optionsBtnEndRunProgress");
  if (progress) {
    progress.style.transition = 'none';
    progress.style.width = '0%';
  }
}

export function initDOM() {
  if (DOM) return;
  DOM = {
    hudLevel: document.getElementById("hudLevel"),
    autoUpgradeSelection: document.getElementById("autoUpgradeSelection"),
    hudXpBar: document.getElementById("hudXpBar"),
    hudXpText: document.getElementById("hudXpText"),
    hudHpBar: document.getElementById("hudHpBar"),
    hudOverhealthBar: document.getElementById("hudOverhealthBar"),
    hudHpText: document.getElementById("hudHpText"),
    hudTime: document.getElementById("hudTime"),
    backgroundTimer: document.getElementById("background-timer"),
    hudKills: document.getElementById("hudKills"),
    hudShieldContainer: document.getElementById("hudShieldContainer"),
    hudShieldPips: document.getElementById("hudShieldPips"),
    hudShieldText: document.getElementById("hudShieldText"),
    bossContainer: document.getElementById("boss-hud-container"),
    activeSkillHud: document.getElementById("activeSkillHud"),
    hudActiveSkillEmoji: document.getElementById("hudActiveSkillEmoji"),
    hudActiveSkillCooldown: document.getElementById("hudActiveSkillCooldown"),
    hudActiveSkillKey: document.getElementById("hudActiveSkillKey"),
    testDamageElem: document.getElementById("testTotalDamage"),
    testDpsElem: document.getElementById("testTotalDPS"),
    weaponsContainer: document.getElementById("testWeaponStats"),
    testingPanel: document.getElementById("testing-panel")
  };
}

const _uiCache = {
  level: -1,
  xpPct: -1,
  xpTextStr: '',
  hpPct: -1,
  hpText: '',
  timeText: '',
  kills: -1,
  shieldVisible: null,
  shieldText: '',
  shieldColor: '',
  shieldPipsHtml: '',
  activeSkillVisible: null,
  activeSkillEmoji: '',
  activeSkillCooldownPct: -1,
  bossBarsSignature: '',
  testLastUpdateTime: 0,
  testSignature: ''
};

export function renderBossBars() {
  const d = DOM;
  const container = d.bossContainer;
  if (!container) return;

  const activeBosses = [];
  const addedBosses = new Set();
  for (let i = 0; i < state.bosses.length; i++) {
    const b = state.bosses[i];
    const targets = b.getTargetables();
    for (let j = 0; j < targets.length; j++) {
      const actualTarget = targets[j].parent || targets[j];
      if (!addedBosses.has(actualTarget)) {
        addedBosses.add(actualTarget);
        activeBosses.push(actualTarget);
      }
    }
  }

  if (activeBosses.length === 0) {
    if (_uiCache.bossBarsSignature !== 'empty') {
      _uiCache.bossBarsSignature = 'empty';
      container.innerHTML = "";
    }
    return;
  }

  activeBosses.sort((a, b) => b.hp - a.hp);

  // Firma ligera para dirty-checking instantaneo sin mutaciones DOM innecesarias
  let signature = "";
  for (let i = 0; i < activeBosses.length; i++) {
    const boss = activeBosses[i];
    signature += `${boss.name}_${Math.ceil(boss.hp)}_${Math.ceil(boss.maxHp)}|`;
  }

  if (_uiCache.bossBarsSignature === signature) return;
  _uiCache.bossBarsSignature = signature;

  let html = "";
  for (let idx = 0; idx < activeBosses.length; idx++) {
    const boss = activeBosses[idx];
    const isMain = (idx === 0);
    const wrapperClass = isMain ? "boss-bar-wrapper boss-bar-main" : "boss-bar-wrapper boss-bar-sub";
    const percent = Math.max(0, Math.min(100, (boss.hp / boss.maxHp) * 100));
    const color = boss.color || "#ff0055";

    html += `
      <div class="${wrapperClass}">
        <div class="boss-bar-header" style="color: ${color};">
          <span>${boss.name}</span>
          <span>${Math.ceil(boss.hp)} / ${Math.ceil(boss.maxHp)}</span>
        </div>
        <div class="boss-bar-track">
          <div class="boss-bar-fill" style="width: ${percent}%; background: ${color}; box-shadow: 0 0 10px ${color};"></div>
        </div>
      </div>
    `;
  }
  container.innerHTML = html;
}

/**
 * Offers three upgrades, applying one immediately when automatic selection is enabled.
 * @returns {void}
 */
export function showUpgradeMenu() {
  const choices = getLevelUpChoices();
  if (state.autoUpgradeEnabled && choices.length > 0) {
    const selectedIndex = Math.floor(Math.random() * choices.length);
    if (applyLevelUpUpgrade(choices[selectedIndex])) {
      renderAutoUpgradeSelection(choices, selectedIndex);
      audioManager.playSound('level_up', { volume: 0.8, throttleMs: 500, randomPitch: false });
      return;
    }
  }

  state.isPaused = true;
  cancelAiming();
  const modal = document.getElementById("levelModal");
  const container = document.getElementById("cardsContainer");
  const btnReroll = document.getElementById("btnReroll");
  const remainingRerolls = (state.player ? state.player.baseRerolls : 0) - (state.rerollsUsed || 0);
  if (btnReroll) {
    if (remainingRerolls > 0) {
      btnReroll.innerText = `🎲 REROLL AVAILABLE (${remainingRerolls})`;
      btnReroll.classList.remove("disabled");
      btnReroll.disabled = false;
      btnReroll.style.display = "block";
    } else {
      btnReroll.style.display = "none";
    }
  }

  container.innerHTML = "";
  choices.forEach(upg => {
    const card = document.createElement("div");
    card.className = "card rarity-" + (upg.rarity || 'common');
    const currentCount = getUpgradeCount(upg, state.player);
    card.innerHTML = `
      <div class="card-icon">${upg.icon}</div>
      <div class="card-name">${upg.name}</div>
      <div class="card-desc">${upg.desc}</div>
      <div class="upgrade-count">Current: ${currentCount}${getUpgradeMaxCount(upg) !== null ? `/${getUpgradeMaxCount(upg)}` : ''}</div>
    `;
    card.onclick = () => {
      if (!applyLevelUpUpgrade(upg)) return;
      modal.style.display = "none";
      audioManager.setMusicMuffled(false);
      state.isPaused = false;
    };
    container.appendChild(card);
  });

  modal.style.display = "flex";
  audioManager.playSound('level_up', { volume: 0.8, throttleMs: 500, randomPitch: false });
  audioManager.setMusicMuffled(true);
}

/**
 * Selects the same three rarity-weighted candidates used by the manual level-up menu.
 * @returns {Array<object>} Upgrade definitions currently offered to the player.
 */
function getLevelUpChoices() {
  const available = upgradeDatabase.filter(upgrade => canAcquireUpgrade(upgrade, state.player));
  const choices = [];

  for (let i = 0; i < 3; i++) {
    const finiteAvailable = available.filter(upgrade => !upgrade.isInfinite && !choices.includes(upgrade));
    const rarity = getDynamicRarityRoll(finiteAvailable, false);
    let pool;

    if (finiteAvailable.length > 0) {
      pool = finiteAvailable.filter(upgrade => upgrade.rarity === rarity);
    } else {
      // Infinite upgrades stay out of the offer until all finite upgrades are exhausted.
      pool = available.filter(upgrade => upgrade.isInfinite && !choices.includes(upgrade) && upgrade.rarity === rarity);
      if (pool.length === 0) pool = available.filter(upgrade => upgrade.isInfinite && !choices.includes(upgrade));
    }

    if (pool.length > 0) choices.push(pool[Math.floor(Math.random() * pool.length)]);
  }

  return choices;
}

/**
 * Applies an upgrade and preserves the brief protection granted by normal level-ups.
 * @param {object} upgrade Upgrade definition to acquire.
 * @returns {boolean} True when the upgrade was successfully applied.
 */
function applyLevelUpUpgrade(upgrade) {
  if (!acquireUpgrade(upgrade, state.player)) return false;
  if (state.player && typeof state.player.grantUpgradeInvulnerability === 'function') {
    state.player.grantUpgradeInvulnerability();
  }
  return true;
}

/**
 * Shows the latest automatic pick in the center, with only rarity-colored skipped cards at its sides.
 * @param {Array<object>} choices The three offers shown for this level-up.
 * @param {number} selectedIndex Index of the automatically acquired offer.
 * @returns {void}
 */
function renderAutoUpgradeSelection(choices, selectedIndex) {
  clearAutoUpgradeSelectionPanel();
  initDOM();
  const panel = DOM.autoUpgradeSelection;
  if (!panel) return;

  let leftSkipped = null;
  let rightSkipped = null;
  for (let i = 0; i < choices.length; i++) {
    if (i === selectedIndex) continue;
    if (leftSkipped === null) leftSkipped = choices[i];
    else rightSkipped = choices[i];
  }

  /** Draws a blank rarity-colored placeholder without exposing the skipped upgrade itself. */
  const skippedCard = (upgrade) => upgrade
    ? `<div class="auto-upgrade-skipped rarity-${upgrade.rarity || 'common'}" aria-hidden="true"></div>`
    : '<div class="auto-upgrade-skipped is-empty" aria-hidden="true"></div>';
  const selected = choices[selectedIndex];
  panel.innerHTML = `
    ${skippedCard(leftSkipped)}
    <div class="auto-upgrade-selected rarity-${selected.rarity || 'common'}" role="img" aria-label="Selected upgrade: ${selected.name}" title="Selected: ${selected.name}">
      <div class="auto-upgrade-icon">${selected.icon}</div>
      <div class="auto-upgrade-name">${selected.name}</div>
    </div>
    ${skippedCard(rightSkipped)}
  `;
  panel.style.display = "flex";

  // A new level-up replaces the old message and starts a fresh three-second visibility window.
  const panelGeneration = autoUpgradePanelGeneration;
  autoUpgradePanelTimeout = setTimeout(() => {
    if (panelGeneration !== autoUpgradePanelGeneration) return;
    panel.replaceChildren();
    panel.style.display = "none";
    autoUpgradePanelTimeout = null;
  }, AUTO_UPGRADE_PANEL_DURATION_MS);
}

/**
 * Removes the previous automatic-selection message and invalidates its pending hide callback.
 * @returns {void}
 */
function clearAutoUpgradeSelectionPanel() {
  autoUpgradePanelGeneration++;
  if (autoUpgradePanelTimeout !== null) {
    clearTimeout(autoUpgradePanelTimeout);
    autoUpgradePanelTimeout = null;
  }

  const panel = DOM?.autoUpgradeSelection || document.getElementById("autoUpgradeSelection");
  if (!panel) return;
  panel.replaceChildren();
  panel.style.display = "none";
}

/**
 * Changes the saved automatic level-up preference and updates the accessible toggle state.
 * @param {boolean} enabled Whether future level-ups should be selected automatically.
 * @returns {void}
 */
function setAutoUpgradeMode(enabled) {
  state.autoUpgradeEnabled = Boolean(enabled);

  // Store the player's preference separately so run resets cannot turn the mode off.
  try {
    window.localStorage.setItem(AUTO_UPGRADE_PREFERENCE_KEY, String(state.autoUpgradeEnabled));
  } catch {
    // Keep the current in-memory setting when browser storage is unavailable.
  }

  const toggle = document.getElementById("autoUpgradeToggle");
  if (!toggle) return;

  const status = state.autoUpgradeEnabled ? "on" : "off";
  toggle.classList.toggle("is-active", state.autoUpgradeEnabled);
  toggle.setAttribute("aria-pressed", String(state.autoUpgradeEnabled));
  toggle.setAttribute("aria-label", `Automatic upgrade selection: ${status}`);
  toggle.title = `Automatic upgrade selection: ${status}`;
}

/**
 * Reads the saved automatic-upgrade preference, defaulting to off on first use.
 * @returns {boolean} Previously selected mode, or false when no preference is stored.
 */
function loadAutoUpgradePreference() {
  try {
    return window.localStorage.getItem(AUTO_UPGRADE_PREFERENCE_KEY) === "true";
  } catch {
    return false;
  }
}

function renderAcquiredUpgradeCards(container, context) {
  if (!container) return;
  container.replaceChildren();
  const acquired = state.player?.acquiredUpgrades || {};
  for (const [id, count] of Object.entries(acquired)) {
    if (count <= 0) continue;
    const definition = upgradeDatabase.find(upgrade => upgrade.id === id);
    if (!definition) continue;
    const card = document.createElement("div");
    card.className = `card acquired-upgrade-card rarity-${definition.rarity || 'common'} ${context}`;
    card.innerHTML = `<div class="card-icon">${definition.icon}</div><div class="card-name">${definition.name}</div><div class="card-desc">${definition.desc || ''}</div><div class="upgrade-count">Current: ${count}${getUpgradeMaxCount(definition) !== null ? `/${getUpgradeMaxCount(definition)}` : ''}</div>`;
    card.title = definition.name;
    container.appendChild(card);
  }
  if (container.childElementCount === 0) {
    const empty = document.createElement("div");
    empty.className = "upgrade-inventory-empty";
    empty.textContent = "No upgrades acquired yet.";
    container.appendChild(empty);
  }
}

/**
 * Abre el inventario modal y actualiza las cartas con las mejoras actuales.
 * @returns {void}
 */
function openAcquiredUpgradesModal() {
  const modal = document.getElementById("acquiredUpgradesModal");
  renderAcquiredUpgradeCards(document.getElementById("acquiredUpgradesCards"), "inventory-modal");
  if (modal) modal.style.display = "flex";
}

export function startGame() {
  SaveManager.clearSaveGame();
  const btnResumeGame = document.getElementById("btnResumeGame");
  if (btnResumeGame) {
    btnResumeGame.classList.add("disabled");
    btnResumeGame.onclick = null;
  }

  const startOverlay = document.getElementById("start-screen-overlay");
  const uiLayer = document.getElementById("ui-layer");
  if (startOverlay) startOverlay.style.display = "none";
  if (uiLayer) uiLayer.style.display = "block";
  
  audioManager.resumeAudioContext();
  audioManager.playSound('main_gun_fire', { volume: 0.7 });
  audioManager.playMusic('music_main');
  
  initGame();
}

export function returnToMainMenu() {
  clearPendingUIActions();
  resetRunUI();
  resetInputState();
  SaveManager.clearSaveGame();
  state.isInMenu = true;
  state.isPaused = false;
  state.isGameOver = false;
  state.reset();
  
  const gameOverModal = document.getElementById("gameOverModal");
  const levelModal = document.getElementById("levelModal");
  const bossRewardModal = document.getElementById("bossRewardModal");
  const optionsModal = document.getElementById("optionsModal");
  const adminModal = document.getElementById("adminModal");
  const adminSubModal = document.getElementById("adminSubModal");
  const acquiredUpgradesModal = document.getElementById("acquiredUpgradesModal");
  const uiLayer = document.getElementById("ui-layer");
  const startOverlay = document.getElementById("start-screen-overlay");
  const revivePromptModal = document.getElementById("revivePromptModal");
  
  if (gameOverModal) gameOverModal.style.display = "none";
  if (levelModal) levelModal.style.display = "none";
  if (revivePromptModal) revivePromptModal.style.display = "none";
  if (bossRewardModal) bossRewardModal.style.display = "none";
  if (optionsModal) optionsModal.style.display = "none";
  if (adminModal) adminModal.style.display = "none";
  if (adminSubModal) adminSubModal.style.display = "none";
  if (acquiredUpgradesModal) acquiredUpgradesModal.style.display = "none";
  
  if (uiLayer) uiLayer.style.display = "none";
  if (startOverlay) startOverlay.style.display = "flex";
  
  const backgroundTimer = document.getElementById("background-timer");
  if (backgroundTimer) backgroundTimer.style.display = "none";
  _uiCache.bgTimerVisible = undefined; // Force cache invalidation so it reappears on new game
  
  audioManager.setMusicMuffled(false);
  audioManager.playMusic('music_main');
}

export function initUIListeners() {
  initAdminConsole();

  const autoUpgradeToggle = document.getElementById("autoUpgradeToggle");
  if (autoUpgradeToggle) {
    setAutoUpgradeMode(loadAutoUpgradePreference());
    autoUpgradeToggle.onclick = (event) => {
      event.stopPropagation();
      setAutoUpgradeMode(!state.autoUpgradeEnabled);
    };
  }

  const btnStartGame = document.getElementById("btnStartGame");
  if (btnStartGame) {
    btnStartGame.onclick = () => {
      enterFullscreen();
      startGame();
    };
  }

  const btnResumeGame = document.getElementById("btnResumeGame");
  if (btnResumeGame) {
    // ALWAYS display it. Just visually darken if no save exists.
    if (SaveManager.hasSaveGame()) {
      btnResumeGame.classList.remove("disabled");
      btnResumeGame.onclick = () => {
        enterFullscreen();
        resumeGame();
      };
    } else {
      btnResumeGame.classList.add("disabled");
      btnResumeGame.onclick = null;
    }
  }

  const btnGameOverMenu = document.getElementById("btnGameOverMenu");
  if (btnGameOverMenu) {
    btnGameOverMenu.onclick = () => {
      returnToMainMenu();
    };
  }

  document.getElementById("btnReroll").onclick = () => {
    const totalRerolls = state.player ? state.player.baseRerolls : 0;
    if ((state.rerollsUsed || 0) < totalRerolls) {
      state.rerollsUsed = (state.rerollsUsed || 0) + 1;
      showUpgradeMenu();
    }
  };

  document.getElementById("btnRestart").onclick = () => {
    enterFullscreen();
    SaveManager.clearSaveGame();
    document.getElementById("gameOverModal").style.display = "none";
    document.getElementById("ui-layer").style.display = "block";
    audioManager.setMusicMuffled(false);
    initGame();
  };

  const btnRevive = document.getElementById("btnRevive");
  if (btnRevive) {
    btnRevive.onclick = () => {
      enterFullscreen();
      revivePlayer();
    };
  }

  const btnRevivePromptEnd = document.getElementById("btnRevivePromptEnd");
  if (btnRevivePromptEnd) {
    btnRevivePromptEnd.onclick = () => {
      showGameOverStats();
    };
  }

  // ACTIVE SKILL TOUCH / CLICK
  const activeSkillBtn = document.getElementById("activeSkillHud");
  if (activeSkillBtn) {
    const triggerSkill = (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (state.player && state.player.activeSkill && state.player.activeSkill.id) {
        if (!state.player.activeSkill.isActive && state.player.activeSkill.timer <= 0) {
          state.player.triggerActiveSkill();
        }
      }
    };
    activeSkillBtn.addEventListener('click', triggerSkill);
    activeSkillBtn.addEventListener('touchstart', triggerSkill, { passive: false });
  }

  // PAUSE / OPTIONS & ADMIN PANEL LOGIC
  const pauseBtn = document.getElementById("pause-btn") || document.getElementById("options-btn");
  const optionsModal = document.getElementById("optionsModal");
  const adminModal = document.getElementById("adminModal");
  const adminSubModal = document.getElementById("adminSubModal");
  const adminSubTitle = document.getElementById("adminSubModalTitle");
  const adminSubContent = document.getElementById("adminSubModalContent");

  // Volume Controls
  const bgmVol = document.getElementById("optionsBgmVolume");
  const sfxVol = document.getElementById("optionsSfxVolume");
  const bgmMute = document.getElementById("optionsBgmMute");
  const sfxMute = document.getElementById("optionsSfxMute");

  bgmVol.oninput = (e) => audioManager.setBgmVolume(parseFloat(e.target.value));
  sfxVol.oninput = (e) => audioManager.setSfxVolume(parseFloat(e.target.value));
  bgmMute.onchange = (e) => audioManager.setBgmMuted(e.target.checked);
  sfxMute.onchange = (e) => audioManager.setSfxMuted(e.target.checked);

  // Camera Zoom Control
  const cameraZoomSlider = document.getElementById("optionsCameraZoom");
  const cameraZoomValue = document.getElementById("optionsZoomValue");

  if (cameraZoomSlider) {
    cameraZoomSlider.oninput = (e) => {
      const val = parseFloat(e.target.value);
      if (state.camera) {
        state.camera.userZoom = val;
      }
      if (cameraZoomValue) {
        cameraZoomValue.innerText = `${val.toFixed(2)}x`;
      }
    };
  }

  const executeQuickTest = () => {
    // 1. Spawn Dummy Boss
    state.bosses.push(new TestingBoss());

    // 2. Max out all available capped upgrades
    let upgraded = true;
    let safetyCounter = 0;
    while (upgraded && safetyCounter < 50) {
      safetyCounter++;
      upgraded = false;
      upgradeDatabase.forEach(upg => {
        if (!upg.isInfinite && acquireUpgrade(upg, state.player)) upgraded = true;
      });
    }

    // 3. Apply infinite upgrades a few times for testing
    upgradeDatabase.forEach(upg => {
      if (upg.isInfinite) {
        for (let i = 0; i < 10; i++) {
          acquireUpgrade(upg, state.player, { force: true });
        }
      }
    });

    const panel = document.getElementById("testing-panel");
      if (panel) panel.style.display = "block";
      const panelCheck = document.getElementById("adminToggleTestingPanel");
      if (panelCheck) panelCheck.checked = true;
      state.showTestingPanel = true;
      state.showTestingPanel = true;

    updateHUD();
    audioManager.playSound('level_up', { volume: 0.8, throttleMs: 50 });
  };

  const quickTestBtn = document.getElementById("quick-test-btn");
  if (quickTestBtn) {
    quickTestBtn.onclick = () => {
      if (adminToolsEnabled) executeQuickTest();
    };
  }

  const inventoryButton = document.getElementById("levelUpInventoryButton");
  const inventoryModal = document.getElementById("acquiredUpgradesModal");
  const inventoryClose = document.getElementById("acquiredUpgradesClose");
  if (inventoryButton) inventoryButton.onclick = (event) => { event.stopPropagation(); openAcquiredUpgradesModal(); };
  if (inventoryClose) inventoryClose.onclick = () => { if (inventoryModal) inventoryModal.style.display = "none"; };
  if (inventoryModal) inventoryModal.onclick = (event) => { if (event.target === inventoryModal) inventoryModal.style.display = "none"; };

  const openPauseMenu = () => {
    if (state.isInMenu || state.isGameOver) return;
    const levelModal = document.getElementById("levelModal");
    const bossRewardModal = document.getElementById("bossRewardModal");
    const gameOverModal = document.getElementById("gameOverModal");
    const revivePromptModal = document.getElementById("revivePromptModal");
    if (levelModal && levelModal.style.display === "flex") return;
    if (bossRewardModal && bossRewardModal.style.display === "flex") return;
    if (gameOverModal && gameOverModal.style.display === "flex") return;
    if (revivePromptModal && revivePromptModal.style.display === "flex") return;

    state.isPaused = true;
    cancelAiming();
    resetInputState();
    optionsModal.style.display = "flex";
    renderAcquiredUpgradeCards(document.getElementById("pauseUpgradeCards"), "pause-panel");
    audioManager.setMusicMuffled(true);
    
    bgmVol.value = audioManager.bgmVolume;
    sfxVol.value = audioManager.sfxVolume;
    bgmMute.checked = audioManager.bgmMuted;
    sfxMute.checked = audioManager.sfxMuted;

    if (cameraZoomSlider && state.camera) {
      cameraZoomSlider.value = state.camera.userZoom || 1.0;
      if (cameraZoomValue) {
        cameraZoomValue.innerText = `${(state.camera.userZoom || 1.0).toFixed(2)}x`;
      }
    }
  };

  const closePauseMenu = () => {
    const acquiredModal = document.getElementById("acquiredUpgradesModal");
    if (acquiredModal && acquiredModal.style.display === "flex") { acquiredModal.style.display = "none"; return; }
    if (adminSubModal && adminSubModal.style.display === "flex") {
      adminSubModal.style.display = "none";
      return;
    }
    if (adminModal && adminModal.style.display === "flex") {
      adminModal.style.display = "none";
      optionsModal.style.display = "flex";
      return;
    }
    optionsModal.style.display = "none";
    audioManager.setMusicMuffled(false);
    resetInputState();
    state.isPaused = false;
  };

  const togglePauseMenu = () => {
    const isOptionsOpen = optionsModal && optionsModal.style.display === "flex";
    const isAdminOpen = adminModal && adminModal.style.display === "flex";
    const isAdminSubOpen = adminSubModal && adminSubModal.style.display === "flex";
    const isInventoryOpen = document.getElementById("acquiredUpgradesModal")?.style.display === "flex";
    if (isOptionsOpen || isAdminOpen || isAdminSubOpen || isInventoryOpen) {
      closePauseMenu();
    } else {
      openPauseMenu();
    }
  };

  if (pauseBtn) {
    pauseBtn.onclick = togglePauseMenu;
  }

  const optionsBtnResume = document.getElementById("optionsBtnResume");
  if (optionsBtnResume) {
    optionsBtnResume.onclick = closePauseMenu;
  }

  const optionsBtnFullscreen = document.getElementById("optionsBtnFullscreen");
  if (optionsBtnFullscreen) {
    optionsBtnFullscreen.onclick = () => {
      enterFullscreen();
    };
  }

  const endRunArea = document.getElementById("optionsBtnEndRunArea");
  if (endRunArea) {
    const bar = document.getElementById("optionsBtnEndRunProgress");

    const startEndRun = (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (endRunTimer) clearTimeout(endRunTimer);
      
      bar.style.transition = 'none';
      bar.style.width = '0%';
      void bar.offsetWidth; // Force reflow
      
      bar.style.transition = 'width 1.5s ease-out';
      bar.style.width = '100%';
      
      const playerAtConfirmationStart = state.player;
      endRunTimer = setTimeout(() => {
        endRunTimer = null;
        if (!playerAtConfirmationStart || state.player !== playerAtConfirmationStart || state.isInMenu) return;
        closePauseMenu();
        if (state.player && typeof state.player.die === 'function') {
           // Skip revive logic by forcing revivesUsed = max
           state.player.revivesUsed = 999;
           state.player.die();
        } else {
           triggerGameOver();
        }
      }, 1500);
    };

    const cancelEndRun = (e) => {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      if (endRunTimer) clearTimeout(endRunTimer);
      endRunTimer = null;
      bar.style.transition = 'width 0.2s ease';
      bar.style.width = '0%';
    };

    // Pointer capture mantiene la pulsación activa aunque el dedo se deslice fuera del control.
    endRunArea.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (endRunArea.setPointerCapture) endRunArea.setPointerCapture(e.pointerId);
      startEndRun(e);
    });
    endRunArea.addEventListener('pointerup', cancelEndRun);
    endRunArea.addEventListener('pointercancel', cancelEndRun);
    endRunArea.addEventListener('lostpointercapture', cancelEndRun);

    // El control de mantener pulsado también se puede usar con teclado.
    endRunArea.addEventListener('keydown', (e) => {
      if ((e.key !== ' ' && e.key !== 'Enter') || e.repeat) return;
      startEndRun(e);
    });
    endRunArea.addEventListener('keyup', (e) => {
      if (e.key === ' ' || e.key === 'Enter') cancelEndRun(e);
    });
    endRunArea.addEventListener('blur', () => cancelEndRun());
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" || e.key === "Esc") {
      e.preventDefault();
      togglePauseMenu();
    }
  });

  const optionsBtnDev = document.getElementById("optionsBtnDev");
  if (optionsBtnDev) {
    optionsBtnDev.onclick = () => {
      if (!adminToolsEnabled) return;
      optionsModal.style.display = "none";
      adminModal.style.display = "flex";
      
      // Sync checkboxes
      document.getElementById("adminGodMode").checked = state.godMode;
      document.getElementById("adminDisableSpawns").checked = state.disableSpawns;
      document.getElementById("adminDisableBossSpawns").checked = state.disableBossSpawns;
      const disableEnemyCollisionsElem = document.getElementById("adminDisableEnemyCollisions");
      if (disableEnemyCollisionsElem) {
        disableEnemyCollisionsElem.checked = state.disableEnemyCollisions;
      }
      const testPanelElem = document.getElementById("testing-panel");
      const testToggleElem = document.getElementById("adminToggleTestingPanel");
      if (testPanelElem && testToggleElem) {
        testToggleElem.checked = (testPanelElem.style.display !== 'none');
      }
    };
  }

  document.getElementById("adminBtnClose").onclick = () => {
    adminModal.style.display = "none"; 
    // Go back to options menu
    optionsModal.style.display = "flex";
  };

  document.getElementById("adminGodMode").onchange = (e) => state.godMode = e.target.checked;
  document.getElementById("adminDisableSpawns").onchange = (e) => state.disableSpawns = e.target.checked;
  document.getElementById("adminDisableBossSpawns").onchange = (e) => state.disableBossSpawns = e.target.checked;
  const adminDisableEnemyCollisions = document.getElementById("adminDisableEnemyCollisions");
  if (adminDisableEnemyCollisions) {
    adminDisableEnemyCollisions.onchange = (e) => state.disableEnemyCollisions = e.target.checked;
  }

  const adminToggleTestingPanel = document.getElementById("adminToggleTestingPanel");
  if (adminToggleTestingPanel) {
    adminToggleTestingPanel.onchange = (e) => {
      const panel = document.getElementById("testing-panel");
      if (panel) panel.style.display = e.target.checked ? "block" : "none";
      state.showTestingPanel = e.target.checked;
    };
  }

  const adminQuickTest = document.getElementById("adminQuickTest");
  if (adminQuickTest) {
    adminQuickTest.onclick = () => {
      executeQuickTest();
      adminModal.style.display = "none";
      optionsModal.style.display = "none";
      audioManager.setMusicMuffled(false);
      state.isPaused = false;
    };
  }

  const adminSpawnDummy = document.getElementById("adminSpawnDummy");
  if (adminSpawnDummy) {
    adminSpawnDummy.onclick = () => {
      state.bosses.push(new TestingBoss());
      const panel = document.getElementById("testing-panel");
      if (panel) panel.style.display = "block";
      const panelCheck = document.getElementById("adminToggleTestingPanel");
      if (panelCheck) panelCheck.checked = true;
      state.showTestingPanel = true;
      adminModal.style.display = "none";
      optionsModal.style.display = "none";
      audioManager.setMusicMuffled(false);
      state.isPaused = false;
    };
  }

  const adminTriggerWave = document.getElementById("adminTriggerWave");
  if (adminTriggerWave) {
    adminTriggerWave.onclick = () => {
      startWave(20);
      adminModal.style.display = "none";
      optionsModal.style.display = "none";
      audioManager.setMusicMuffled(false);
      state.isPaused = false;
    };
  }

  document.getElementById("adminKillAll").onclick = () => {
    state.enemies.forEach(e => e.takeDamage(e.maxHp * 999));
    state.bosses.forEach(b => {
      if (b.name === "Dummy Target" || b.constructor.name === "TestingBoss") {
        b.dead = true; // Remove immortal dummy
        if (b.sprite && b.sprite.parent) b.sprite.parent.removeChild(b.sprite);
      } else {
        b.takeDamage(b.maxHp * 999);
      }
    });
  };

  const openSubMenu = (title, items) => {
    adminSubTitle.innerText = title;
    adminSubContent.innerHTML = "";
    adminSubContent.className = "admin-sub-content"; // Reset
    adminSubContent.parentElement.classList.remove("wide-box");
    items.forEach(item => {
      const btn = document.createElement("button");
      btn.className = "admin-action-btn";
      btn.innerText = item.label;
      btn.onclick = item.action;
      adminSubContent.appendChild(btn);
    });
    adminSubModal.style.display = "flex";
  };

  document.getElementById("adminSubBtnClose").onclick = () => {
    adminSubModal.style.display = "none";
  };

  document.getElementById("adminBtnSpawnBoss").onclick = () => {
    adminSubTitle.innerText = "SPAWN BOSS";
    adminSubContent.innerHTML = "";
    adminSubContent.className = "admin-sub-content admin-cards-grid";
    adminSubContent.parentElement.classList.add("wide-box");
    
    const bosses = getAllBosses();

    bosses.forEach(b => {
      const card = document.createElement("div");
      card.className = "card";
      
      const canvas = document.createElement("canvas");
      canvas.width = 100;
      canvas.height = 100;
      canvas.style.margin = "0 auto 10px auto";
      canvas.style.display = "block";
      const ctx = canvas.getContext("2d");
      if (typeof b.drawPreview === 'function') {
        b.drawPreview(ctx);
      }
      
      const title = document.createElement("div");
      title.className = "card-name";
      title.innerText = b.name;
      
      card.appendChild(canvas);
      card.appendChild(title);
      
      card.onclick = () => {
        triggerBossSpawnSequence(b.id);
        adminSubModal.style.display = "none";
        adminModal.style.display = "none";
        optionsModal.style.display = "none";
        audioManager.setMusicMuffled(false);
        state.isPaused = false;
      };
      adminSubContent.appendChild(card);
    });
    
    adminSubModal.style.display = "flex";
  };

  document.getElementById("adminBtnSpawnEnemy").onclick = () => {
    adminSubTitle.innerText = "SPAWN ENEMY";
    adminSubContent.innerHTML = "";
    adminSubContent.className = "admin-sub-content admin-cards-grid";
    adminSubContent.parentElement.classList.add("wide-box");
    
    const enemies = getAllEnemies();

    enemies.forEach(e => {
      const card = document.createElement("div");
      card.className = "card";
      
      const canvas = document.createElement("canvas");
      canvas.width = 100;
      canvas.height = 100;
      canvas.style.margin = "0 auto 10px auto";
      canvas.style.display = "block";
      const ctx = canvas.getContext("2d");
      if (typeof e.drawPreview === 'function') {
        e.drawPreview(ctx);
      }
      
      const title = document.createElement("div");
      title.className = "card-name";
      title.innerText = e.name;

      card.appendChild(canvas);
      card.appendChild(title);

      if (e.category) {
        const desc = document.createElement("div");
        desc.className = "card-desc";
        desc.innerText = e.category;
        desc.style.fontSize = "11px";
        desc.style.color = "#718096";
        card.appendChild(desc);
      }
      
      card.onclick = () => {
        const px = state.player ? state.player.x : state.width / 2;
        const py = state.player ? state.player.y : state.height / 2;
        const angle = Math.random() * Math.PI * 2;
        const spawnDist = 250 + Math.random() * 80;
        const sx = Math.max(60, Math.min(state.width - 60, px + Math.cos(angle) * spawnDist));
        const sy = Math.max(60, Math.min(state.height - 60, py + Math.sin(angle) * spawnDist));
        
        const enemyInst = e.instantiate(sx, sy);
        state.enemies.push(enemyInst);

        adminSubModal.style.display = "none";
        adminModal.style.display = "none";
        optionsModal.style.display = "none";
        audioManager.setMusicMuffled(false);
        state.isPaused = false;
      };
      adminSubContent.appendChild(card);
    });

    adminSubModal.style.display = "flex";
  };

  document.getElementById("adminBtnUpgrades").onclick = () => {
    adminSubTitle.innerText = "RECEIVE UPGRADE";
    adminSubContent.innerHTML = "";
    adminSubContent.className = "admin-sub-content admin-cards-grid";
    adminSubContent.parentElement.classList.add("wide-box");
    
    upgradeDatabase.forEach(upg => {
      const card = document.createElement("div");
      card.className = "card rarity-" + (upg.rarity || 'common');
      const currentCount = getUpgradeCount(upg, state.player);
      card.innerHTML = `
        <div class="card-icon">${upg.icon}</div>
        <div class="card-name">${upg.name}</div>
        <div class="card-desc">${upg.desc}</div>
        <div class="upgrade-count">Current: ${currentCount}${getUpgradeMaxCount(upg) !== null ? `/${getUpgradeMaxCount(upg)}` : ''}</div>
      `;
      if (!canAcquireUpgrade(upg, state.player)) {
        card.style.opacity = "0.5";
        card.style.pointerEvents = "none";
      } else {
        card.onclick = () => {
          if (!acquireUpgrade(upg, state.player)) return;
          updateHUD();
          // Redraw the upgrades menu so newly unavailable upgrades are grayed out
          document.getElementById("adminBtnUpgrades").onclick();
        };
      }
      adminSubContent.appendChild(card);
    });

    const resetCard = document.createElement("div");
    resetCard.className = "card";
    resetCard.innerHTML = `
      <div class="card-icon">❌</div>
      <div class="card-name">RESET UPGRADES</div>
      <div class="card-desc">Removes all weapons and resets base stats.</div>
    `;
    resetCard.onclick = () => {
      state.player.resetUpgrades();
      updateHUD();
      document.getElementById("adminBtnUpgrades").onclick();
    };
    adminSubContent.appendChild(resetCard);

    adminSubModal.style.display = "flex";
  };

  // Global sound listeners for UI (filtrado para evitar traversals innecesarios en movimiento de mouse)
  document.body.addEventListener('mousedown', (e) => {
    const target = e.target;
    if (!target) return;
    if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.closest('.card, .hud-btn, #options-btn, #pause-btn, .pause-btn, #btnRevive, #btnReroll')) {
      audioManager.playSound('ui_click', { volume: 0.8, throttleMs: 50 });
    }
  });

  document.body.addEventListener('mouseover', (e) => {
    const target = e.target;
    if (!target || target.tagName === 'BODY' || target.tagName === 'CANVAS') return;
    const btn = target.closest('.card, button, .hud-btn, #options-btn, #pause-btn, .pause-btn, #btnRevive, #btnReroll');
    if (btn && !btn._hasHoverSound) {
      btn._hasHoverSound = true;
      audioManager.playSound('ui_hover', { volume: 0.5, throttleMs: 50 });
      btn.addEventListener('mouseleave', () => btn._hasHoverSound = false, { once: true });
    }
  });
}

export function triggerGameOver() {
  clearPendingUIActions();
  SaveManager.clearSaveGame();
  const btnResumeGame = document.getElementById("btnResumeGame");
  if (btnResumeGame) {
    btnResumeGame.classList.add("disabled");
    btnResumeGame.onclick = null;
  }
  
  state.isGameOver = true;
  state.isPaused = true;
  cancelAiming();
  audioManager.setMusicMuffled(true);

  if (state.player && state.player.revivesUsed < state.player.extraRevives) {
    const remaining = state.player.extraRevives - state.player.revivesUsed;
    const btnRevive = document.getElementById("btnRevive");
    if (btnRevive) {
      btnRevive.innerText = `❤ REVIVE (${remaining} LEFT)`;
      btnRevive.disabled = false;
    }
    document.getElementById("revivePromptModal").style.display = "flex";
  } else {
    showGameOverStats();
  }
}

export function showGameOverStats() {
  clearPendingUIActions();
  state.clearLightningEffects();
  document.getElementById("revivePromptModal").style.display = "none";
  
  document.getElementById("finalTime").innerText = formatTime(state.gameTime);
  document.getElementById("finalKills").innerText = state.killCount;
  
  const bossesKilled = state.bossesKilled || 0;
  const bossesChips = bossesKilled * 50;
  const killsChips = Math.floor(state.killCount / 50);
  const levelsChips = state.player ? state.player.level * 2 : 0;
  const collectedChips = state.droppedChips || 0;

  const baseChips = bossesChips + killsChips + levelsChips + collectedChips;
  
  // Economy Node 1.2: endgameChipBonus
  let multiplier = 1.0;
  if (state.player && state.player.endgameChipBonus) {
    multiplier += state.player.endgameChipBonus;
  }
  
  let totalEarned = Math.floor(baseChips * multiplier);

  // Update UI
  document.getElementById("finalBosses").innerText = bossesKilled;
  document.getElementById("finalBossesChips").innerText = bossesChips;
  
  document.getElementById("finalKillsChips").innerText = killsChips;
  
  document.getElementById("finalLevels").innerText = state.player ? state.player.level : 1;
  document.getElementById("finalLevelsChips").innerText = levelsChips;
  
  document.getElementById("finalCollectedChips").innerText = collectedChips;
  
  document.getElementById("finalMultiplier").innerText = `x${multiplier.toFixed(2)}`;
  
  const previouslyEarned = state.chipsAwardedThisRun || 0;
  const earnedChips = Math.max(0, totalEarned - previouslyEarned);
  
  document.getElementById("finalChips").innerText = totalEarned + (earnedChips > 0 ? "" : " (Already Saved)");
  
  if (earnedChips > 0) {
    const profile = SaveManager.loadProfile();
    profile.chips = (profile.chips || 0) + earnedChips;
    SaveManager.saveProfile(profile);
    state.chipsAwardedThisRun = totalEarned;
  }

  document.getElementById("gameOverModal").style.display = "flex";
}

export function revivePlayer() {
  if (!state.player) return;

  // 1. Marcar resurreccion unica por partida
  state.player.revivesUsed++;

  // 2. Restaurar 50% de la salud maxima
  state.player.hp = state.player.maxHp * 0.5;

  // 3. Otorgar 3.0s de inmunidad total con parpadeo
  state.player.invulnerabilityTimer = 3.0;

  // 4. Reiniciar la cadencia del laser; sus rayos se limpian unas lineas mas abajo
  cancelAiming();
  if (state.player.weapons && state.player.weapons.laserCannon) {
    // Existing map beams are destroyed below; restart cadence to avoid an immediate post-revive shot.
    state.player.weapons.laserCannon.timer = 0;
  }
  if (state.player.uiGraphics) {
    state.player.uiGraphics.clear();
  }

  // 5. Destruir y limpiar 100% de proyectiles enemigos en pantalla
  const destroyEntity = (e) => {
    if (!e) return;
    if (typeof e.destroy === 'function') {
      e.destroy();
    } else {
      if (e.sprite && e.sprite.destroy) {
        if (e.sprite.parent) e.sprite.parent.removeChild(e.sprite);
        e.sprite.destroy();
      }
      if (e.graphics && e.graphics.destroy) {
        if (e.graphics.parent) e.graphics.parent.removeChild(e.graphics);
        e.graphics.destroy();
      }
      if (e.container && e.container.destroy) {
        if (e.container.parent) e.container.parent.removeChild(e.container);
        e.container.destroy({ children: true });
      }
    }
  };

  if (state.enemyProjectiles) {
    state.enemyProjectiles.forEach(destroyEntity);
    state.enemyProjectiles = [];
  }
  if (state.acceleratingProjectiles) {
    state.acceleratingProjectiles.forEach(destroyEntity);
    state.acceleratingProjectiles = [];
  }
  if (state.fallingProjectiles) {
    state.fallingProjectiles.forEach(destroyEntity);
    state.fallingProjectiles = [];
  }
  if (state.projectilePool && typeof state.projectilePool.clearEnemyProjectiles === 'function') {
    state.projectilePool.clearEnemyProjectiles();
  }
  if (state.hazardAreas) {
    state.hazardAreas.forEach(destroyEntity);
    state.hazardAreas = [];
  }
  if (state.laserBeams) {
    state.laserBeams.forEach(destroyEntity);
    state.laserBeams = [];
  }

  // 6. Empuje repulsor a enemigos cercanos para espacio de maniobra
  if (state.spatialGrid) {
    state.spatialGrid.queryRadius(state.player.x, state.player.y, 260, (e) => {
      if (e.hp <= 0) return;
      const angle = Math.atan2(e.y - state.player.y, e.x - state.player.x);
      e.x += Math.cos(angle) * 140;
      e.y += Math.sin(angle) * 140;
    });
  }

  // 7. Efectos visuales y sonoros de resurrección
  spawnExplosion(state.player.x, state.player.y, "#00ffff", 35, 4.5);
  spawnExplosion(state.player.x, state.player.y, "#ffffff", 15, 3.0);
  if (state.camera && typeof state.camera.shake === 'function') {
    state.camera.shake({ strength: 12, duration: 0.35, rotation: 0.04, scale: 0.02 });
  }
  if (state.floatingTextPool) {
    state.floatingTextPool.acquire(state.player.x, state.player.y - 30, "REVIVED!", "#00ffcc", 20);
  }
  audioManager.playSound('level_up', { volume: 0.9, throttleMs: 50 });

  // 8. Ocultar modals y reanudar el juego
  const gameOverModal = document.getElementById("gameOverModal");
  if (gameOverModal) gameOverModal.style.display = "none";
  
  const revivePromptModal = document.getElementById("revivePromptModal");
  if (revivePromptModal) revivePromptModal.style.display = "none";
  
  const btnRevive = document.getElementById("btnRevive");
  if (btnRevive) btnRevive.disabled = false;

  resetInputState();
  state.isGameOver = false;
  state.isPaused = false;
  audioManager.setMusicMuffled(false);

  // 9. Actualizar HUD
  updateHUD();
}

function updateTestingPanelHUD() {
  const d = DOM;
  if (!d.testDamageElem || !d.testDpsElem || !d.weaponsContainer) return;

  let totalDamage = 0;
  for (let key in state.damageStats) {
    totalDamage += state.damageStats[key];
  }
  const totalDPS = state.gameTime > 0 ? (totalDamage / state.gameTime).toFixed(1) : "0.0";
  const roundedDmg = Math.round(totalDamage);

  const p = state.player;
  const w = p && p.weapons && p.weapons.laserCannon;

  // Firma ligera para dirty check
  let testSig = `${roundedDmg}_${totalDPS}`;
  for (let key in state.damageStats) {
    testSig += `_${Math.round(state.damageStats[key])}`;
  }
  
  if (w && w.level > 0) {
    const cooldownFrames = Math.max(
      1,
      Math.round((w.cooldown / (w.cooldownMult || 1.0)) * p.getEffectiveCooldownMult())
    );
    testSig += `_L_${Math.floor(w.timer / 6)}_${cooldownFrames}_${w.beamLife}_${w.getDamageIntervalFrames()}_${w.bounceCount}`;
  }

  if (_uiCache.testSignature === testSig) return;
  _uiCache.testSignature = testSig;

  d.testDamageElem.textContent = roundedDmg;
  d.testDpsElem.textContent = totalDPS;

  const weaponColors = {
    blaster: "#00ffff",
    orbitals: "#ff00ff",
    nova: "#ffffff",
    shockwave: "#00ffb4",
    missiles: "#ff4400",
    laserCannon: "#00ff66",
    shield: "#00aaff"
  };
  let weaponsHtml = "";
  for (let key in state.damageStats) {
    const dmg = state.damageStats[key];
    if (dmg > 0) {
      const dps = state.gameTime > 0 ? (dmg / state.gameTime).toFixed(1) : "0.0";
      const percent = totalDamage > 0 ? ((dmg / totalDamage) * 100).toFixed(1) : 0;
      const barColor = weaponColors[key] || "#00ffff";
      weaponsHtml += `
        <div style="margin-top: 8px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px;">
            <span style="text-transform: capitalize; color: ${barColor}">${key}</span>
            <span>${Math.round(dmg)} (${dps}/s)</span>
          </div>
          <div style="width: 100%; height: 5px; background: rgba(255,255,255,0.2); margin-top: 2px;">
            <div style="width: ${percent}%; height: 100%; background: ${barColor}; box-shadow: 0 0 5px ${barColor};"></div>
          </div>
        </div>
      `;
    }
  }

  if (w && w.level > 0) {
    const cooldownFrames = Math.max(
      1,
      Math.round((w.cooldown / (w.cooldownMult || 1.0)) * p.getEffectiveCooldownMult())
    );
    const cooldownProgress = Math.min(1, w.timer / cooldownFrames);
    const cooldownSeconds = (cooldownFrames / 60).toFixed(1);
    const beamSeconds = (w.beamLife / 60).toFixed(1);
    const intervalSeconds = (w.getDamageIntervalFrames() / 60).toFixed(2);
    const activeBeamCount = w.activeBeams ? w.activeBeams.size : 0;

    weaponsHtml += `
      <div style="margin-top: 12px; font-size: 10px; color: #ccc; background: rgba(0,0,0,0.6); padding: 8px; border-radius: 4px; border: 1px solid #444;">
        <div style="color: #00ff66; font-weight: bold; margin-bottom: 4px;">[LASER DEBUG]</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
          <div><b>Cooldown:</b> ${(w.timer / 60).toFixed(1)} / ${cooldownSeconds}s</div>
          <div><b>Ready:</b> ${(cooldownProgress * 100).toFixed(0)}%</div>
          <div><b>Beam duration:</b> ${beamSeconds}s</div>
          <div><b>Damage interval:</b> ${intervalSeconds}s</div>
          <div><b>Wall bounces:</b> ${w.bounceCount} / 5</div>
          <div><b>Active beams:</b> ${activeBeamCount}</div>
        </div>
      </div>
    `;
  }

  d.weaponsContainer.innerHTML = weaponsHtml;
}

let uiInterval = null;

export function startUILoop() {
  if (uiInterval) clearInterval(uiInterval);
  initDOM();
  // 15 Hz decoupled loop (approx 66ms)
  uiInterval = setInterval(() => {
    if (!state.player || state.isPaused || state.isGameOver || state.isInMenu) return;
    
    // 1. Bottom Stats HUD Timer (Total Game Time)
    const totalTime = Math.floor(state.gameTime || 0);
    const m = Math.floor(totalTime / 60);
    const s = Math.floor(totalTime % 60);
    const timeText = (m < 10 ? "0" + m : m) + ":" + (s < 10 ? "0" + s : s);
    if (_uiCache.timeText !== timeText) {
      _uiCache.timeText = timeText;
      if (DOM.hudTime) DOM.hudTime.textContent = timeText;
    }
    
    // 2. Boss Bars
    renderBossBars();
    
    // 3. Active Skill Cooldown
    updateActiveSkillHUD();
    
    // 4. Testing Panel
    if (state.showTestingPanel) {
      updateTestingPanelHUD();
    }

    // 5. General HUD (HP, XP, Level, Kills, Shield) - Handled gracefully via dirty checking
    triggerHUDUpdate();
  }, 66);
}

export function triggerHUDUpdate() {
  if (!state.player) return;
  initDOM();
  const d = DOM;
  const player = state.player;

  // 1. Level (Dirty checked)
  if (_uiCache.level !== player.level) {
    _uiCache.level = player.level;
    if (d.hudLevel) d.hudLevel.textContent = `LVL ${player.level}`;
  }

  // 2. XP Bar & Text (Dirty checked)
  const xpPct = Math.min(100, (player.xp / player.nextXp) * 100).toFixed(1);
  const xpTextStr = `${Math.floor(player.xp)} / ${player.nextXp}`;
  if (_uiCache.xpPct !== xpPct) {
    _uiCache.xpPct = xpPct;
    if (d.hudXpBar) d.hudXpBar.style.width = `${xpPct}%`;
  }
  if (_uiCache.xpTextStr !== xpTextStr) {
    _uiCache.xpTextStr = xpTextStr;
    if (d.hudXpText) d.hudXpText.textContent = xpTextStr;
  }

  // 3. HP Bar & Text (Dirty checked)
  const hpCeil = Math.ceil(player.hp);
  const hpPct = Math.max(0, (player.hp / player.maxHp) * 100).toFixed(1);
  if (_uiCache.hpPct !== hpPct || _uiCache.hpText !== hpCeil) {
    _uiCache.hpPct = hpPct;
    _uiCache.hpText = hpCeil;
    if (d.hudHpBar) d.hudHpBar.style.width = `${hpPct}%`;
    if (d.hudHpText) d.hudHpText.textContent = `${hpCeil} / ${player.maxHp}`;
  }

  // 3.1 Overhealth Bar (Dirty checked)
  const overhealthVisible = (player.overhealth > 0);
  if (_uiCache.overhealthVisible !== overhealthVisible) {
    _uiCache.overhealthVisible = overhealthVisible;
    if (d.hudOverhealthBar) d.hudOverhealthBar.style.display = overhealthVisible ? "block" : "none";
  }
  if (overhealthVisible) {
    const ohPct = Math.min(100, (player.overhealth / player.maxHp) * 100).toFixed(1);
    if (_uiCache.ohPct !== ohPct) {
      _uiCache.ohPct = ohPct;
      if (d.hudOverhealthBar) d.hudOverhealthBar.style.width = `${ohPct}%`;
    }
  }

  // 3.2 Background Timer (Dirty checked)
  if (d.backgroundTimer) {
    const isBossPhase = state.isBossPhase;
    if (_uiCache.bgTimerVisible !== isBossPhase) {
      _uiCache.bgTimerVisible = isBossPhase;
      d.backgroundTimer.style.display = isBossPhase ? "none" : "block";
    }

    if (!isBossPhase) {
      const phaseSecs = Math.max(0, Math.ceil(state.phaseTime)); // Countdown to Boss
      if (_uiCache.phaseSecs !== phaseSecs) {
        _uiCache.phaseSecs = phaseSecs;
        const mins = Math.floor(phaseSecs / 60).toString().padStart(2, '0');
        const secs = (phaseSecs % 60).toString().padStart(2, '0');
        d.backgroundTimer.textContent = `${mins}:${secs}`;
      }
      
      const borderColor = state.environment.borders.currentProps.color || "#ff0033";
      if (_uiCache.bgTimerColor !== borderColor) {
        _uiCache.bgTimerColor = borderColor;
        d.backgroundTimer.style.color = borderColor;
      }
    }
  }

  // 4. Kills (Dirty checked)
  if (_uiCache.kills !== state.killCount) {
    _uiCache.kills = state.killCount;
    if (d.hudKills) d.hudKills.textContent = `💀 ${state.killCount}`;
  }

  // 5. Shield (Dirty checked)
  const charges = player.shieldCharges || 0;
  const isShieldVisible = charges > 0;
  if (_uiCache.shieldVisible !== isShieldVisible) {
    _uiCache.shieldVisible = isShieldVisible;
    if (d.hudShieldContainer) {
      d.hudShieldContainer.style.display = isShieldVisible ? "flex" : "none";
    }
  }

  if (isShieldVisible) {
    let color = "#00aaff";
    if (charges === 2) color = "#70d6ff";
    if (charges >= 3) color = "#ffffff";

    if (_uiCache.shieldColor !== color) {
      _uiCache.shieldColor = color;
      if (d.hudShieldText) d.hudShieldText.style.color = color;
    }

    if (_uiCache.shieldText !== charges) {
      _uiCache.shieldText = charges;
      if (d.hudShieldText) d.hudShieldText.textContent = `SHIELD [${charges}]`;
      
      let pipsHtml = "";
      for (let i = 0; i < charges; i++) {
        pipsHtml += `<div class="shield-pip" style="background: ${color}; box-shadow: 0 0 8px ${color};"></div>`;
      }
      if (_uiCache.shieldPipsHtml !== pipsHtml) {
        _uiCache.shieldPipsHtml = pipsHtml;
        if (d.hudShieldPips) d.hudShieldPips.innerHTML = pipsHtml;
      }
    }
  }
}

export function updateHUD() {
  triggerHUDUpdate();
}

export function showBossRewardMenu(bossName) {
  state.isPaused = true;
  cancelAiming();
  audioManager.setMusicMuffled(true);

  if (!state.bossScaling) state.bossScaling = {};
  
  const allBosses = getAllBosses();
  allBosses.forEach(b => {
    if (!state.bossScaling[b.id]) state.bossScaling[b.id] = 1.0;
    
    if (b.id === bossName) {
      state.bossScaling[b.id] += 0.70;
    } else {
      state.bossScaling[b.id] += 0.25;
    }
  });

  const modal = document.getElementById("bossRewardModal");
  const container = document.getElementById("bossRewardCards");
  const instruction = document.getElementById("bossRewardInstruction");
  const particles = document.getElementById("particlesContainer");
  
  modal.style.display = "flex";
  container.innerHTML = "";
  particles.innerHTML = "";
  instruction.innerText = "Boss Reward: Choose a card";

  const available = upgradeDatabase.filter(u => canAcquireUpgrade(u, state.player));

  const choices = [];
  for (let i = 0; i < 5; i++) {
    const finiteAvailable = available.filter(u => !u.isInfinite && !choices.includes(u));
    const r = getDynamicRarityRoll(finiteAvailable, true); // true = isBoss
    
    let pool;
    if (finiteAvailable.length > 0) {
       pool = finiteAvailable.filter(u => u.rarity === r);
    } else {
       pool = available.filter(u => u.isInfinite && !choices.includes(u) && u.rarity === r);
       if (pool.length === 0) {
          pool = available.filter(u => u.isInfinite && !choices.includes(u));
       }
    }
    
    if (pool.length > 0) {
      choices.push(pool[Math.floor(Math.random() * pool.length)]);
    }
  }

  let isFirstPick = true;
  let picksLeft = Math.random() < 0.20 ? 2 : 1; 

  let cardsProcessed = 0;
  const cardsElements = [];

  choices.forEach((upg, index) => {
    const cardWrap = document.createElement("div");
    cardWrap.className = "card-container-3d rarity-" + (upg.rarity || 'common');
    
    const card3d = document.createElement("div");
    card3d.className = "card-3d";
    
    const cardFront = document.createElement("div");
    cardFront.className = "card-front";
    cardFront.innerHTML = `
      <div class="card-icon" style="font-size:36px; margin-bottom:12px; filter: drop-shadow(0 0 10px rgba(255,255,255,0.6));">${upg.icon}</div>
      <div class="card-name" style="font-size:17px; font-weight:700; margin-bottom:8px;">${upg.name}</div>
      <div class="card-desc" style="font-size:13px; line-height:1.4;">${upg.desc}</div>
    `;

    const cardBack = document.createElement("div");
    cardBack.className = "card-back";
    cardBack.innerHTML = `?`;

    card3d.appendChild(cardFront);
    card3d.appendChild(cardBack);
    cardWrap.appendChild(card3d);

    cardWrap.dataset.picked = "false";

    cardWrap.onclick = (e) => {
      e.stopPropagation(); 
      if (cardWrap.dataset.picked === "true" || picksLeft <= 0) return;
      
      const applyCard = (wrap, upgObj) => {
        wrap.dataset.picked = "true";
        wrap.querySelector('.card-3d').classList.add("flipped");
        acquireUpgrade(upgObj, state.player);
        cardsProcessed++;
      };

      if (isFirstPick) {
        isFirstPick = false;
        if (Math.random() < 0.05) {
          // JACKPOT!
          instruction.innerText = "JACKPOT! You obtained all cards. Click the background to exit.";
          audioManager.playSound('jackpot', { volume: 0.9, throttleMs: 50 });
          picksLeft = 0; // consumed all picks
          
          // Generate particles
          for (let p = 0; p < 80; p++) {
            const part = document.createElement("div");
            part.className = "confetti";
            part.style.left = Math.random() * 100 + "%";
            part.style.animationDuration = (Math.random() * 2 + 1.5) + "s";
            part.style.animationDelay = (Math.random() * 0.5) + "s";
            part.style.backgroundColor = ["#ffaa00", "#ff00ff", "#00ffff", "#39ff14"][Math.floor(Math.random()*4)];
            particles.appendChild(part);
          }

          // Apply all remaining unpicked cards
          const generation = runActionGeneration;
          cardsElements.forEach((wrap, i) => {
             if (wrap.dataset.picked === "false") {
               const timer = setTimeout(() => {
                 pendingRewardTimers.delete(timer);
                 if (generation !== runActionGeneration || !state.player || state.isInMenu || state.isGameOver) return;
                 applyCard(wrap, choices[i]);
               }, i * 150);
               pendingRewardTimers.add(timer);
             }
          });
          return;
        }
      }

      // Normal pick
      applyCard(cardWrap, upg);
      picksLeft--;
      audioManager.playSound('level_up', { volume: 0.8, throttleMs: 50 });

      if (picksLeft <= 0) {
        instruction.innerText = "Upgrades obtained. Click on the background to exit.";
      } else {
        instruction.innerText = `Lucky! You can choose ${picksLeft} more card(s).`;
      }
    };
    
    container.appendChild(cardWrap);
    cardsElements.push(cardWrap);
  });

  // Close logic
  modal.onclick = () => {
    if (picksLeft <= 0 || cardsProcessed === choices.length) {
      if (state.player && typeof state.player.grantUpgradeInvulnerability === 'function') {
        state.player.grantUpgradeInvulnerability();
      }
      modal.style.display = "none";
      particles.innerHTML = "";
      state.isPaused = false;
      audioManager.setMusicMuffled(false);
    }
  };
}

export function updateActiveSkillHUD() {
  if (!state.player) return;
  const d = DOM;
  const skill = state.player.activeSkill;
  const isVisible = !!(skill && skill.id);

  if (_uiCache.activeSkillVisible !== isVisible) {
    _uiCache.activeSkillVisible = isVisible;
    if (d.activeSkillHud) d.activeSkillHud.style.display = isVisible ? "flex" : "none";
  }

  if (!isVisible) return;

  if (_uiCache.activeSkillEmoji !== skill.emoji) {
    _uiCache.activeSkillEmoji = skill.emoji;
    if (d.hudActiveSkillEmoji) d.hudActiveSkillEmoji.textContent = skill.emoji;
  }

  const pct = skill.timer > 0 ? Math.min(100, Math.round((skill.timer / skill.cooldown) * 100)) : 0;
  if (_uiCache.activeSkillCooldownPct !== pct) {
    _uiCache.activeSkillCooldownPct = pct;
    if (d.hudActiveSkillCooldown) d.hudActiveSkillCooldown.style.height = `${pct}%`;
  }

  if (d.hudActiveSkillKey && _uiCache.activeSkillKeyVisible === undefined) {
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    d.hudActiveSkillKey.style.display = isTouch ? 'none' : 'block';
    _uiCache.activeSkillKeyVisible = !isTouch;
  }
}

// ==========================================
// ADMIN CONSOLE (j + k + l)
// ==========================================
export function initAdminConsole() {
  const modal = document.getElementById("adminConsoleModal");
  const closeBtn = document.getElementById("adminConsoleClose");
  const logDiv = document.getElementById("adminConsoleLog");
  const inputEl = document.getElementById("adminConsoleInput");
  const submitBtn = document.getElementById("adminConsoleSubmit");

  if (!modal) return;

  adminToolsEnabled = false;
  const adminButton = document.getElementById("optionsBtnDev");
  const adminToolsSection = document.getElementById("optionsAdminToolsSection");
  const quickTestButton = document.getElementById("quick-test-btn");
  if (adminButton) adminButton.style.display = "none";
  if (adminToolsSection) adminToolsSection.style.display = "none";
  if (quickTestButton) quickTestButton.style.display = "none";

  function printLog(msg, type = 'info') {
    const p = document.createElement("p");
    p.className = `console-${type}`;
    p.innerText = msg;
    logDiv.appendChild(p);
    logDiv.scrollTop = logDiv.scrollHeight;
  }

  window.toggleAdminConsole = () => {
    if (modal.style.display === "flex") {
      modal.style.display = "none";
      if (!state.isInMenu && !state.isGameOver) {
        state.isPaused = false;
        audioManager.setMusicMuffled(false);
      }
    } else {
      modal.style.display = "flex";
      state.isPaused = true;
      audioManager.setMusicMuffled(true);
      cancelAiming();
      resetInputState();
      inputEl.focus();
    }
  };

  closeBtn.onclick = () => window.toggleAdminConsole();

  const commandDocs = {
    '/setchips': { desc: "Modifica la cantidad de chips en tu perfil.", usage: "/setchips [cantidad]" },
    '/addchips': { desc: "Alias para /setchips.", usage: "/addchips [cantidad]" },
    '/addxp': { desc: "Añade experiencia al jugador actual.", usage: "/addxp [cantidad]" },
    '/sethp': { desc: "Modifica la vida actual y máxima del jugador.", usage: "/sethp [cantidad]" },
    '/setlevel': { desc: "Sube automáticamente al jugador hasta el nivel indicado.", usage: "/setlevel [nivel]" },
    '/admin': { desc: "Activa o desactiva los botones de administración y testeo.", usage: "/admin [on|off]" },
    '/help': { desc: "Muestra esta ayuda o la de un comando específico.", usage: "/help [comando (opcional)]" }
  };

  function processCommand(cmdLine) {
    const args = cmdLine.trim().split(/\s+/);
    if (args.length === 0 || args[0] === "") return;
    
    const cmd = args[0].toLowerCase();
    printLog(`> ${cmdLine}`, 'cmd');

    if (args[1] && args[1].toLowerCase() === 'help') {
      const doc = commandDocs[cmd];
      if (doc) return printLog(`${cmd} - Uso: ${doc.usage}`, "info");
    }

    if (cmd === '/admin') {
      const mode = args[1]?.toLowerCase();
      adminToolsEnabled = mode === 'off' ? false : mode === 'on' ? true : !adminToolsEnabled;
      if (adminButton) adminButton.style.display = adminToolsEnabled ? '' : 'none';
      if (adminToolsSection) adminToolsSection.style.display = adminToolsEnabled ? '' : 'none';
      if (quickTestButton) quickTestButton.style.display = adminToolsEnabled ? '' : 'none';
      if (!adminToolsEnabled) {
        const adminModal = document.getElementById("adminModal");
        if (adminModal) adminModal.style.display = "none";
      }
      printLog(`Admin tools ${adminToolsEnabled ? 'enabled' : 'disabled'}.`, "success");
      return;
    }

    if (cmd === '/setchips' || cmd === '/addchips') {
      const amount = parseInt(args[1]);
      if (isNaN(amount)) return printLog(`Uso: ${commandDocs['/setchips'].usage}`, "error");
      const profile = SaveManager.loadProfile();
      profile.chips = amount;
      SaveManager.saveProfile(profile);
      printLog(`Chips modificados a ${amount}`, "success");
    } 
    else if (cmd === '/addxp') {
      const amount = parseInt(args[1]);
      if (isNaN(amount)) return printLog(`Uso: ${commandDocs['/addxp'].usage}`, "error");
      if (state.player) {
        state.player.gainXP(amount);
        printLog(`Añadida ${amount} de experiencia`, "success");
      } else {
        printLog("Jugador no encontrado.", "error");
      }
    }
    else if (cmd === '/sethp') {
      const amount = parseInt(args[1]);
      if (isNaN(amount)) return printLog(`Uso: ${commandDocs['/sethp'].usage}`, "error");
      if (state.player) {
        state.player.maxHp = amount;
        state.player.hp = amount;
        printLog(`Vida cambiada a ${amount}`, "success");
      } else {
        printLog("Jugador no encontrado.", "error");
      }
    }
    else if (cmd === '/setlevel') {
      const targetLevel = parseInt(args[1]);
      if (isNaN(targetLevel) || targetLevel < 1) return printLog(`Uso: ${commandDocs['/setlevel'].usage}`, "error");
      if (state.player) {
        while (state.player.level < targetLevel) {
           state.player.gainXP(state.player.nextLevelXp - state.player.xp);
        }
        printLog(`Nivel cambiado a ${targetLevel}`, "success");
      } else {
        printLog("Jugador no encontrado.", "error");
      }
    }
    else if (cmd === '/help') {
      const targetCmd = args[1] ? (args[1].startsWith('/') ? args[1] : '/' + args[1]) : null;
      if (targetCmd && commandDocs[targetCmd]) {
        printLog(`${targetCmd} - Uso: ${commandDocs[targetCmd].usage}`, "info");
      } else {
        printLog("Comandos disponibles:", "info");
        for (const [key, doc] of Object.entries(commandDocs)) {
          printLog(`  ${key}: ${doc.desc}`, "info");
        }
      }
    }
    else {
      printLog(`Comando desconocido: ${cmd}`, "error");
    }
    updateHUD();
  }

  submitBtn.onclick = () => {
    processCommand(inputEl.value);
    inputEl.value = "";
  };

  inputEl.addEventListener("keydown", (e) => {
    e.stopPropagation(); // Evitar que el juego lea las teclas mientras se escribe
    if (e.key === "Enter") {
      processCommand(inputEl.value);
      inputEl.value = "";
    }
  });
}

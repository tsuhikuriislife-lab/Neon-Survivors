import { state } from '../engine/gameState.js';
import { cancelAiming, resetInputState } from '../engine/Input.js';
import { formatTime, drawPolygon } from '../engine/Utils.js';
import { upgradeDatabase } from '../data/upgrades.js';
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

export function initDOM() {
  if (DOM) return;
  DOM = {
    hudLevel: document.getElementById("hudLevel"),
    hudXpBar: document.getElementById("hudXpBar"),
    hudHpBar: document.getElementById("hudHpBar"),
    hudHpText: document.getElementById("hudHpText"),
    hudTime: document.getElementById("hudTime"),
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

export function showUpgradeMenu() {
  state.isPaused = true;
  cancelAiming();
  const modal = document.getElementById("levelModal");
  const container = document.getElementById("cardsContainer");
  const btnReroll = document.getElementById("btnReroll");

  btnReroll.disabled = state.hasRerolledCurrentLevel;
  btnReroll.innerText = state.hasRerolledCurrentLevel ? "🎲 REROLL EXHAUSTED" : "🎲 REROLL AVAILABLE (1)";

  container.innerHTML = "";

  const available = upgradeDatabase.filter(u => !u.isAvailable || u.isAvailable(state.player));

  const getRarityRoll = () => {
    const r = Math.random();
    if (r < 0.05) return 'legendary';
    if (r < 0.20) return 'rare';
    if (r < 0.40) return 'uncommon';
    return 'common';
  };

  const choices = [];
  for (let i = 0; i < 3; i++) {
    const r = getRarityRoll();
    let pool = available.filter(u => u.rarity === r && !choices.includes(u));
    if (pool.length === 0) {
      // Fallback si no hay mejoras de la rareza sorteada
      pool = available.filter(u => !choices.includes(u));
    }
    if (pool.length > 0) {
      const upg = pool[Math.floor(Math.random() * pool.length)];
      choices.push(upg);
    }
  }

  choices.forEach(upg => {
    const card = document.createElement("div");
    card.className = "card rarity-" + (upg.rarity || 'common');
    card.innerHTML = `
      <div class="card-icon">${upg.icon}</div>
      <div class="card-name">${upg.name}</div>
      <div class="card-desc">${upg.desc}</div>
    `;
    card.onclick = () => {
      upg.apply(state.player);
      state.player.acquiredUpgrades = state.player.acquiredUpgrades || {};
      state.player.acquiredUpgrades[upg.id] = (state.player.acquiredUpgrades[upg.id] || 0) + 1;
      if (state.player && typeof state.player.grantUpgradeInvulnerability === 'function') {
        state.player.grantUpgradeInvulnerability();
      }
      modal.style.display = "none"; 
      audioManager.setMusicMuffled(false);
      state.isPaused = false;
    };
    container.appendChild(card);
  });

  const currentPanel = document.getElementById("currentUpgradesPanel");
  if (currentPanel) {
    currentPanel.innerHTML = "";
    if (state.player.acquiredUpgrades && Object.keys(state.player.acquiredUpgrades).length > 0) {
      currentPanel.style.display = "flex";
      for (let id in state.player.acquiredUpgrades) {
        const count = state.player.acquiredUpgrades[id];
        const upgDef = upgradeDatabase.find(u => u.id === id);
        if (upgDef) {
          const iconDiv = document.createElement("div");
          iconDiv.className = "current-upgrade-icon";
          iconDiv.title = upgDef.name;
          iconDiv.innerHTML = `${upgDef.icon}<div class="badge">${count}</div>`;
          currentPanel.appendChild(iconDiv);
        }
      }
    } else {
      currentPanel.style.display = "none";
    }
  }

  modal.style.display = "flex";
  audioManager.playSound('level_up', { volume: 0.8, throttleMs: 500, randomPitch: false });
  audioManager.setMusicMuffled(true);
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
  const uiLayer = document.getElementById("ui-layer");
  const startOverlay = document.getElementById("start-screen-overlay");
  
  if (gameOverModal) gameOverModal.style.display = "none";
  if (levelModal) levelModal.style.display = "none";
  if (bossRewardModal) bossRewardModal.style.display = "none";
  if (optionsModal) optionsModal.style.display = "none";
  if (adminModal) adminModal.style.display = "none";
  if (adminSubModal) adminSubModal.style.display = "none";
  
  if (uiLayer) uiLayer.style.display = "none";
  if (startOverlay) startOverlay.style.display = "flex";
  
  audioManager.setMusicMuffled(false);
  audioManager.playMusic('music_main');
}

export function initUIListeners() {
  const btnStartGame = document.getElementById("btnStartGame");
  if (btnStartGame) {
    btnStartGame.onclick = () => {
      startGame();
    };
  }

  const btnResumeGame = document.getElementById("btnResumeGame");
  if (btnResumeGame) {
    // ALWAYS display it. Just visually darken if no save exists.
    if (SaveManager.hasSaveGame()) {
      btnResumeGame.classList.remove("disabled");
      btnResumeGame.onclick = () => {
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
    if (!state.hasRerolledCurrentLevel) {
      state.hasRerolledCurrentLevel = true;
      showUpgradeMenu();
    }
  };

  document.getElementById("btnRestart").onclick = () => {
    SaveManager.clearSaveGame();
    document.getElementById("gameOverModal").style.display = "none";
    document.getElementById("ui-layer").style.display = "block";
    audioManager.setMusicMuffled(false);
    initGame();
  };

  const btnRevive = document.getElementById("btnRevive");
  if (btnRevive) {
    btnRevive.onclick = () => {
      revivePlayer();
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
        if (upg.isAvailable && !upg.isInfinite && upg.isAvailable(state.player)) {
          upg.apply(state.player);
          state.player.acquiredUpgrades = state.player.acquiredUpgrades || {};
          state.player.acquiredUpgrades[upg.id] = (state.player.acquiredUpgrades[upg.id] || 0) + 1;
          upgraded = true;
        }
      });
    }

    // 3. Apply infinite upgrades a few times for testing
    upgradeDatabase.forEach(upg => {
      if (upg.isInfinite) {
        for (let i = 0; i < 10; i++) {
          upg.apply(state.player);
          state.player.acquiredUpgrades = state.player.acquiredUpgrades || {};
          state.player.acquiredUpgrades[upg.id] = (state.player.acquiredUpgrades[upg.id] || 0) + 1;
        }
      }
    });

    const panel = document.getElementById("testing-panel");
    if (panel) panel.style.display = "block";
    const panelCheck = document.getElementById("adminToggleTestingPanel");
    if (panelCheck) panelCheck.checked = true;

    updateHUD();
    audioManager.playSound('level_up', { volume: 0.8, throttleMs: 50 });
  };

  const quickTestBtn = document.getElementById("quick-test-btn");
  if (quickTestBtn) {
    quickTestBtn.onclick = () => {
      executeQuickTest();
    };
  }

  const openPauseMenu = () => {
    if (state.isInMenu || state.isGameOver) return;
    const levelModal = document.getElementById("levelModal");
    const bossRewardModal = document.getElementById("bossRewardModal");
    const gameOverModal = document.getElementById("gameOverModal");
    if (levelModal && levelModal.style.display === "flex") return;
    if (bossRewardModal && bossRewardModal.style.display === "flex") return;
    if (gameOverModal && gameOverModal.style.display === "flex") return;

    state.isPaused = true;
    cancelAiming();
    resetInputState();
    optionsModal.style.display = "flex";
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
    if (isOptionsOpen || isAdminOpen || isAdminSubOpen) {
      closePauseMenu();
    } else {
      openPauseMenu();
    }
  };

  if (pauseBtn) {
    pauseBtn.onclick = togglePauseMenu;
  }

  const optionsBtnClose = document.getElementById("optionsBtnClose");
  if (optionsBtnClose) {
    optionsBtnClose.onclick = closePauseMenu;
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
    state.enemies.forEach(e => e.takeDamage(e.hp));
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
      card.innerHTML = `
        <div class="card-icon">${upg.icon}</div>
        <div class="card-name">${upg.name}</div>
        <div class="card-desc">${upg.desc}</div>
      `;
      if (upg.isAvailable && !upg.isAvailable(state.player)) {
        card.style.opacity = "0.5";
        card.style.pointerEvents = "none";
      } else {
        card.onclick = () => {
          upg.apply(state.player);
          state.player.acquiredUpgrades = state.player.acquiredUpgrades || {};
          state.player.acquiredUpgrades[upg.id] = (state.player.acquiredUpgrades[upg.id] || 0) + 1;
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
  SaveManager.clearSaveGame();
  const btnResumeGame = document.getElementById("btnResumeGame");
  if (btnResumeGame) {
    btnResumeGame.classList.add("disabled");
    btnResumeGame.onclick = null;
  }
  
  state.isGameOver = true;
  state.isPaused = true;
  cancelAiming();
  document.getElementById("finalTime").innerText = formatTime(state.gameTime);
  document.getElementById("finalKills").innerText = state.killCount;

  const btnRevive = document.getElementById("btnRevive");
  if (btnRevive) {
    btnRevive.disabled = false;
    btnRevive.innerText = "❤ REVIVE (1 PER GAME)";
    if (state.player && !state.player.hasRevivedOnce) {
      btnRevive.style.display = "block";
    } else {
      btnRevive.style.display = "none";
    }
  }

  document.getElementById("gameOverModal").style.display = "flex";
  audioManager.setMusicMuffled(true);
}

export function revivePlayer() {
  if (!state.player) return;

  // 1. Marcar resurreccion unica por partida
  state.player.hasRevivedOnce = true;

  // 2. Restaurar 50% de la salud maxima
  state.player.hp = state.player.maxHp * 0.5;

  // 3. Otorgar 3.0s de inmunidad total con parpadeo
  state.player.invulnerabilityTimer = 3.0;

  // 4. Cancelar apuntado y recargas de armas activas
  cancelAiming();
  if (state.player.weapons && state.player.weapons.laserCannon) {
    const lc = state.player.weapons.laserCannon;
    lc.charging = false;
    lc.chargeTimer = 0;
    lc.fullyCharged = false;
    if (lc.soundNode) {
      try { lc.soundNode.stop(); lc.soundNode.disconnect(); } catch(e){}
      lc.soundNode = null;
    }
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

  // 8. Ocultar modal de Game Over y reanudar el juego
  const gameOverModal = document.getElementById("gameOverModal");
  if (gameOverModal) gameOverModal.style.display = "none";
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

  // Firma ligera para dirty check
  let testSig = `${roundedDmg}_${totalDPS}`;
  for (let key in state.damageStats) {
    testSig += `_${Math.round(state.damageStats[key])}`;
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
  d.weaponsContainer.innerHTML = weaponsHtml;
}

let uiInterval = null;

export function startUILoop() {
  if (uiInterval) clearInterval(uiInterval);
  initDOM();
  // 15 Hz decoupled loop (approx 66ms)
  uiInterval = setInterval(() => {
    if (!state.player || state.isPaused || state.isGameOver || state.isInMenu) return;
    
    // 1. Time (Continuous)
    const m = Math.floor(state.gameTime / 60);
    const s = Math.floor(state.gameTime % 60);
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
  const d = DOM;
  const player = state.player;

  // 1. Level (Dirty checked)
  if (_uiCache.level !== player.level) {
    _uiCache.level = player.level;
    if (d.hudLevel) d.hudLevel.textContent = `LVL ${player.level}`;
  }

  // 2. XP Bar (Dirty checked)
  const xpPct = Math.min(100, (player.xp / player.nextXp) * 100).toFixed(1);
  if (_uiCache.xpPct !== xpPct) {
    _uiCache.xpPct = xpPct;
    if (d.hudXpBar) d.hudXpBar.style.width = `${xpPct}%`;
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
  state.bossScaling[bossName] = (state.bossScaling[bossName] || 1.0) * 1.70;

  const modal = document.getElementById("bossRewardModal");
  const container = document.getElementById("bossRewardCards");
  const instruction = document.getElementById("bossRewardInstruction");
  const particles = document.getElementById("particlesContainer");
  
  modal.style.display = "flex";
  container.innerHTML = "";
  particles.innerHTML = "";
  instruction.innerText = "Boss Reward: Choose a card";

  const available = upgradeDatabase.filter(u => !u.isAvailable || u.isAvailable(state.player));

  const getRarityRoll = () => {
    const r = Math.random();
    if (r < 0.05) return 'legendary';
    if (r < 0.20) return 'rare';
    if (r < 0.40) return 'uncommon';
    return 'common';
  };

  const choices = [];
  for (let i = 0; i < 5; i++) {
    const r = getRarityRoll();
    let pool = available.filter(u => u.rarity === r && !choices.includes(u));
    if (pool.length === 0) pool = available.filter(u => !choices.includes(u));
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
        upgObj.apply(state.player);
        state.player.acquiredUpgrades = state.player.acquiredUpgrades || {};
        state.player.acquiredUpgrades[upgObj.id] = (state.player.acquiredUpgrades[upgObj.id] || 0) + 1;
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
          cardsElements.forEach((wrap, i) => {
             if (wrap.dataset.picked === "false") {
               setTimeout(() => { applyCard(wrap, choices[i]); }, i * 150);
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

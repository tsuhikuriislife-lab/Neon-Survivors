import { state } from '../engine/gameState.js';
import { cancelAiming } from '../engine/Input.js';
import { formatTime, drawPolygon } from '../engine/Utils.js';
import { upgradeDatabase } from '../data/upgrades.js';
import { initGame } from '../engine/Game.js';
import { Enemy } from '../entities/enemies/Enemy.js';
import { audioManager } from '../engine/AudioManager.js';
import { triggerBossSpawnSequence } from '../systems/WaveManager.js';
import { getAllBosses } from '../data/bossRegistry.js';
import { getAllEnemies } from '../data/enemyRegistry.js';
import { spawnExplosion } from '../entities/effects/spawnExplosion.js';


export function renderBossBars() {
  const container = document.getElementById("boss-hud-container");
  const activeBosses = [];

  const addedBosses = new Set();
  state.bosses.forEach(b => {
    b.getTargetables().forEach(t => {
      const actualTarget = t.parent || t;
      if (!addedBosses.has(actualTarget)) {
        addedBosses.add(actualTarget);
        activeBosses.push(actualTarget);
      }
    });
  });

  if (activeBosses.length === 0) {
    container.innerHTML = "";
    return;
  }

  activeBosses.sort((a, b) => b.hp - a.hp);

  let html = "";
  activeBosses.forEach((boss, idx) => {
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
  });
  container.innerHTML = html;
}

export function showUpgradeMenu() {
  state.isPaused = true;
  cancelAiming();
  const modal = document.getElementById("levelModal");
  const container = document.getElementById("cardsContainer");
  const btnReroll = document.getElementById("btnReroll");

  btnReroll.disabled = state.hasRerolledCurrentLevel;
  btnReroll.innerText = state.hasRerolledCurrentLevel ? "🎲 REROLL AGOTADO" : "🎲 REROLL DISPONIBLE (1)";

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
      modal.style.display = "none"; audioManager.setMusicMuffled(false);
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
  state.isInMenu = true;
  state.isPaused = false;
  state.isGameOver = false;
  
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

  if (pauseBtn) {
    pauseBtn.onclick = () => {
      state.isPaused = true;
      cancelAiming();
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
  }

  document.getElementById("optionsBtnClose").onclick = () => {
    optionsModal.style.display = "none";
    audioManager.setMusicMuffled(false);
    state.isPaused = false;
  };

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
    adminSubTitle.innerText = "SPAWN ENEMIGO";
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
    adminSubTitle.innerText = "RECIBIR MEJORA";
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
      <div class="card-name">RESTABLECER MEJORAS</div>
      <div class="card-desc">Elimina todas las armas y restablece estadísticas base.</div>
    `;
    resetCard.onclick = () => {
      state.player.resetUpgrades();
      updateHUD();
      document.getElementById("adminBtnUpgrades").onclick();
    };
    adminSubContent.appendChild(resetCard);

    adminSubModal.style.display = "flex";
  };

  // Global sound listeners for UI
  document.body.addEventListener('mousedown', (e) => {
    if (e.target.closest('.card') || e.target.closest('button') || e.target.closest('#options-btn') || e.target.closest('#pause-btn') || e.target.closest('.pause-btn') || e.target.closest('input[type="checkbox"]')) {
      audioManager.playSound('ui_click', { volume: 0.8, throttleMs: 50 });
    }
  });

  document.body.addEventListener('mouseover', (e) => {
    const target = e.target.closest('.card') || e.target.closest('button') || e.target.closest('#options-btn') || e.target.closest('#pause-btn') || e.target.closest('.pause-btn');
    if (target && !target._hasHoverSound) {
      target._hasHoverSound = true;
      audioManager.playSound('ui_hover', { volume: 0.5, throttleMs: 50 });
      target.addEventListener('mouseleave', () => target._hasHoverSound = false, {once:true});
    }
  });
}

export function triggerGameOver() {
  state.isGameOver = true;
  state.isPaused = true;
  cancelAiming();
  document.getElementById("finalTime").innerText = formatTime(state.gameTime);
  document.getElementById("finalKills").innerText = state.killCount;

  const btnRevive = document.getElementById("btnRevive");
  if (btnRevive) {
    btnRevive.disabled = false;
    btnRevive.innerText = "❤️ REVIVIR (1 POR PARTIDA)";
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

  // 1. Marcar resurrección única por partida
  state.player.hasRevivedOnce = true;

  // 2. Restaurar 50% de la salud máxima
  state.player.hp = state.player.maxHp * 0.5;

  // 3. Otorgar 3.0s de inmunidad total con parpadeo
  state.player.invulnerabilityTimer = 3.0;

  // 4. Limpiar proyectiles enemigos en pantalla
  state.enemyProjectiles = [];
  state.acceleratingProjectiles = [];
  state.fallingProjectiles = [];
  if (state.projectilePool) {
    state.projectilePool.pool.forEach(p => {
      if (p.active && p.isEnemy) {
        p.active = false;
      }
    });
  }

  // Efectos visuales y sonoros
  spawnExplosion(state.player.x, state.player.y, "#00ffff", 30, 4);
  if (state.floatingTextPool) {
    state.floatingTextPool.acquire(state.player.x, state.player.y - 30, "¡REVIVIDO!", "#00ffcc", 20);
  }
  audioManager.playSound('level_up', { volume: 0.9, throttleMs: 50 });

  // 5. Ocultar modal de Game Over y reanudar el juego
  const gameOverModal = document.getElementById("gameOverModal");
  if (gameOverModal) gameOverModal.style.display = "none";
  const btnRevive = document.getElementById("btnRevive");
  if (btnRevive) btnRevive.disabled = false;

  state.isGameOver = false;
  state.isPaused = false;
  audioManager.setMusicMuffled(false);

  // 6. Actualizar HUD
  updateHUD();
}

export function updateHUD() {
  if (!state.player) return;
  document.getElementById("hudLevel").innerText = `LVL ${state.player.level}`;
  document.getElementById("hudXpBar").style.width = `${Math.min(100, (state.player.xp / state.player.nextXp) * 100)}%`;
  document.getElementById("hudHpBar").style.width = `${Math.max(0, (state.player.hp / state.player.maxHp) * 100)}%`;
  document.getElementById("hudHpText").innerText = `${Math.ceil(state.player.hp)} / ${state.player.maxHp}`;
  document.getElementById("hudTime").innerText = formatTime(state.gameTime);
  document.getElementById("hudKills").innerText = state.killCount;
  renderBossBars();

  // Update Testing Panel (if present and active)
  const testDamageElem = document.getElementById("testTotalDamage");
  const testDpsElem = document.getElementById("testTotalDPS");
  const weaponsContainer = document.getElementById("testWeaponStats");
  const testingPanel = document.getElementById("testing-panel");

  if (testingPanel && testingPanel.style.display !== 'none' && testDamageElem && testDpsElem && weaponsContainer) {
    let totalDamage = 0;
    for (let key in state.damageStats) {
      totalDamage += state.damageStats[key];
    }
    let totalDPS = state.gameTime > 0 ? (totalDamage / state.gameTime).toFixed(1) : "0.0";
    
    testDamageElem.innerText = Math.round(totalDamage);
    testDpsElem.innerText = totalDPS;

    const weaponColors = {
      blaster: "#00ffff",
      orbitals: "#ff00ff",
      nova: "#ffffff",
      shockwave: "#00ffb4",
      missiles: "#ff4400"
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
    weaponsContainer.innerHTML = weaponsHtml;
  }
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
  instruction.innerText = "Recompensa de Jefe: Elige una carta";

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
          instruction.innerText = "¡JACKPOT! Has obtenido todas las cartas. Clickea en el fondo para salir.";
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
        instruction.innerText = "Mejoras obtenidas. Clickea en el fondo para salir.";
      } else {
        instruction.innerText = `¡Suerte! Puedes elegir ${picksLeft} carta(s) más.`;
      }
    };
    
    container.appendChild(cardWrap);
    cardsElements.push(cardWrap);
  });

  // Close logic
  modal.onclick = () => {
    if (picksLeft <= 0 || cardsProcessed === choices.length) {
      modal.style.display = "none";
      particles.innerHTML = "";
      state.isPaused = false;
      audioManager.setMusicMuffled(false);
    }
  };
}

export function updateActiveSkillHUD() {
  if (!state.player) return;
  const activeSkillHud = document.getElementById("activeSkillHud");
  const keyLabel = document.getElementById("hudActiveSkillKey");
  if (state.player.activeSkill && state.player.activeSkill.id) {
    activeSkillHud.style.display = "flex";
    document.getElementById("hudActiveSkillEmoji").innerText = state.player.activeSkill.emoji;
    const cdElement = document.getElementById("hudActiveSkillCooldown");
    if (state.player.activeSkill.timer > 0) {
      const pct = (state.player.activeSkill.timer / state.player.activeSkill.cooldown) * 100;
      cdElement.style.height = `${pct}%`;
    } else {
      cdElement.style.height = `0%`;
    }

    if (keyLabel) {
      const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      keyLabel.style.display = isTouch ? 'none' : 'block';
    }
  } else {
    activeSkillHud.style.display = "none";
  }
}

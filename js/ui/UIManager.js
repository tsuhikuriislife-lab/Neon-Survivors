import { state } from '../engine/gameState.js';
import { formatTime, drawPolygon } from '../engine/Utils.js';
import { upgradeDatabase } from '../data/upgrades.js';
import { initGame } from '../engine/Game.js';
import { Enemy } from '../entities/Enemy.js';
import { KyrenBoss, DevourerOfTaxBoss, AmalgamBossRoot } from '../entities/Bosses.js';

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
  const modal = document.getElementById("levelModal");
  const container = document.getElementById("cardsContainer");
  const btnReroll = document.getElementById("btnReroll");

  btnReroll.disabled = state.hasRerolledCurrentLevel;
  btnReroll.innerText = state.hasRerolledCurrentLevel ? "🎲 REROLL AGOTADO" : "🎲 REROLL DISPONIBLE (1)";

  container.innerHTML = "";

  const available = upgradeDatabase.filter(u => !u.isAvailable || u.isAvailable(state.player));
  const shuffled = [...available].sort(() => 0.5 - Math.random());
  const choices = shuffled.slice(0, 3);

  choices.forEach(upg => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-icon">${upg.icon}</div>
      <div class="card-name">${upg.name}</div>
      <div class="card-desc">${upg.desc}</div>
    `;
    card.onclick = () => {
      upg.apply(state.player);
      modal.style.display = "none";
      state.isPaused = false;
    };
    container.appendChild(card);
  });

  modal.style.display = "flex";
}

export function initUIListeners() {
  document.getElementById("btnReroll").onclick = () => {
    if (!state.hasRerolledCurrentLevel) {
      state.hasRerolledCurrentLevel = true;
      showUpgradeMenu();
    }
  };

  document.getElementById("btnRestart").onclick = () => {
    initGame();
    document.getElementById("gameOverModal").style.display = "none";
  };

  // ADMIN PANEL LOGIC
  const adminBtn = document.getElementById("admin-btn");
  const adminModal = document.getElementById("adminModal");
  const adminSubModal = document.getElementById("adminSubModal");
  const adminSubTitle = document.getElementById("adminSubModalTitle");
  const adminSubContent = document.getElementById("adminSubModalContent");

  adminBtn.onclick = () => {
    state.isPaused = true;
    adminModal.style.display = "flex";
    
    // Sync checkboxes
    document.getElementById("adminGodMode").checked = state.godMode;
    document.getElementById("adminDisableSpawns").checked = state.disableSpawns;
    document.getElementById("adminDisableBossSpawns").checked = state.disableBossSpawns;
  };

  document.getElementById("adminBtnClose").onclick = () => {
    adminModal.style.display = "none";
    state.isPaused = false;
  };

  document.getElementById("adminGodMode").onchange = (e) => state.godMode = e.target.checked;
  document.getElementById("adminDisableSpawns").onchange = (e) => state.disableSpawns = e.target.checked;
  document.getElementById("adminDisableBossSpawns").onchange = (e) => state.disableBossSpawns = e.target.checked;

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
    
    const bosses = [
      { name: "Kyren", action: () => state.bosses.push(new KyrenBoss()), draw: (ctx) => {
          drawPolygon(ctx, 50, 50, 30, 8, 0, "#00ffcc", 10, "rgba(0, 255, 204, 0.1)");
          drawPolygon(ctx, 50, 50, 15, 8, 0, "#ffffff", 5, "rgba(255, 255, 255, 0.2)");
      }},
      { name: "Devourer of Tax", action: () => state.bosses.push(new DevourerOfTaxBoss()), draw: (ctx) => {
          drawPolygon(ctx, 50, 50, 30, 3, -Math.PI/2, "#39ff14", 10, "rgba(57, 255, 20, 0.3)");
      }},
      { name: "Amalgam", action: () => {
          state.currentAmalgamBoss = new AmalgamBossRoot();
          state.bosses.push(state.currentAmalgamBoss);
      }, draw: (ctx) => {
          drawPolygon(ctx, 50, 50, 30, 10, 0, "#ff0033", 10, "rgba(255, 0, 51, 0.2)");
      }}
    ];

    bosses.forEach(b => {
      const card = document.createElement("div");
      card.className = "card";
      
      const canvas = document.createElement("canvas");
      canvas.width = 100;
      canvas.height = 100;
      canvas.style.margin = "0 auto 10px auto";
      canvas.style.display = "block";
      const ctx = canvas.getContext("2d");
      b.draw(ctx);
      
      const title = document.createElement("div");
      title.className = "card-name";
      title.innerText = b.name;
      
      card.appendChild(canvas);
      card.appendChild(title);
      
      card.onclick = () => {
        b.action();
      };
      adminSubContent.appendChild(card);
    });
    
    adminSubModal.style.display = "flex";
  };

  document.getElementById("adminBtnSpawnEnemy").onclick = () => {
    openSubMenu("SPAWN ENEMIGO", [
      { label: "Pequeño", action: () => state.enemies.push(new Enemy('small')) },
      { label: "Mediano", action: () => state.enemies.push(new Enemy('medium')) },
      { label: "Grande", action: () => state.enemies.push(new Enemy('large')) }
    ]);
  };

  document.getElementById("adminBtnUpgrades").onclick = () => {
    adminSubTitle.innerText = "RECIBIR MEJORA";
    adminSubContent.innerHTML = "";
    adminSubContent.className = "admin-sub-content admin-cards-grid";
    adminSubContent.parentElement.classList.add("wide-box");
    
    upgradeDatabase.forEach(upg => {
      const card = document.createElement("div");
      card.className = "card";
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
          updateHUD();
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
}

export function triggerGameOver() {
  state.isGameOver = true;
  state.isPaused = true;
  document.getElementById("finalTime").innerText = formatTime(state.gameTime);
  document.getElementById("finalKills").innerText = state.killCount;
  document.getElementById("gameOverModal").style.display = "flex";
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
}


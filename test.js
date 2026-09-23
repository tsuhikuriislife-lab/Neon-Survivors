const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');
const puppeteer = require('puppeteer');

/** Runs the browser checks in sequence and reports each verified player flow. */
async function run() {
  const app = express();
  app.use(express.static(process.cwd()));
  const server = http.createServer(app);
  let browser;
  const browserErrors = [];

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    page.on('pageerror', (error) => browserErrors.push(error.message));

    await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForFunction(() => typeof window.toggleAdminConsole === 'function');
    await page.waitForFunction(() => typeof window.PIXI !== 'undefined');

    const check = (label, condition) => {
      assert.ok(condition, label);
      console.log(`✓ ${label}`);
    };
    const gameState = async () => page.evaluate(async () => {
      const module = await import('/js/engine/gameState.js');
      return {
        isPaused: module.state.isPaused,
        playerLevel: module.state.player?.level ?? 0,
        acquired: Object.values(module.state.player?.acquiredUpgrades || {}).reduce((sum, count) => sum + count, 0)
      };
    });

    const initialAdminState = await page.evaluate(() => ({
      admin: getComputedStyle(document.getElementById('optionsBtnDev')).display,
      quickTest: getComputedStyle(document.getElementById('quick-test-btn')).display
    }));
    check('Admin y QUICK TEST comienzan ocultos', initialAdminState.admin === 'none' && initialAdminState.quickTest === 'none');

    await page.click('#btnStartGame');
    await page.waitForFunction(async () => {
      const { state } = await import('/js/engine/gameState.js');
      return Boolean(state.player && !state.isInMenu);
    });

    const scalingResult = await page.evaluate(async () => {
      const [{ state }, { updateEnemyScaling }] = await Promise.all([
        import('/js/engine/gameState.js'),
        import('/js/systems/WaveManager.js')
      ]);
      const originalPhase = state.currentPhase;
      const originalWaveFlag = state.waveTriggeredEnFase;
      const originalScaling = { ...state.enemyScaling };
      const byPhase = {};

      for (const phase of [6, 7, 9, 12]) {
        state.currentPhase = phase;
        state.waveTriggeredEnFase = false;
        updateEnemyScaling();
        byPhase[phase] = { ...state.enemyScaling };
      }

      state.currentPhase = 7;
      state.waveTriggeredEnFase = true;
      updateEnemyScaling();
      const phaseSevenDuringWave = { ...state.enemyScaling };

      state.currentPhase = originalPhase;
      state.waveTriggeredEnFase = originalWaveFlag;
      state.enemyScaling = originalScaling;
      return { byPhase, phaseSevenDuringWave };
    });
    const closeTo = (actual, expected) => Math.abs(actual - expected) < 0.000001;
    check(
      'Escalado exponencial por fase conserva la referencia y la oleada no altera sus estadísticas',
      closeTo(scalingResult.byPhase[6].hp, 5) &&
      closeTo(scalingResult.byPhase[6].damage, 1.5) &&
      closeTo(scalingResult.byPhase[6].speed, 1.3) &&
      closeTo(scalingResult.byPhase[9].hp, 10) &&
      closeTo(scalingResult.byPhase[9].damage, 1.5 * Math.sqrt(2)) &&
      closeTo(scalingResult.byPhase[9].speed, 1.3 * Math.pow(2, 0.25)) &&
      scalingResult.byPhase[12].hp > scalingResult.byPhase[9].hp &&
      closeTo(scalingResult.phaseSevenDuringWave.hp, scalingResult.byPhase[7].hp) &&
      closeTo(scalingResult.phaseSevenDuringWave.damage, scalingResult.byPhase[7].damage) &&
      closeTo(scalingResult.phaseSevenDuringWave.speed, scalingResult.byPhase[7].speed)
    );

    const missileProgression = await page.evaluate(async () => {
      const [{ upgradeDatabase }, { MissilesSystem }] = await Promise.all([
        import('/js/data/upgrades.js'),
        import('/js/entities/player/weapons/MissilesSystem.js')
      ]);
      const missileWeapon = new MissilesSystem({});
      const player = { weapons: { missiles: missileWeapon } };
      const unlock = upgradeDatabase.find((upgrade) => upgrade.id === 'missiles_unlock');
      const countUpgrade = upgradeDatabase.find((upgrade) => upgrade.id === 'missiles_count');
      unlock.apply(player);
      for (let count = 0; count < 5; count++) countUpgrade.apply(player);
      return {
        initialCount: new MissilesSystem({}).count,
        unlockDescription: unlock.desc,
        countRarity: countUpgrade.rarity,
        countUpgradeMax: countUpgrade.maxCount,
        finalCount: missileWeapon.count,
        recordedUpgrades: missileWeapon.countUpgrades,
        stillAvailable: countUpgrade.isAvailable(player)
      };
    });
    check(
      'Misiles comienzan con dos y alcanzan doce tras cinco mejoras uncommon',
      missileProgression.initialCount === 2 &&
      missileProgression.unlockDescription.includes('2 missiles') &&
      missileProgression.countRarity === 'uncommon' &&
      missileProgression.countUpgradeMax === 5 &&
      missileProgression.finalCount === 12 &&
      missileProgression.recordedUpgrades === 5 &&
      !missileProgression.stillAvailable
    );

    await page.evaluate(async () => {
      const { state } = await import('/js/engine/gameState.js');
      state.player.gainXP(state.player.nextXp - state.player.xp);
    });
    await page.waitForFunction(() => document.getElementById('levelModal').style.display === 'flex');
    await page.waitForFunction(() => document.querySelectorAll('#cardsContainer .card').length === 3);

    await page.click('#cardsContainer .card');
    await page.waitForFunction(() => document.getElementById('levelModal').style.display === 'none');
    let runState = await gameState();
    check('Level-up: elegir una carta cierra el modal y reanuda el juego', !runState.isPaused && runState.acquired === 1);

    await page.evaluate(async () => {
      const { state } = await import('/js/engine/gameState.js');
      state.player.gainXP(state.player.nextXp - state.player.xp);
    });
    await page.waitForFunction(() => document.getElementById('levelModal').style.display === 'flex');
    await page.click('#levelUpInventoryButton');
    const inventoryView = await page.evaluate(() => ({
      visible: document.getElementById('acquiredUpgradesModal').style.display === 'flex',
      cardCount: document.querySelectorAll('#acquiredUpgradesCards .acquired-upgrade-card').length,
      columns: getComputedStyle(document.getElementById('acquiredUpgradesCards')).gridTemplateColumns.split(' ').length
    }));
    check('Inventario de level-up abre con cartas y cinco columnas', inventoryView.visible && inventoryView.cardCount === 1 && inventoryView.columns === 5);
    await page.click('#acquiredUpgradesClose');
    await page.click('#cardsContainer .card');
    await page.waitForFunction(() => document.getElementById('levelModal').style.display === 'none');

    await page.click('#pause-btn');
    const pauseView = await page.evaluate(() => ({
      visible: document.getElementById('optionsModal').style.display === 'flex',
      cardCount: document.querySelectorAll('#pauseUpgradeCards .acquired-upgrade-card').length,
      hasCurrentCounts: [...document.querySelectorAll('#pauseUpgradeCards .upgrade-count')].every((label) => label.textContent.startsWith('Current:')),
      columns: getComputedStyle(document.getElementById('pauseUpgradeCards')).gridTemplateColumns.split(' ').length
    }));
    check('Pausa muestra las mejoras actuales, sus contadores y tres columnas', pauseView.visible && pauseView.cardCount === 2 && pauseView.hasCurrentCounts && pauseView.columns === 3);
    await page.click('#optionsBtnResume');
    await page.waitForFunction(() => document.getElementById('optionsModal').style.display === 'none');

    await page.evaluate(() => window.toggleAdminConsole());
    await page.locator('#adminConsoleInput').fill('/admin on');
    await page.click('#adminConsoleSubmit');
    let adminState = await page.evaluate(() => ({
      admin: getComputedStyle(document.getElementById('optionsBtnDev')).display,
      quickTest: getComputedStyle(document.getElementById('quick-test-btn')).display
    }));
    check('/admin on muestra ambos controles', adminState.admin !== 'none' && adminState.quickTest !== 'none');
    await page.locator('#adminConsoleInput').fill('/admin off');
    await page.click('#adminConsoleSubmit');
    adminState = await page.evaluate(() => ({
      admin: getComputedStyle(document.getElementById('optionsBtnDev')).display,
      quickTest: getComputedStyle(document.getElementById('quick-test-btn')).display
    }));
    check('/admin off vuelve a ocultar ambos controles', adminState.admin === 'none' && adminState.quickTest === 'none');
    await page.evaluate(() => window.toggleAdminConsole());

    const quantumResult = await page.evaluate(async () => {
      const [{ state }, { upgradeDatabase }] = await Promise.all([
        import('/js/engine/gameState.js'),
        import('/js/data/upgrades.js')
      ]);
      const quantum = upgradeDatabase.find((upgrade) => upgrade.id === 'auto_magnet');
      const oldChance = state.player.autoMagnetChance;
      const oldCount = state.player.autoMagnetUpgrades;
      state.player.autoMagnetChance = 0;
      state.player.autoMagnetUpgrades = 0;
      for (let i = 0; i < 10; i++) quantum.apply(state.player);
      const result = {
        chance: state.player.autoMagnetChance,
        available: quantum.isAvailable(state.player),
        infinite: quantum.isInfinite === true
      };
      state.player.autoMagnetChance = oldChance;
      state.player.autoMagnetUpgrades = oldCount;
      return result;
    });
    check('Quantum Singularity llega a 100%, se agota por probabilidad y no es infinita', quantumResult.chance === 1 && !quantumResult.available && !quantumResult.infinite);

    const upgradeDataResult = await page.evaluate(async () => {
      const [{ upgradeDatabase }, { acquireUpgrade, canAcquireUpgrade, getUpgradeCount, getUpgradeMaxCount }] = await Promise.all([
        import('/js/data/upgrades.js'),
        import('/js/data/upgradeUtils.js')
      ]);
      const magnetic = upgradeDatabase.find((upgrade) => upgrade.id === 'magnet_boost');
      const temporal = upgradeDatabase.find((upgrade) => upgrade.id === 'iframe_small');
      const capped = { id: 'test_cap', maxCount: 1, apply: (player) => { player.applied = (player.applied || 0) + 1; } };
      const player = { acquiredUpgrades: {} };
      const firstGrant = acquireUpgrade(capped, player);
      const secondGrant = acquireUpgrade(capped, player);
      return {
        magneticCount: getUpgradeCount(magnetic, { acquiredUpgrades: { magnet_boost: 2 } }),
        magneticMax: getUpgradeMaxCount(magnetic),
        finiteStopsAtMaximum: !canAcquireUpgrade(magnetic, { magnetUpgrades: 2, acquiredUpgrades: { magnet_boost: 4 } }),
        temporalUnlocksAtIFrameCap: canAcquireUpgrade(temporal, { iFrameUpgradesCount: 3, acquiredUpgrades: { iframe_extend: 3 } }),
        firstGrant,
        secondGrant,
        applied: player.applied,
        registered: player.acquiredUpgrades.test_cap
      };
    });
    check('Conteo, máximo, disponibilidad y concesión usan la utilidad común', upgradeDataResult.magneticCount === 2 && upgradeDataResult.magneticMax === 4 && upgradeDataResult.finiteStopsAtMaximum && upgradeDataResult.temporalUnlocksAtIFrameCap && upgradeDataResult.firstGrant && !upgradeDataResult.secondGrant && upgradeDataResult.applied === 1 && upgradeDataResult.registered === 1);

    const extraGemResult = await page.evaluate(async () => {
      const [{ state }, { Enemy }] = await Promise.all([
        import('/js/engine/gameState.js'),
        import('/js/entities/enemies/Enemy.js')
      ]);
      const oldPool = state.gemPool;
      const oldChance = state.player.autoMagnetChance;
      const oldDoubleChance = state.player.doubleGemChance;
      const oldHealChance = state.player.healDropChance;
      const drops = [];
      state.gemPool = { acquire: (...args) => drops.push(args) };
      state.player.autoMagnetChance = 1;
      state.player.doubleGemChance = 1;
      state.player.healDropChance = 0;
      Enemy.prototype.dropLoot.call({
        x: state.player.x,
        y: state.player.y,
        radius: 6,
        xpValue: 2
      });
      state.gemPool = oldPool;
      state.player.autoMagnetChance = oldChance;
      state.player.doubleGemChance = oldDoubleChance;
      state.player.healDropChance = oldHealChance;
      return { count: drops.length, allMagnetized: drops.every((drop) => drop[3] === true) };
    });
    check('Las orbes extra de Duplicate Experience reciben Quantum Singularity', extraGemResult.count === 2 && extraGemResult.allMagnetized);

    const gemSpeedResult = await page.evaluate(async () => {
      const { state } = await import('/js/engine/gameState.js');
      const player = state.player;
      const oldRadius = player.pickupRadius;
      const oldMultiplier = player.pickupRadiusMult;
      player.pickupRadius = 1000;
      player.pickupRadiusMult = 1;
      const startX = player.x + 400;
      const normal = state.gemPool.acquire(startX, player.y, 1, false, 'xp');
      const singularity = state.gemPool.acquire(startX, player.y + 50, 1, true, 'xp');
      const normalStart = normal.x;
      const singularityStart = singularity.x;
      normal.update(player);
      singularity.update(player);
      const result = {
        normal: Math.hypot(normal.x - normalStart, normal.y - player.y),
        singularity: Math.hypot(singularity.x - singularityStart, singularity.y - (player.y + 50))
      };
      normal.active = false;
      normal.sprite.visible = false;
      singularity.active = false;
      singularity.sprite.visible = false;
      player.pickupRadius = oldRadius;
      player.pickupRadiusMult = oldMultiplier;
      return result;
    });
    check('Orbes con y sin Quantum se desplazan 15 unidades por actualización', Math.abs(gemSpeedResult.normal - 15) < 0.001 && Math.abs(gemSpeedResult.singularity - 15) < 0.001);

    const lightningResult = await page.evaluate(async () => {
      const [{ state }, { showGameOverStats }, { worldLayer }] = await Promise.all([
        import('/js/engine/gameState.js'),
        import('/js/ui/UIManager.js'),
        import('/js/main.js')
      ]);
      state.isPaused = true;
      state.lightningQueue.push({ currentTarget: { x: 0, y: 0 } });
      state.lightningEffects.push({ x1: 0, y1: 0, x2: 100, y2: 100, timer: 15, color: 0xffff00 });
      const graphics = state.lightningLayer || new PIXI.Graphics();
      if (!graphics.parent) worldLayer.addChild(graphics);
      state.lightningLayer = graphics;
      showGameOverStats();
      return {
        queue: state.lightningQueue.length,
        effects: state.lightningEffects.length,
        layerCleared: state.lightningLayer === null && graphics.destroyed === true && graphics.parent === null
      };
    });
    check('Fin de partida limpia rayos en cola, trazos y Graphics de PIXI', lightningResult.queue === 0 && lightningResult.effects === 0 && lightningResult.layerCleared);

    const resetLightningResult = await page.evaluate(async () => {
      const [{ state }, { worldLayer }] = await Promise.all([
        import('/js/engine/gameState.js'),
        import('/js/main.js')
      ]);
      const graphics = new PIXI.Graphics();
      worldLayer.addChild(graphics);
      state.lightningLayer = graphics;
      state.lightningQueue.push({ currentTarget: { x: 0, y: 0 } });
      state.lightningEffects.push({ x1: 0, y1: 0, x2: 50, y2: 50, timer: 10, color: 0xffff00 });
      state.reset();
      return {
        queue: state.lightningQueue.length,
        effects: state.lightningEffects.length,
        layerCleared: state.lightningLayer === null && graphics.destroyed === true && graphics.parent === null
      };
    });
    check('Reiniciar el estado también limpia la capa de rayos', resetLightningResult.queue === 0 && resetLightningResult.effects === 0 && resetLightningResult.layerCleared);

    const crossRunCleanup = await page.evaluate(async () => {
      const [{ state }, { showBossRewardMenu, returnToMainMenu }, { initGame }] = await Promise.all([
        import('/js/engine/gameState.js'),
        import('/js/ui/UIManager.js'),
        import('/js/engine/Game.js')
      ]);
      initGame();
      state.isInMenu = false;
      state.isGameOver = false;
      state.isPaused = false;
      state.godMode = true;
      state.disableSpawns = true;
      state.disableBossSpawns = true;
      state.disableEnemyCollisions = true;
      state.showTestingPanel = true;
      document.getElementById('testing-panel').style.display = 'block';
      document.getElementById('adminToggleTestingPanel').checked = true;

      const originalRandom = Math.random;
      Math.random = () => 0;
      showBossRewardMenu('Lifecycle Test');
      document.querySelector('#bossRewardCards .card-container-3d').click();
      Math.random = originalRandom;
      returnToMainMenu();
      const clearedBeforeRestart = state.isInMenu && !state.godMode && !state.disableSpawns && !state.disableBossSpawns && !state.disableEnemyCollisions && !state.showTestingPanel && document.getElementById('testing-panel').style.display === 'none' && document.getElementById('bossRewardModal').style.display === 'none';
      return { clearedBeforeRestart };
    });
    await page.click('#btnStartGame');
    await page.waitForFunction(async () => {
      const { state } = await import('/js/engine/gameState.js');
      return Boolean(state.player && !state.isInMenu);
    });
    await new Promise((resolve) => setTimeout(resolve, 850));
    const freshRunState = await page.evaluate(async () => {
      const { state } = await import('/js/engine/gameState.js');
      return {
        acquired: Object.values(state.player.acquiredUpgrades || {}).reduce((sum, count) => sum + count, 0),
        adminFlags: [state.godMode, state.disableSpawns, state.disableBossSpawns, state.disableEnemyCollisions].some(Boolean),
        testPanel: state.showTestingPanel || document.getElementById('testing-panel').style.display !== 'none'
      };
    });
    check('El reinicio cancela premios diferidos y limpia flags/HUD administrativo', crossRunCleanup.clearedBeforeRestart && freshRunState.acquired === 0 && !freshRunState.adminFlags && !freshRunState.testPanel);


    check('La ejecución del navegador terminó sin errores JavaScript', browserErrors.length === 0);
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

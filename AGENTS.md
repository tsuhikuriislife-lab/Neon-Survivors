# AGENTS.md

## Context for Agents
This repository contains a browser-based arena survival game ("Neon Survivors"). It was originally a monolithic HTML file but was refactored into a scalable, layered ES6 architecture.

### Architectural Decisions
1. **Centralized State (`gameState.js`)**: 
   Since the original game heavily relied on global arrays (`enemies`, `projectiles`, `gems`, etc.), passing these through strict OOP dependency injection would have required a massive logical rewrite prone to bugs. Instead, we use `js/engine/gameState.js` as a centralized store. All modules read and write to this `state` object.
2. **ES Modules**: 
   All JS files use ES6 `export` and `import`. The HTML file loads `main.js` using `<script type="module">`.
3. **Circular Dependencies**: 
   Be cautious of circular dependencies when adding new logic, specifically between `Effects.js` (which uses `state` to add particles) and `Player.js`. Currently, this is mitigated by standard module initialization, but if a circular reference throws an error, consider dynamic imports or initializing logic inside the `update()` methods instead of the module root.

### File Structure
- `css/` -> Stylesheets.
- `js/engine/` -> Core mechanics (`Game`, `Input`, `gameState`, `Utils`).
- `js/entities/` -> Game objects (`Player`, `Enemy`, `Bosses`, `Projectiles`, `Effects`, `Collectibles`).
- `js/systems/` -> Logic managers (`WaveManager`).
- `js/ui/` -> Interface managers (`UIManager`).
- `js/data/` -> Configuration and static data (`upgrades`).

### When Modifying
- **Adding a new weapon**: Modify `Player.js` and add an upgrade card in `js/data/upgrades.js`. Add any custom projectile logic to `js/entities/Projectiles.js`.
- **Adding a new enemy/boss**: Create a new class or modify the constructor in `js/entities/Enemy.js` or `js/entities/Bosses.js`, and update `js/systems/WaveManager.js` or `Game.js`.
- **Modifying UI**: Update HTML in `index.html`, styles in `css/styles.css`, and logic in `js/ui/UIManager.js`.

### Recent Implementations & System Mechanics
- **Audio Architecture (`AudioManager.js`)**: 
  - Centralized Web Audio API manager handling BGM and SFX.
  - Supports dynamic property modification (volume, pitch, speed), throttling for overlapped sounds (e.g. `throttleMs: 50`), and independent channels (`bgmVolume`, `sfxVolume`).
  - Music dynamically switches per boss. Menus opening automatically muffle BGM (fades to 20%).
- **Options & Admin Panel**: The HUD contains an `⚙️ OPCIONES` button. This pauses the game and provides sound sliders. The legacy Admin Menu is now a sub-menu accessed from within the Options modal.
- **Boss Mechanics (`Bosses.js`)**: 
  - `Devourer of Tax`: Features momentum-based steering (slows down on tight turns) and a high-speed dash mechanic that severely limits turning capacity while active. Includes dash and death SFX.
  - `Kyren` / `Denzel`: When Kyren splits, Denzel smoothly floats downward from Kyren's exact death location. Kyren plays an anticipation dash sound when entering its charge state.
- **Projectiles (`Projectiles.js` & `Player.js`)**:
  - Missiles use a queue system (`missilesQueue`, `missileFireTimer`) to fire sequentially with a 0.2s delay instead of all at once.
  - Enemy projectiles ignore time-to-live (`life`) checks and only despawn when leaving the screen bounds.
  - The player's main blaster supports a `homingStrength` mechanic for subtly tracking targets.
  - The `NovaProjectile` class supports a spiral-outward travel pattern if `isSpiral` is passed as true, utilized by the `Tornado Nova` upgrade.
  - The `MissileProjectile` handles its own AoE damage via an `onHit()` method. `Game.js` will trigger this when an enemy collision occurs before despawning the non-piercing projectile.
- **Upgrade Balancing & Caps**: Many upgrades in `upgrades.js` have strict maximum limits implemented via `isAvailable` functions checking counters inside `Player.js` (e.g., max 4 upgrades for blaster count/rate and magnet). Weapons like Shockwave, Orbitals (Satellites), and Missiles are split into an unlock card and separate progressive stat upgrades (range, size, speed, etc.).
- **Upgrade Rarities & Infinite Scaling**:
  - Upgrades are categorized by rarity (`common` 60%, `uncommon` 20%, `rare` 15%, `legendary` 5%).
  - Core upgrades have hard caps (`isAvailable` checks limit `damage_boost` to 5, `hp_regen` to 3, etc.).
  - Once capped, "Infinite Upgrades" become available (e.g. `damage_small`, `crit_chance`, `boss_hp_cut`) with `isInfinite: true` to prevent browser crashes during automated Quick Testing loops.
- **Boss Scaling & Reward Mechanics**:
  - Bosses cannot spawn twice in a row (`state.lastBossName` tracking).
  - Defeating a boss permanently scales its specific base HP by +70% for future spawns via `state.bossScaling`.
  - Defeating a boss triggers a 5-card face-down Reward Modal. Players pick 1 (or 2 with a 20% chance). First pick has a 5% "Jackpot" chance to grant all remaining cards with a CSS confetti particle effect.
- **Critical Hit System**:
  - Players have `critChance` (base 0) and `critDamage` (base 1.5).
  - Computed on impact inside `Enemy.js` and `Boss.js` `takeDamage` methods. Crits trigger larger, yellow `#ffff00` floating damage text.

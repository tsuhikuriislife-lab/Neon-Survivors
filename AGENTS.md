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
- **Options & Admin Panel & Developer Tools**: 
  - The HUD contains an `⚙️ OPCIONES` button (sound sliders, camera zoom, developer tools access) and a `🚀 TESTEO RÁPIDO` button.
  - The Admin Menu allows toggling God Mode, enemy/boss spawns, a live real-time DPS/damage breakdown HUD overlay (`#testing-panel`), clearing all enemies, spawning dummy targets, and spawning individual enemies/bosses/upgrades via visual card grids.
- **Boss Mechanics & Snake Movement Architecture (`DevourerOfTaxBoss`, `CarlosMinion`, `SebastianMinion`)**: 
  - **Eater of Worlds Kinematics, Speed Zones & Low-Speed Exit State Machine**: 
    - **Inside Arena (`ATTACK`)**: Enters at maximum high speed (`outsideSpeed: 14.0` for Devourer, `13.0 - 13.2` for Minions) in a high-momentum dive towards the player. Applies progressive friction (`friction: 0.045 / frame`) down towards `minSpeed: 2.8`.
    - **Low-Speed Exit Trigger (`SEEK_EXIT`)**: When the snake's speed decays to `minSpeed + 0.3`, it switches target away from the player to navigate directly towards the nearest outside map boundary to initiate a new dive loop.
    - **Outside Arena Acceleration (`OUTSIDE_ACCEL`)**: Once across the border, it continues outward accelerating rapidly (`outsideAccel: 0.22`) towards maximum speed.
    - **Re-Entry Dive (`OUTSIDE_REENTRY`)**: Only when the snake reaches maximum velocity (`speed >= outsideSpeed - 0.3`) does it lock onto the player with agile turn rate (`outsideTurnRate: 0.075`), whipping around to launch an all-out high-speed charge back into the arena.
  - **Inversely Proportional Turn Rate**: Turning capacity ($\omega$) is inversely proportional to linear speed ($v$): $\text{turnSpeed} = \text{clamp}(\frac{\text{turnRateFactor}}{v}, \text{minTurnRate}, \text{maxTurnRate})$. At high speeds ($v \approx 14$), turn rate is minimal ($0.009$) creating wide arcs; at low speeds ($v \approx 2.8$), turn rate increases ($0.045 - 0.048$) enabling agile maneuvers.
  - **Collision Balance & Body Hit Cooldown**: Head deals heavy direct impact damage (`headDamage: 28`); body segments have a reduced hitbox radius (`radius * 0.7`), lower damage (`12`), and a global damage cooldown (`30 frames / 0.5s`) to prevent instakills or trapping the player.
  - **Dynamic Player Proximity Transparency**: Body segments calculate distance to the player and reduce opacity dynamically (`minAlphaOnPlayer: 0.22` within `proximityFadeRadius: 140px`), ensuring the player and active weapons are always visible when underneath worm segments.
  - **Snake-to-Snake Repulsion & Flanking Separation (`applySnakeRepulsion`)**: 
    - Active snakes continuously calculate head-to-head and head-to-body proximity vectors (`separationDist = radius * 3.0`).
    - Applies soft physical displacement and smooth angular steering deflection ($0.4 \times \Delta\theta_{\text{repel}}$) to prevent snakes from following identical trajectories or superimposing on top of each other.
    - Carlos and Sebastian maintain complementary flanking offsets ($\pm 0.4\pi$ around the player) and divergent perimeter exit points during `SEEK_EXIT`.
    - **Carlos Salvo Sequence**: Fires accelerating projectiles (`AcceleratingProjectile`) in a progressive wave from the tip of the tail (`segmentCount - 1`) forward to the head (`0`).
  - **Impulse Split Spawn**: When Devourer of Tax splits at 50% HP (or upon quick lethal damage), Carlos and Sebastian spawn directly on top of Devourer with high-velocity initial impulses (`initialSpeed = 12.0`) along divergent random angles.
- **Projectiles & Weapons (`Projectiles.js`, `LaserBeam.js` & `Player.js`)**:
  - **Laser Cannon Damage Falloff**: Piercing laser beam calculates enemies sorted by distance along the beam path. Applies a progressive -5% damage falloff per enemy struck (1st enemy: 100%, 2nd: 95%, 3rd: 90% down to a 10% floor).
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
  - **Boss Spawn Sequence (5 Seconds Anticipation)**: Boss spawns trigger a HUD warning banner (`#boss-warning-banner`), a spawn warning SFX, and render a pulsing red holographic beacon with concentric rotating rings in the arena. After 5.0 seconds, the beacon detonates in neon particles and instantiates the boss.
- **Arena Dimensions & Camera**:
  - Fixed square arena dimensions of `1920 x 1920` with canonical center at `(960, 960)`.
  - The camera smoothly tracks the player (`state.camera`) and supports customizable zoom via the Options menu.
- **Enemy & Boss Registry Architecture (`enemyRegistry.js` & `bossRegistry.js`)**:
  - All enemies and bosses are centrally registered with their metadata, factory instantiators, and vector preview canvas drawings.
  - Adding any new enemy or boss automatically populates developer spawn grids (`adminBtnSpawnEnemy`, `adminBtnSpawnBoss`) and wave manager pools (`getMainBosses()`) without modifying UI logic.
- **Floor Controls Guide (1-Minute Fadeout)**:
  - Responsive floor diagrams rendered directly into the arena floor at `(960, 960)` via `drawFloorControls(ctx)` in `Game.js`.
  - Desktop: WASD / Directional arrows movement keys on left, vector mouse with hold-to-aim and release-to-fire Laser Cannon on right.
  - Mobile: Virtual movement joystick on left, touch drag aim & release fire laser on right.
  - Smoothly fades out from 50s to 60s and stops rendering after 1 minute (`state.gameTime >= 60`).
- **Mobile Landscape Orientation Enforcer**:
  - Automatically detects touch/mobile devices in portrait orientation.
  - Displays `#rotate-device-overlay` with phone rotation animation and automatically pauses game execution.
  - Automatically resumes when rotated back to landscape mode. Calls `screen.orientation?.lock('landscape')` on user interactions.
- **Critical Hit System**:
  - Players have `critChance` (base 0) and `critDamage` (base 1.5).
  - Computed on impact inside `Enemy.js` and `Boss.js` `takeDamage` methods. Crits trigger larger, punchier floating damage text matching the hitting weapon's color with higher brightness (neon glow and luminous white core) and subtle randomized rotation tilt ($\pm 10^\circ$).
- **60 FPS Performance Optimization Architecture**:
  - **Procedural Batching & Instanced Geometry (`ProceduralBatchRenderer.js`)**: Zero-GC procedural polygon pipeline for enemies and snake bosses. Precomputes unit polygon vertices (`GeometryBank`), flattens instance data into a single `Float32Array`, performs CPU AABB Frustum Culling against camera viewport bounds, and flushes grouped polygon batches with direct affine transformations and minimal draw calls.
  - **Texture Caching (`TextureCache.js`)**: Pre-computes offscreen canvases with baked neon `shadowBlur` for player ship, orbitals, all enemy tiers, gems, projectiles, and boss parts. Replaces runtime `drawPolygon` / vector paths with direct `ctx.drawImage` calls.
  - **Spatial Partitioning (`SpatialHashGrid.js`)**: 120x120px uniform grid (16x16 cells) over the 1920x1920 arena. Reduces projectile, laser, shockwave, orbital, and auto-aim collision queries from $O(N \times M)$ to $O(1)$ average.
  - **Object Pooling (`Pool.js`)**: Fixed-size preallocated pools with `active` flags for particles (1500), projectiles (400), XP gems (500), and floating texts (300). Eliminates runtime heap allocations and Garbage Collection pauses.
  - **Fast Removals & Batch Rendering**: Replaces $O(N)$ `splice()` with $O(1)$ swap-and-pop on active entity arrays. Renders particles grouped by color in batches with `shadowBlur = 0`.
- **Dynamic Camera & Screenshake Architecture (`Camera.js`)**:
  - `state.camera` is managed by `CameraController`.
  - **Screenshake**: `camera.shake({ strength, duration, rotation, scale })` applies quadratic ease-out decay with translation jitter, rotational roll, and punch-scale perturbation.
  - **Dynamic Zoom**: `camera.setZoom(zoomAmount, duration, fadeInDuration, fadeOutDuration)` allows temporary or permanent camera zoom with smooth easing.
  - **Cinematic Focus**: `camera.focusOn({ x, y, zoom, duration, fadeInDuration, fadeOutDuration })` smoothly pans the camera to objectives (e.g. boss spawn beacons) and returns to the player with `easeInOutQuad`.
- **Map Environment Visual Effects (`EnvironmentManager.js`)**:
  - `state.environment` manages independent dynamic properties (`color`, `brightness`, `pulse`, `duration`, `fadeInDuration`, `fadeOutDuration`) for:
    - **Background**: `environment.setBackground(...)`
    - **Grid Lines**: `environment.setGridLines(...)`
    - **Perimeter Borders & Corners**: `environment.setBorders(...)`
  - Supports permanent changes (`duration: 0`) or temporary alerts with smooth fade transitions.
- **Fixed Virtual Resolution & Aspect Ratio Scaling (Letterboxing/Pillarboxing)**:
  - **Canonical Resolution**: Fixed internal canvas coordinate space of `1920 x 1080` (16:9). `canvas.width = 1920` and `canvas.height = 1080` remain constant on all devices.
  - **Responsive Letterboxing**: `#game-container` is strictly aspect-ratio 16:9, centered on `body` with black background (`#000000`).
  - **Uniform Scaling**: Scale factor `Math.min(viewport.width / 1920, viewport.height / 1080)` sets `#game-container` pixel dimensions and `--ui-scale`.
  - **Coordinate Mapping (`Input.js`)**: `getVirtualCoords(clientX, clientY)` converts raw viewport events to canonical virtual coordinates `(0-1920, 0-1080)` and `screenToWorld()` projects into world coordinates with perfect accuracy across letterboxed screens.
- **Safari iOS Mobile Viewport Lifecycle & Rotation Compatibility**:
  - **Visual Viewport Prioritization**: `getViewportSize()` queries `window.visualViewport.width/height` before fallback to `innerWidth/innerHeight`, accurately tracking Safari's dynamic navigation bars and landscape rotation.
  - **Multi-Stage Event Handlers**: Listens to `'resize'`, `'orientationchange'`, `visualViewport.onresize`, `visualViewport.onscroll`, and `'visibilitychange'`. Schedules multi-stage execution passes (immediate, 100ms, 200ms, 350ms) to ensure full synchronization with Safari's orientation animations.
  - **Dynamic Viewport Units**: `body` and `#game-container` use `100dvw` and `100dvh` in CSS to adapt to mobile browser chrome changes seamlessly.
- **Dynamic Mobile UI Scaling & Anti-Collision Architecture**:
  - **Fluid HUD Layout**: Top HUD (`.level-badge`, `.xp-container`, `#pause-btn`) and Bottom HUD (`.hp-container`, `.stats-hud` [Time & Kills in bottom center], `#activeSkillHud` [larger skill button on bottom right], `#quick-test-btn` above HP) use CSS `clamp()`, `cqw`, and `cqh` units to prevent element overlaps on constrained screens.
  - **Skill Button & Responsive Prompts**: Enlarged skill button (`clamp(62px, 7.8cqw, 90px)`); key prompt `[SPACE]` is conditionally shown only on desktop devices and hidden on mobile touch devices.
  - **Top-Right Pause Button**: Sleek neon pause button with 2 vertical bars (`#pause-btn`) replacing options text button.
  - **Stacked Multi-Boss Bars**: Boss health bars (`#boss-hud-container`) stack cleanly above the Active Skill button (`.active-skill-container`), eliminating visual collisions during boss encounters.
  - **Auto-Contained Dynamic Modals**: Modals (`#levelModal`, `#bossRewardModal`, `#optionsModal`, `#adminModal`, `#gameOverModal`) utilize `max-height: 88cqh; overflow-y: auto;` and styled ultra-thin scrollbars, preventing content from bleeding off-screen on low-resolution landscape phones.
- **Force Field / Shield Architecture (`Campo de Fuerza`)**:
  - **Charge Absorption & Invulnerability**: Absorbs all projectile/contact damage without losing player HP. When taking damage with active shield charges, player invulnerability time (`invulnerabilityTimer`) is halved (`invulnerabilityMaxTime / 2`).
  - **Dynamic Charge Colors & Explosions**:
    - **1 Charge**: Blue (`#00aaff`)
    - **2 Charges**: Light Blue / Celeste (`#70d6ff`)
    - **3 Charges**: White (`#ffffff`)
    - All defensive explosions and shockwaves match the color of the active charge at impact.
  - **1200 Base Explosion Damage**: Rare `shield_explosion` triggers an AoE shockwave dealing 1200 base damage scaled by `player.getEffectiveDamageMult()` to all nearby enemies and bosses.
  - **Charge Preservation Deflexion**: 5% per level (max 2 = 10%) chance to deflect without consuming charge. When deflected, the explosion still occurs and the charge remains intact.
  - **Active Stat Buffs**: +5% weapon damage (max 5) and +5% weapon fire speed (max 5) while shield charges are active; bonuses turn off if charges drop to 0 until regenerated.
  - **Under-Ship Shield Cooldown Indicator**: Renders directly under the Laser Cannon cooldown bar (or under the ship if no laser), colored dynamically with the hue of the specific charge currently being regenerated.






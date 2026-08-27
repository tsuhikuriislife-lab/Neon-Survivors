# Neon Survivors

A browser-based arena survival shooter with a layered ES6 module architecture.

## How to Play
1. Serve the project using a local web server (e.g., `python3 -m http.server`).
2. Open `index.html` in your web browser.
3. Use `W`, `A`, `S`, `D` or `Arrow Keys` to move.
4. Survive as long as possible by dodging enemies, collecting XP gems, and selecting upgrades.

## Architecture
The game uses a modular, layered architecture to maintain clean separation of concerns:

- **index.html**: The entry point that loads `css/styles.css` and imports `js/main.js` as a module.
- **css/styles.css**: Contains all styles for the UI, canvas, and modals.
- **js/main.js**: Bootstraps the game, initializes the engine, inputs, and UI.

### JS Layers
1. **Engine (`js/engine/`)**
   - `Game.js`: The core loop, updating entities and rendering them.
   - `gameState.js`: The central state container holding all game objects (player, enemies, etc.).
   - `Input.js`: Tracks keyboard input state.
   - `Utils.js`: Common math and drawing functions.

2. **Entities (`js/entities/`)**
   - `Player.js`: Player logic, movement, health, and weapons.
   - `Enemy.js`: Standard enemy logic.
   - `Bosses.js`: Defines various bosses (Kyren, Denzel, DevourerOfTax, Amalgam).
   - `Projectiles.js`: Player and enemy projectiles.
   - `Effects.js`: Visual effects like Particles and Floating Texts, and Hazards.
   - `Collectibles.js`: XP Gems.

3. **Systems (`js/systems/`)**
   - `WaveManager.js`: Controls enemy and boss spawn rates based on game time.

4. **UI (`js/ui/`)**
   - `UIManager.js`: Updates the HUD, renders boss bars, handles upgrade modals, and game over screens.

5. **Data (`js/data/`)**
   - `upgrades.js`: The database of all available player upgrades.


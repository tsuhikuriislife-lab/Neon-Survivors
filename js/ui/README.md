# UI Layer (`js/ui/`)

## Propósito de la capa
La capa `ui` (User Interface) funciona como un puente entre la lógica pura del juego (`engine`, `entities`) y el archivo HTML. Se encarga de actualizar los textos, barras de vida, modales (como el menú de Game Over o subir de nivel) y manejar las interacciones del usuario con los menús (como el panel de Administrador).

## Archivos en esta capa

### `UIManager.js`
Este archivo gestiona todo lo que el usuario ve superpuesto en la pantalla del juego y no forma parte del canvas.

**Qué hace:** 
Actualiza dinámicamente la barra de experiencia, la barra de vida del jugador y los temporizadores buscando la información en `gameState.js`. También se encarga de pausar el juego y mostrar ventanas emergentes cuando es necesario.

**Funciones principales:**
- `updateHUD()`: Actualiza el texto de Nivel, Kills, Tiempo y las barras de XP y HP del jugador. Esta función es llamada constantemente en el bucle principal.
- `renderBossBars()`: Genera barras de salud dinámicas en HTML para los jefes activos. Maneja jerarquías (jefes principales y secundarios, como las divisiones de Amalgam).
- `showUpgradeMenu()`: Se invoca cuando el jugador sube de nivel. Pausa el juego y saca 3 cartas aleatorias desde la base de datos de `upgrades.js` y las pinta en el HTML.
- `initUIListeners()`: Asigna los eventos de click (`onclick`) a los botones del menú. Aquí se encuentra **toda la lógica del Panel de Administrador** (God mode, saltar spawns, invocar jefes/enemigos a voluntad y forzar mejoras).
- `triggerGameOver()`: Muestra la pantalla de derrota y detiene el juego.

**¿Qué puedo cambiar aquí?**
- **Opciones al subir de nivel:** En `showUpgradeMenu()`, el método `.slice(0, 3)` define cuántas opciones le aparecen al usuario (por defecto 3). Puedes aumentar este número para ofrecer más alternativas.
- **Herramientas de Admin:** Si creas nuevos enemigos o mejoras en el futuro, debes venir a la función `initUIListeners()` para añadirlos a los menús desplegables del modo administrador para poder probarlos.


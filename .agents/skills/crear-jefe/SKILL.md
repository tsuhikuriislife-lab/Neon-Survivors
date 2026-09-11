---
name: crear-jefe
description: Procedimiento y reglas para diseñar e integrar un nuevo jefe (Boss) en Neon Survivors.
---

# Guía: Crear un Jefe (Boss)

1. **Entidad Base (`js/entities/Bosses.js`)**:
   - Crea la clase extendiendo la jerarquía de jefes correspondiente.
   - Define su *State Machine* (ej. `ATTACK`, `SEEK_EXIT`, `OUTSIDE_REENTRY`).
   - Sigue la regla física del proyecto: la tasa de giro debe ser inversamente proporcional a la velocidad ($\omega \propto 1/v$).

2. **Registro (`js/data/bossRegistry.js`)**:
   - Inscribe los metadatos, su fábrica (instantiator) y su render vectorizado para que la UI del panel de desarrollador (Admin Panel) lo parsee automáticamente.

3. **Spawn y Escalado (`js/systems/WaveManager.js` y `gameState.js`)**:
   - Respeta los 5 segundos de anticipación con baliza holográfica y HUD de advertencia.
   - Al morir el jefe, asegúrate de que sus futuras apariciones apliquen la escala incremental en `state.bossScaling` (+70% base HP).

4. **Comportamiento Multi-Cuerpo / Partición**:
   - Si el jefe se divide en minions (ej. MarsBoss o Amalgam), el nodo padre debe cambiar a `dead = true` pero mantenerse oculto como controlador de los hijos. El Modal de Recompensa (5 cartas) SÓLO se dispara cuando la suma de todos los fragmentos `getTargetables().length === 0`.

5. **Recompensas y WebGL Cleanup**:
   - Implementa teletransporte automático de gemas al centro `(960, 960)` si el jefe es rematado fuera del canvas visible.
   - Llama obligatoriamente a `this.destroy()` en todos los fragmentos para evitar fugas del webGL scene-graph.

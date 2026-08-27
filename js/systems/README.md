# Systems Layer (`js/systems/`)

## Propósito de la capa
La capa `systems` se dedica a los administradores lógicos que rigen las reglas y el ritmo del juego, pero que no son entidades tangibles ni mecánicas del motor puro. Actúan como los "directores" de la partida.

## Archivos en esta capa

### `WaveManager.js`
Se encarga de decidir qué enemigos deben aparecer (spawnear), cuándo y de qué tipo, basándose en el tiempo de la partida y otros factores.

**Qué hace:** 
Usa el temporizador del juego para invocar periódicamente a los enemigos comunes y a los jefes. Ajusta la dificultad generando enemigos más grandes o de forma más rápida conforme avanza el tiempo.

**Funciones:**
- `spawnRandomBoss()`: Elige aleatoriamente entre los 3 jefes principales (Kyren, Devourer of Tax, Amalgam) y lo añade a la lista de bosses en el estado del juego. También genera una alerta visual en pantalla.
- `handleSpawning()`: Es invocada en cada ciclo del juego. Calcula el intervalo de aparición de enemigos según el tiempo (`state.gameTime`). Determina qué tipo de enemigo (`small`, `medium`, `large`) aparecerá basado en probabilidades. Si hay un jefe activo, reduce drásticamente los spawns comunes para no saturar la pantalla.

**¿Qué puedo cambiar aquí?**
- **Frecuencia de aparición:** Puedes modificar la lógica de `baseInterval` dentro de `handleSpawning()`. Si disminuyes los números, los enemigos aparecerán mucho más rápido, incrementando la dificultad.
- **Tipos de enemigos:** Puedes cambiar las probabilidades de que aparezca un enemigo gigante (`large`) en etapas tempranas ajustando las condiciones (`if (state.gameTime < 180)`...).
- **Comportamiento con Jefes:** Actualmente, si hay un jefe, los enemigos aparecen 4 veces más lento (`baseInterval = Math.floor(baseInterval / 0.25)`). Esto puede ser modificado para hacer las peleas con jefes más caóticas.
- **Orden de los Jefes:** En `spawnRandomBoss()` puedes forzar a que siempre aparezca un jefe específico en vez de uno aleatorio.


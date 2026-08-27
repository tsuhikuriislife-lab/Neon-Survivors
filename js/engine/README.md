# Engine Layer (`js/engine/`)

## Propósito de la capa
La capa `engine` es el núcleo o motor del juego. Contiene los sistemas base que mantienen el juego funcionando: el bucle principal (game loop), el estado centralizado (almacenamiento de todas las entidades en la pantalla), gestión de entradas (inputs) del teclado y utilidades matemáticas.

## Archivos en esta capa

### 1. `gameState.js`
Almacena el estado global y centralizado de la partida. Evita tener que pasar variables complejas de un archivo a otro.

**Qué hace:** Exporta un objeto `state` que contiene todas las listas de entidades (jugador, enemigos, proyectiles, bosses) y variables de estado (tiempo, kills, si está pausado).
**Funciones:**
- `reset()`: Limpia y reinicia todos los valores para empezar una nueva partida.
**¿Qué puedo cambiar aquí?**
- `nextBossTime`: Cambiar el tiempo en el que aparece el primer jefe.
- Añadir nuevas listas globales si creas nuevos tipos de entidades.

### 2. `Game.js`
Controla el ciclo de vida del juego, el renderizado de la escena (background) y la detección de colisiones.

**Qué hace:** Contiene el "Game Loop" (bucle principal) que actualiza cada entidad y dibuja los gráficos en pantalla usando Canvas. También maneja las colisiones entre proyectiles, enemigos y el jugador.
**Funciones:**
- `initGame()`: Inicializa una nueva partida (crea al jugador, reinicia estado).
- `drawBackground(ctx)`: Dibuja la cuadrícula de fondo con estilo neón.
- `loop(timestamp, ctx)`: Bucle principal. Actualiza tiempos, spawns, colisiones y dibuja todo.
**¿Qué puedo cambiar aquí?**
- **Fondo:** En `drawBackground` puedes cambiar el color o el tamaño (`40`) de la cuadrícula.
- **Colisiones/Knockback:** Dentro del `loop`, al detectar impactos con armas (como la 'Nova'), puedes ajustar el retroceso (knockback).

### 3. `Input.js`
Maneja las pulsaciones de teclado del usuario.

**Qué hace:** Exporta un diccionario `keys` que mantiene un registro de qué teclas están siendo presionadas en tiempo real.
**Funciones:**
- `initInput()`: Registra los event listeners para `keydown` y `keyup`.

### 4. `Utils.js`
Contiene funciones auxiliares de uso general.

**Qué hace:** Provee funciones matemáticas y de dibujo que varios componentes del juego necesitan.
**Funciones:**
- `dist(x1, y1, x2, y2)`: Calcula la distancia euclidiana entre dos puntos (útil para colisiones).
- `drawPolygon(...)`: Función robusta para dibujar formas poligonales con estilo neón (bordes que brillan).
- `formatTime(sec)`: Convierte segundos a formato `MM:SS`.
**¿Qué puedo cambiar aquí?**
- **Estilo Neon Base:** Si deseas que todo el juego tenga más o menos brillo general, puedes alterar cómo `drawPolygon` aplica el `shadowBlur` (brillo de neón).


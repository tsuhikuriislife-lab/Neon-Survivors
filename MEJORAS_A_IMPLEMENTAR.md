# Mejoras a implementar

## Semillas de aleatoriedad para partidas reproducibles

### Estado actual

El juego todavía no tiene un sistema de semillas. La aleatoriedad se obtiene llamando directamente a `Math.random()` desde distintos módulos. Estas llamadas afectan tanto decisiones de juego como variaciones de presentación: por ejemplo, posiciones y tipos de enemigos, drops, disparos y movimientos de jefes, selección de cartas y algunos detalles de partículas o audio.

`Math.random()` no permite elegir un valor inicial ni recuperar su estado. Por eso dos partidas no se pueden repetir de forma controlada, aunque el jugador tenga los mismos stats y realice las mismas acciones. Tampoco alcanza con anotar una semilla: el código actual no la consume.

### Qué es una semilla

Un generador pseudoaleatorio (PRNG) transforma un estado inicial en una secuencia determinista de valores. La semilla es el estado inicial. Para una misma versión del generador:

```text
semilla 48291 → 0.13, 0.84, 0.27, 0.51, ...
```

Al iniciar dos partidas con esa misma semilla, ambas obtendrán los mismos valores **si consumen la secuencia en el mismo orden**. Una semilla hace que los sorteos sean repetibles; no hace que el juego sea determinista por sí sola ni guarda una partida completa.

### Para qué serviría

- Reproducir un bug o una secuencia difícil de encontrar.
- Comparar builds o estrategias partiendo de condiciones iniciales equivalentes.
- Crear desafíos con una semilla diaria o permitir compartir una partida por su código.
- Hacer pruebas automatizadas sin depender de que aparezcan por azar ciertas cartas, drops o jefes.

### Diseño propuesto

Añadir un generador pequeño y sin dependencias externas, por ejemplo en `js/engine/SeededRandom.js`, y exponerlo desde el estado central de partida. La interfaz mínima debería incluir:

- `next()`: valor decimal en el intervalo `[0, 1)`.
- `int(maxExclusive)`: entero desde `0` hasta `maxExclusive - 1`.
- `range(min, max)`: decimal en el intervalo `[min, max)`.
- `snapshot()` / `restore(snapshot)`: obtener y restaurar el estado interno para continuar una partida guardada.

El algoritmo debe tener una especificación fija y un `algorithmVersion`. Un PRNG entero como Mulberry32 es suficientemente simple para un juego local y permite serializar su estado. No es criptográfico y no debe usarse para seguridad, claves ni recompensas de valor real.

Esquema orientativo, no implementación final:

```js
const rng = new SeededRandom(seed);
const chance = rng.next();
const index = rng.int(cardPool.length);
const spawnX = rng.range(minX, maxX);
```

La semilla debe ser normalizada a una representación estable (por ejemplo, un entero sin signo de 32 bits). Si se aceptan códigos de texto, se deben convertir a ese entero con una función hash estable y documentada; no se debe depender del `hashCode` implícito de un entorno.

### Separar azar de juego y azar visual

Conviene mantener dos secuencias independientes, inicializadas a partir de la semilla principal y un nombre de flujo estable:

- **Gameplay RNG:** sorteos que cambian el resultado de la partida: aparición y tipo de enemigos, patrones de jefes, críticos, drops, selección de cartas y otros efectos con consecuencias.
- **Presentation RNG:** variaciones sin efecto en el resultado: dispersión de partículas, confeti y pitch aleatorio de efectos de audio.

La segunda secuencia evita que agregar una partícula consuma un número que después cambiaría el drop o el próximo enemigo. Los nombres de los flujos y la forma de derivar sus semillas deben permanecer estables dentro de cada versión del algoritmo.

Para cada llamada existente a `Math.random()` hay que decidir y documentar a cuál flujo pertenece. No se debe reemplazar `Math.random` globalmente: eso ocultaría dependencias y permitiría que una llamada de interfaz altere el orden de sorteos del gameplay.

### Cuándo se crea, comparte y guarda

1. **Partida nueva:** crear una semilla una sola vez, normalmente con `crypto.getRandomValues()`. Si se desea poder compartirla, mostrarla en la interfaz y permitir copiarla o introducir otra. Una semilla predeterminada debe generarse antes de crear enemigos, jugador u objetos de la partida.
2. **Inicialización:** reiniciar los flujos PRNG desde esa semilla antes de ejecutar cualquier lógica aleatoria. Un reinicio con la misma semilla empieza desde el principio de las secuencias.
3. **Guardado:** `SaveManager` debe guardar, como mínimo, la semilla, la versión del algoritmo y el snapshot del flujo de gameplay. Si se quiere reproducir exactamente también la presentación después de reanudar, guardar su snapshot por separado.
4. **Reanudación:** reconstruir el PRNG con la versión indicada y restaurar sus estados antes de instanciar o actualizar entidades. Si se restaura el estado demasiado tarde, los constructores podrían consumir números y desalinear la secuencia.
5. **Guardados antiguos:** si no tienen semilla ni snapshot, cargarlos en modo no reproducible con el comportamiento actual. No se debe inventar una semilla y presentarla como si pudiera repetir la parte ya jugada.

Un snapshot contiene el estado actual del generador, que normalmente ya avanzó muchos valores. Guardar solo la semilla al continuar una partida volvería al principio de la secuencia y repetiría sorteos que ya ocurrieron.

### Alcance y límites del determinismo

La primera entrega debería ofrecer una partida repetible desde el inicio y restaurar correctamente el flujo al reanudar. Una reproducción completa de una partida también requeriría registrar entradas del jugador, orden de simulación y otros estados. Como el juego actual actualiza usando `requestAnimationFrame` y `dt`, la misma secuencia de números aleatorios no garantiza por sí sola posiciones idénticas en cada frame si cambia el ritmo de actualización, el navegador o la versión del código.

Las semillas tampoco tienen que conservar el mismo resultado entre versiones distintas del juego. Cambiar el algoritmo, añadir una llamada aleatoria o reordenar decisiones puede cambiar qué evento recibe cada número de la secuencia. Para diagnósticos compartidos se deben registrar juntos la semilla, la versión del algoritmo y la versión/build del juego.

### Plan de implementación

1. **Inventariar los sorteos:** agrupar las llamadas actuales a `Math.random()` por módulo y marcar cada una como gameplay o presentación. No migrar llamadas a medias dentro de un mismo flujo crítico.
2. **Crear y probar el PRNG:** agregar pruebas para la secuencia conocida del algoritmo, valores dentro de rango, `int()` sin sesgo evidente en sus límites, reinicio con la misma semilla y restauración de snapshots.
3. **Conectar el estado de partida:** inicializar los flujos al empezar una partida, antes de crear entidades; mantener separado el ciclo de vida del PRNG del resto de la UI.
4. **Migrar por grupos:** oleadas/spawns y comportamiento de jefes; drops y críticos; cartas/recompensas; por último, partículas y audio. Cada grupo debe usar explícitamente el flujo correcto.
5. **Integrar guardado y reanudación:** ampliar el formato guardado con versión, semilla y snapshots; admitir guardados antiguos sin romperlos.
6. **Añadir interfaz solo si se desea compartir semillas:** mostrar el código en pausa o fin de partida, ofrecer copiarlo y permitir ingresar una semilla al comenzar. Las partidas normales pueden seguir generando una semilla al azar.
7. **Validar en navegador:** jugar dos partidas nuevas con la misma semilla y comprobar una lista definida de eventos de gameplay; cambiar una semilla y comprobar que cambien; guardar/reanudar y verificar que la secuencia continúe desde el snapshot.

### Criterios de aceptación

- La misma semilla y la misma versión generan el mismo orden de resultados aleatorios de gameplay cuando el orden de simulación es el mismo.
- La actividad visual o los sonidos no alteran los sorteos del gameplay.
- Reiniciar con una semilla conocida vuelve al comienzo de sus secuencias.
- Reanudar restaura el estado del PRNG y no repite los sorteos previos.
- Los guardados anteriores a esta mejora siguen cargando.
- Las pruebas de PRNG son deterministas y no dependen de probabilidades estadísticas frágiles.

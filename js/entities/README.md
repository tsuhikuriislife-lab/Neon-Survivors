# Entities Layer (`js/entities/`)

## Propósito de la capa
La capa `entities` define a todos los "actores" u objetos que existen en el mundo del juego: el jugador, los enemigos, los jefes, los proyectiles, ítems recolectables y efectos visuales. Cada archivo define clases con su propia lógica de movimiento, dibujo y recepción de daño.

## Archivos en esta capa

### 1. `Player.js`
Define a la nave/núcleo que controla el usuario.
**Qué hace:** Administra la vida, nivel, experiencia, movimiento y la lógica de disparo de todas las armas del jugador.
**Funciones principales:** `update()`, `fireBlaster()`, `updateOrbitals()`, `takeDamage()`, `gainXP()`, `levelUp()`, `resetUpgrades()`, `draw()`.
**¿Qué puedo cambiar aquí?**
- **Estadísticas base:** En el `constructor`, puedes alterar `baseSpeed` (velocidad), `maxHp` (vida), `pickupRadius` (radio para agarrar gemas).
- **Armas iniciales:** En `this.weapons` puedes cambiar el daño (`damage`), velocidad de disparo (`cooldown`), rango, etc., de las armas por defecto (Blaster, Orbitals, Nova, Missiles).

### 2. `Enemy.js`
Define los enemigos comunes que aparecen en oleadas.
**Qué hace:** Maneja los comportamientos de enemigos de tipo 'small', 'medium' y 'large'. Persiguen al jugador y sueltan gemas al morir.
**Funciones principales:** `update()`, `takeDamage()`, `die()`, `draw()`.
**¿Qué puedo cambiar aquí?**
- **Atributos por tipo:** Dentro del `constructor`, puedes cambiar el `radius` (tamaño), `speed` (velocidad de persecución), `maxHp` (vida base más su escalado por tiempo), `damage` (daño que causan) y `color`.

### 3. `Bosses.js`
Contiene las clases para los jefes mayores del juego.
**Qué hace:** Define patrones de ataque complejos, fases y movimientos para `KyrenBoss`, `DenzelBoss`, `DevourerOfTaxBoss`, `CarlosMinion`, `SebastianMinion` y la jerarquía de `Amalgam`.
**Funciones principales:** `update()`, `takeDamage()`, `split()`, `draw()`.
**¿Qué puedo cambiar aquí?**
- **Vida y Daño:** En los constructores de cada jefe puedes ajustar `maxHp`. Al invocar `player.takeDamage()` dentro del `update` puedes cambiar el daño por colisión.
- **Fases/Tamaño:** Puedes modificar el tamaño (`radius`) y a qué porcentaje de vida se dividen (ej. `if (this.hp <= this.maxHp * 0.5)` cambia la transición de fase). En *Devourer of Tax* puedes modificar `segmentCount` para hacerlo más corto/largo.

### 4. `Projectiles.js`
Almacena todos los tipos de proyectiles (municiones).
**Qué hace:** Maneja la trayectoria y tiempo de vida de láseres, misiles, nova, shockwaves y proyectiles enemigos.
**Clases principales:** `Projectile` (básico y rastreador), `AcceleratingProjectile`, `FallingProjectile`, `Shockwave`, `NovaProjectile` (con opción a espiral), `MissileProjectile` (con daño en área).
**¿Qué puedo cambiar aquí?**
- **Vida útil/Alcance:** Puedes cambiar la variable `life` en los constructores para que los disparos lleguen más lejos o desaparezcan antes.
- **Rastreo:** Para `Projectile` y `MissileProjectile`, se puede ajustar la lógica de `homingStrength` para que persigan más rápido o más lento.

### 5. `Effects.js`
Maneja partículas decorativas, zonas de peligro y textos flotantes (números de daño).
**Qué hace:** Añade jugosidad (game feel) al juego.
**Clases principales:** `Particle`, `FloatingText`, `HazardArea`.
**¿Qué puedo cambiar aquí?**
- En `FloatingText` puedes cambiar el comportamiento para que los números de daño floten más rápido o desaparezcan más lento (modificando `alpha` y `vy`).

### 6. `Collectibles.js`
Ítems que el jugador puede agarrar.
**Qué hace:** Actualmente define la clase `Gem` (las bolitas de XP).
**¿Qué puedo cambiar aquí?**
- La velocidad a la que la gema es atraída hacia el jugador (`speed = 7.5;` en `update`) y los colores dependiendo de su valor de XP.


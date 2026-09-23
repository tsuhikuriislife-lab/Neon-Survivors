# Data Layer (`js/data/`)

## Propósito de la capa
La capa `data` se encarga de almacenar información estática, configuraciones y diccionarios de datos que el juego consume para funcionar. Mantener esta información separada de la lógica principal facilita el balanceo del juego y la adición de nuevo contenido sin tener que modificar los sistemas internos.

## Archivos en esta capa

### `upgrades.js`
Este archivo contiene la base de datos de todas las mejoras (upgrades) que el jugador puede elegir al subir de nivel.

**Funciones / Estructuras principales:**
- `upgradeDatabase`: Un arreglo de objetos, donde cada objeto representa una mejora.

**Estructura de una mejora (Cosas que se pueden cambiar):**
Cada mejora tiene la siguiente estructura que puedes modificar fácilmente:
- `id`: Identificador único de la mejora.
- `name`: Nombre en inglés que se muestra en la interfaz (ej. 'Vector Thrusters', 'Multi-Laser Fire Rate').
- `icon`: Emoji o ícono representativo.
- `desc`: Descripción de lo que hace la mejora.
- `maxCount`: Máximo de cartas que se pueden obtener. Si se omite, no hay límite de cartas. El conteo se lleva en `player.acquiredUpgrades` y lo consultan las vistas y el sistema de disponibilidad.
- `isAvailable(p)`: Función opcional para requisitos propios de juego (por ejemplo, desbloquear primero un arma). Los topes generales van en `maxCount`.
- `apply(p)`: Función que se ejecuta cuando el jugador selecciona la mejora. **Aquí puedes cambiar cuánto beneficia la mejora al jugador** (ej. cambiar `p.weapons.blaster.projectileCount += 1` a `+= 2`).

**¿Qué puedo cambiar aquí?**
- **Añadir nuevas mejoras:** Simplemente agrega un nuevo objeto al array `upgradeDatabase`.
- **Modificar estadísticas:** Cambiar porcentajes de daño (`p.damageMult`), radio de recolección (`p.pickupRadius`), velocidad, etc., ajustando los números dentro de cada función `apply()`.
- **Limitar mejoras:** Configurar `maxCount`; usar `isAvailable` para requisitos particulares.


**Nuevas Propiedades Añadidas:**
- `rarity`: Define la probabilidad de aparición de la carta (`common`: 60%, `uncommon`: 20%, `rare`: 15%, `legendary`: 5%).
- `isInfinite`: Indica que la carta pertenece a la categoría de mejoras infinitas; no debe usarse como sustituto de `maxCount`.
- `upgradeUtils.js`: API compartida para leer conteo/máximo, comprobar disponibilidad y conceder una carta registrándola una sola vez. Los flujos de nivel, recompensas, administración y pruebas usan esta API.

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
- `isAvailable(p)`: Función opcional que determina si la mejora puede aparecer en las opciones de subida de nivel. Se usa para establecer límites (ej. máximo 4 niveles). **Aquí puedes cambiar los topes máximos modificando el número en la condición.**
- `apply(p)`: Función que se ejecuta cuando el jugador selecciona la mejora. **Aquí puedes cambiar cuánto beneficia la mejora al jugador** (ej. cambiar `p.weapons.blaster.projectileCount += 1` a `+= 2`).

**¿Qué puedo cambiar aquí?**
- **Añadir nuevas mejoras:** Simplemente agrega un nuevo objeto al array `upgradeDatabase`.
- **Modificar estadísticas:** Cambiar porcentajes de daño (`p.damageMult`), radio de recolección (`p.pickupRadius`), velocidad, etc., ajustando los números dentro de cada función `apply()`.
- **Limitar mejoras:** Modificar la función `isAvailable` para aumentar o reducir la cantidad de veces que una mejora puede ser adquirida.


**Nuevas Propiedades Añadidas:**
- `rarity`: Define la probabilidad de aparición de la carta (`common`: 60%, `uncommon`: 20%, `rare`: 15%, `legendary`: 5%).
- `isInfinite`: Bandera (`true` o `false`) que indica si la mejora no tiene un tope máximo. El botón de Test Rápido ignora estas cartas para evitar congelar el juego.

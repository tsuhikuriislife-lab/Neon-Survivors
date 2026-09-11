---
name: crear-arma-mejora
description: Guía paso a paso para añadir nuevas armas, habilidades y mejoras en Neon Survivors. Úsala cuando el usuario pida un nuevo poder para el jugador.
---

# Guía: Crear Nueva Arma o Mejora

1. **Base de Datos de Mejoras (`js/data/upgrades.js`)**:
   - Añade el objeto de la mejora.
   - Configura su rareza (`common`, `uncommon`, `rare`, `legendary`).
   - Si tiene un límite (cap), define una función `isAvailable` referenciando el estado en `Player.js`. Si es "infinita" tras llegar al límite máximo, usa `isInfinite: true`.

2. **Precarga de Iconos (`js/engine/TextureCache.js` o `main.js`)**:
   - Asegúrate de que su PNG (`assets/upgrades/nombre.png`) se añada a la función de precarga `preloadedUpgradeImages` para que no se muestren iconos rotos en dispositivos móviles offline.

3. **Lógica de Disparo (`js/entities/Player.js`)**:
   - Implementa la mecánica en el loop `update()` o en métodos de disparo específicos.
   - Si lanza proyectiles, utiliza SIEMPRE el pool de objetos en `Pool.js` (ej. `PooledProjectile`) para evitar Garbage Collection (GC) durante el gameplay.
   - Aplica el **Sistema de Daño Multiplicativo**: `Daño Base * Multiplicador del Arma * Multiplicador Global * Bonus de Escudo * Crítico`.

4. **Entidad del Proyectil (`js/entities/Projectiles.js`)**:
   - Si requiere un proyectil único, extiéndelo aquí (ej. `NovaProjectile`, `MissileProjectile`).
   - Configura su partícula de rastro si aplica (emisión cero-GC vinculada a los pools de partículas).

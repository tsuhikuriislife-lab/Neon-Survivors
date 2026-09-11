---
name: optimizacion-60fps
description: Checklist obligatorio de rendimiento, evitar el GC (Garbage Collector) y reglas del DOM para mantener los 60 FPS estables.
---

# Guía: Rendimiento y Optimización a 60 FPS

1. **Prohibido Textos Canvas por CPU**:
   - **NUNCA** utilices `PIXI.Text` genérico para números de daño en tiempo real o elementos de UI intensivos. Provoca repintados pesados y pausas del GC.
   - Utiliza **SIEMPRE** el `FloatingTextPool` apoyado por web-fonts cacheadas (`PIXI.BitmapText`).

2. **UI Dirty Checking y DOM Throttling**:
   - **NUNCA** actualices estilos o `innerHTML` del DOM (`UIManager.js`) sin verificación condicional.
   - Si vas a mostrar o alterar barras de vida de jefes, HUD o paneles de debug, consulta los signatures en `_uiCache`. Tocar el DOM en cada iteración del bucle `requestAnimationFrame` destrozará los FPS móviles.

3. **Memory Leaks de WebGL y Audio**:
   - Elimina entidades muertas empleando la función `destroyEntity()` (la cual llama al `.destroy()` local). 
   - Debes aplicar siempre `this.container.destroy({ children: true })` para desvincular recursos. 
   - No dejes variables de AudioNode referenciadas cuando reinicias una partida (`state.reset()`).

4. **Procedural Geometry Batches**:
   - No instancies arrays dinámicos grandes (`new Float32Array()`) dentro de loops. 
   - Reusa buffers estáticos o utiliza el sistema `ProceduralBatchRenderer` ya estructurado para renderizar masivamente sin agotar la memoria.

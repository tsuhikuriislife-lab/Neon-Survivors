---
name: documentacion-codigo
description: Reglas estrictas para documentar y comentar el código generado o modificado, asegurando que cada línea compleja sea explicada de forma didáctica.
---

# Guía: Documentación de Código Didáctica

Todo código nuevo o bloque modificado por el agente debe incluir comentarios claros que expliquen QUÉ hace y POR QUÉ lo hace, priorizando el entendimiento del usuario humano.

1. **JSDoc en Clases y Funciones**:
   - Cada clase, método importante o función debe incluir un bloque de comentario superior indicando su propósito, sus parámetros (`@param`) y su retorno (`@returns`).

2. **Comentarios Inline Didácticos**:
   - En lógicas matemáticas, cálculos de vectores, o algoritmos complejos (ej. fórmulas de rebote, aceleraciones), debes poner un comentario en la línea anterior explicando qué significa la fórmula.
   - *Ejemplo*:
     ```javascript
     // Calculamos el vector de dirección normalizado (longitud 1) hacia el jugador
     const dx = player.x - this.x;
     const dy = player.y - this.y;
     const dist = Math.hypot(dx, dy);
     ```

3. **Evitar Comentarios Obvios**:
   - No comentes código que se explica por sí solo. 
   - *Mal*: `let x = 5; // Asigna 5 a x`.
   - *Bien*: `let hitCooldown = 30; // 30 frames de gracia para evitar daño instakill`.

4. **Explicación del "Por qué" (Rationale)**:
   - Si se usa un número mágico (ej. `0.22`, `1.75x`), se debe comentar de dónde sale (ej. "Límite superior para el escalado de velocidad a los 30 min").

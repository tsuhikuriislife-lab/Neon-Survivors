---
name: crear-enemigo
description: Flujo de trabajo para añadir enemigos comunes o swarmers en Neon Survivors.
---

# Guía: Crear Enemigo Común / Swarmer

1. **Clases Entidad (`js/entities/Enemy.js` o `SwarmerEnemy.js`)**:
   - Define su comportamiento principal.
   - Para *Swarmers*: Si realizan ataques de carga de lado a lado, deben autodestruirse silenciosamente (`this.destroy()`) al salir completamente del mapa (`x, y < -80` o `> 1920 + 80`) para liberar memoria gráfica.

2. **Registro Automático (`js/data/enemyRegistry.js`)**:
   - Regístralo con sus estadísticas base. No los inyectes manualmente (hardcoded) en la UI, el registro alimenta automáticamente el Grid de Spawns.

3. **Regla Estricta Visual: Proyectiles Enemigos**:
   - TODOS los proyectiles, ataques de área, humos o ácido soltados por los enemigos DEBEN SER estrictamente ROJOS (`#ff0000`). Se eliminó el soporte de texturas cian/verdes para hostiles con el fin de maximizar el contraste frente a las armas del jugador.

4. **Pacing y Escalado (30 Minutos)**:
   - Usa atributos estadísticos base, no los infles manualmente de manera desproporcionada. El `WaveManager.js` aplicará automáticamente multiplicadores de HP (hasta 5.0x) y velocidad/daño (hasta 1.75x) a lo largo de los 1800 segundos de partida.

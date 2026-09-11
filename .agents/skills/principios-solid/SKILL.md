---
name: principios-solid
description: Obliga a planificar y estructurar las soluciones aplicando los principios SOLID antes de escribir o modificar código. Úsala al refactorizar o diseñar nuevas lógicas.
---

# Guía: Estructuración SOLID

Antes de realizar cambios masivos o diseñar nuevas características, el agente debe estructurar mentalmente (o en el plan) la solución utilizando los 5 principios SOLID:

1. **(S) Single Responsibility (Responsabilidad Única)**:
   - ¿Esta clase o módulo hace solo una cosa? 
   - *Ejemplo*: `WaveManager` no debe encargarse de renderizar los gráficos de la interfaz; solo de la lógica de oleadas.

2. **(O) Open/Closed (Abierto/Cerrado)**:
   - El código debe estar abierto a extensión, pero cerrado a modificación.
   - *Ejemplo*: En lugar de llenar un `switch` gigante en `Enemy.js` para cada tipo de enemigo, crea clases que extiendan de `Enemy` (ej. `SwarmerEnemy`) para que se inyecten dinámicamente.

3. **(L) Liskov Substitution (Sustitución de Liskov)**:
   - Las subclases deben comportarse de forma esperada sin romper el programa si reemplazan a su clase base.
   - *Ejemplo*: Si se crea un nuevo `MissileProjectile` que extiende de `Projectile`, debe poder ser llamado por `pool.update()` sin requerir condicionales especiales.

4. **(I) Interface Segregation (Segregación de Interfaces)**:
   - En JS (sin interfaces estrictas), esto significa no obligar a los objetos a tener métodos que no usan. Prefiere la composición en lugar de herencias masivas si un objeto no necesita todo.

5. **(D) Dependency Inversion (Inversión de Dependencias)**:
   - Los módulos de alto nivel no deben depender de los de bajo nivel. 
   - *Ejemplo*: Usa inyección de dependencias pasándole la instancia global (`state`) a las entidades, en vez de que las entidades intenten crear u obtener instancias cruzadas de otros managers.

**ACCIÓN OBLIGATORIA:** Al proponer una solución arquitectónica compleja, el agente debe escribir un breve paso en su pensamiento o respuesta validando cómo su solución respeta SOLID.

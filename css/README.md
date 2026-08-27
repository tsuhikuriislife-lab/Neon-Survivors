# CSS Layer (`css/`)

## Propósito de la capa
Esta carpeta contiene todos los estilos visuales que no se dibujan dentro del Canvas del juego. Sirve para darle formato, colores, tipografías y efectos a los menús, textos flotantes y ventanas superpuestas (HUD).

## Archivos en esta capa

### `styles.css`
Es el archivo principal y único (hasta el momento) de hojas de estilo en cascada. 

**Qué hace:** 
Define el diseño de temática "Neón" o "Cyberpunk" para la interfaz de usuario de "Neon Survivors".

**Estructuras principales y qué se puede cambiar:**
- **Variables Globales (`:root`):** Contiene variables para colores como `--neon-blue`, `--neon-pink`, `--bg-dark`. **Cambiando estos colores base puedes transformar toda la paleta de colores del juego en un solo lugar.**
- **Fuentes:** Importa la fuente `Orbitron` desde Google Fonts, la cual le da ese toque futurista al juego.
- **Botones y Modales:** Tiene animaciones personalizadas (como efectos de hover que iluminan los botones) para las tarjetas de mejora y los menús de administrador.
- **HUD y Barras de Vida:** Da estilo a las barras de progreso usando transiciones suaves para que la vida y la XP no bajen o suban de golpe.

**Cosas comunes para modificar:**
Si quieres hacer los botones más grandes, cambiar la opacidad de los menús (fondo semitransparente) o ajustar dónde se posicionan las cosas en la pantalla (como la barra de jefes), los cambios se realizan directamente en las clases de este archivo, sin tocar la lógica en JavaScript.


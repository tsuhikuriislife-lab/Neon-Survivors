export const keys = {};
export const mouse = { x: 0, y: 0, down: false };

export function initInput() {
  window.addEventListener("keydown", (e) => { 
    keys[e.key.toLowerCase()] = true; 
  });
  
  window.addEventListener("keyup", (e) => { 
    keys[e.key.toLowerCase()] = false; 
  });

  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  window.addEventListener("mousedown", (e) => {
    if (e.button === 0) mouse.down = true;
  });

  window.addEventListener("mouseup", (e) => {
    if (e.button === 0) mouse.down = false;
  });
}


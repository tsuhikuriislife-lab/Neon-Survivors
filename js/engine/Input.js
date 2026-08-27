export const keys = {};

export function initInput() {
  window.addEventListener("keydown", (e) => { 
    keys[e.key.toLowerCase()] = true; 
  });
  
  window.addEventListener("keyup", (e) => { 
    keys[e.key.toLowerCase()] = false; 
  });
}


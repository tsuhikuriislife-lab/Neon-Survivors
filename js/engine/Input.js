import { state } from './gameState.js';
import { audioManager } from './AudioManager.js';

export const keys = {};
export const mouse = { 
  clientX: typeof window !== 'undefined' ? window.innerWidth / 2 : 0, 
  clientY: typeof window !== 'undefined' ? window.innerHeight / 2 : 0, 
  down: false, 
  justReleased: false,
  get x() {
    return screenToWorld(this.clientX, this.clientY).x;
  },
  get y() {
    return screenToWorld(this.clientX, this.clientY).y;
  }
};

export const joystick = {
  active: false,
  id: null,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  dx: 0,
  dy: 0,
  maxRadius: 60
};

export const aimInput = {
  active: false,
  id: null,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  angle: 0,
  norm: 0,
  justReleased: false,
  hasDragged: false,
  hasTestedAimJoystick: false,
  isOverCancelZone: false
};

export function getVirtualCoords(clientX, clientY) {
  const canvas = document.querySelector("#game-container canvas");
  if (!canvas) return { x: clientX, y: clientY };
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return { x: clientX, y: clientY };

  const curWidth = canvas.width || 1920;
  const curHeight = canvas.height || 1080;

  return {
    x: (clientX - rect.left) * (curWidth / rect.width),
    y: (clientY - rect.top) * (curHeight / rect.height)
  };
}

export function screenToWorld(clientX, clientY) {
  const v = getVirtualCoords(clientX, clientY);
  const cam = state.camera || { x: 960, y: 960, userZoom: 1, currentZoomFactor: 1, screenWidth: 1920, screenHeight: 1080 };
  const zoom = (cam.userZoom || 1) * (cam.currentZoomFactor || 1);
  const sw = cam.screenWidth || 1920;
  const sh = cam.screenHeight || 1080;

  // Inverse of: layer.x = sw/2 - camX * zoom, layer.y = sh/2 - camY * zoom
  // worldX = (screenX - sw/2) / zoom + camX
  return {
    x: (v.x - sw / 2) / zoom + cam.x,
    y: (v.y - sh / 2) / zoom + cam.y
  };
}

export function getMovementVector() {
  if (state.isInMenu) return { dx: 0, dy: 0 };

  let dx = 0;
  let dy = 0;

  if (keys['w'] || keys['arrowup']) dy -= 1;
  if (keys['s'] || keys['arrowdown']) dy += 1;
  if (keys['a'] || keys['arrowleft']) dx -= 1;
  if (keys['d'] || keys['arrowright']) dx += 1;

  if (dx !== 0 && dy !== 0) {
    dx *= 0.7071;
    dy *= 0.7071;
  }

  if (joystick.active) {
    dx += joystick.dx;
    dy += joystick.dy;
    const mag = Math.hypot(dx, dy);
    if (mag > 1) {
      dx /= mag;
      dy /= mag;
    }
  }

  return { dx, dy };
}

export function updateJoystickUI() {
  const base = document.getElementById('virtual-joystick-base');
  const knob = document.getElementById('virtual-joystick-knob');
  if (!base || !knob) return;

  const cam = state.camera || { screenWidth: 1920, screenHeight: 1080 };
  const sw = cam.screenWidth || 1920;
  const sh = cam.screenHeight || 1080;

  if (joystick.active) {
    base.style.display = 'block';
    base.style.left = `${(joystick.startX / sw) * 100}%`;
    base.style.top = `${(joystick.startY / sh) * 100}%`;
    knob.style.display = 'block';
    knob.style.left = `calc(50% + ${joystick.dx * 35}%)`;
    knob.style.top = `calc(50% + ${joystick.dy * 35}%)`;
  } else {
    base.style.display = 'none';
    knob.style.display = 'none';
  }
}

export function updateAimJoystickUI() {
  const base = document.getElementById('virtual-aim-joystick-base');
  const knob = document.getElementById('virtual-aim-joystick-knob');
  const cancelZone = document.getElementById('laser-cancel-zone');
  if (!base || !knob) return;

  const cam = state.camera || { screenWidth: 1920, screenHeight: 1080 };
  const sw = cam.screenWidth || 1920;
  const sh = cam.screenHeight || 1080;

  const hasLaser = state.player && state.player.weapons && state.player.weapons.laserCannon && state.player.weapons.laserCannon.level > 0;
  const isTouchDevice = ('ontouchstart' in window) || (navigator && navigator.maxTouchPoints > 0);

  if (state.isInMenu || !hasLaser) {
    base.style.display = 'none';
    knob.style.display = 'none';
    base.classList.remove('guide-prompt');
    if (cancelZone) {
      cancelZone.style.display = 'none';
      cancelZone.classList.remove('active-hover');
    }
    return;
  }

  // Laser Cannon is unlocked:
  if (aimInput.id !== null && aimInput.hasDragged) {
    base.style.display = 'block';
    base.classList.remove('guide-prompt');
    base.style.left = `${(aimInput.startX / sw) * 100}%`;
    base.style.top = `${(aimInput.startY / sh) * 100}%`;
    knob.style.display = 'block';
    const offsetX = Math.cos(aimInput.angle) * (aimInput.norm || 1) * 35;
    const offsetY = Math.sin(aimInput.angle) * (aimInput.norm || 1) * 35;
    knob.style.left = `calc(50% + ${offsetX}%)`;
    knob.style.top = `calc(50% + ${offsetY}%)`;

    if (cancelZone && isTouchDevice) {
      cancelZone.style.display = 'flex';
    }
  } else if (!aimInput.hasTestedAimJoystick && isTouchDevice) {
    // Show static guide prompt so mobile player sees that aiming joystick is available
    base.style.display = 'block';
    base.classList.add('guide-prompt');
    base.style.left = '80%';
    base.style.top = '68%';
    knob.style.display = 'block';
    knob.style.left = '50%';
    knob.style.top = '50%';

    if (cancelZone) {
      cancelZone.style.display = 'none';
      cancelZone.classList.remove('active-hover');
    }
  } else {
    base.style.display = 'none';
    knob.style.display = 'none';
    base.classList.remove('guide-prompt');

    if (cancelZone) {
      cancelZone.style.display = 'none';
      cancelZone.classList.remove('active-hover');
    }
  }
}

export function cancelAiming() {
  mouse.down = false;
  mouse.justReleased = false;

  aimInput.active = false;
  aimInput.justReleased = false;
  aimInput.id = null;
  aimInput.hasDragged = false;
  aimInput.norm = 0;
  aimInput.isOverCancelZone = false;

  if (state.camera && typeof state.camera.setAimOffset === 'function') {
    state.camera.setAimOffset(0, 0);
  }

  const cancelZone = document.getElementById('laser-cancel-zone');
  if (cancelZone) {
    cancelZone.classList.remove('active-hover');
    cancelZone.style.display = 'none';
  }

  updateAimJoystickUI();
}

export function resetInputState() {
  cancelAiming();
  mouse.clientX = typeof window !== 'undefined' ? window.innerWidth / 2 : 0;
  mouse.clientY = typeof window !== 'undefined' ? window.innerHeight / 2 : 0;
  aimInput.hasTestedAimJoystick = false;

  joystick.active = false;
  joystick.id = null;
  joystick.dx = 0;
  joystick.dy = 0;

  updateJoystickUI();
  updateAimJoystickUI();
}

export function initInput() {
  // --- KEYBOARD ---
  window.addEventListener("keydown", (e) => { 
    keys[e.key.toLowerCase()] = true; 
  });
  
  window.addEventListener("keyup", (e) => { 
    keys[e.key.toLowerCase()] = false; 
  });

  // --- MOUSE (DESKTOP) ---
  window.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    if (mouse.down) {
      cancelAiming();
      audioManager.playSound('click', { volume: 0.4, throttleMs: 50 });
    }
  });

  window.addEventListener("mousemove", (e) => {
    mouse.clientX = e.clientX;
    mouse.clientY = e.clientY;
  });

  window.addEventListener("mousedown", (e) => {
    if (state.isInMenu) return;
    if (e.target.closest('#pause-btn, .pause-btn, #options-btn, #quick-test-btn, .modal-overlay, #start-screen-overlay, button, input, .card, #activeSkillHud, #testing-panel')) {
      return;
    }
    if (e.button === 2) {
      // Right Click: Cancel aiming immediately
      if (mouse.down) {
        cancelAiming();
        audioManager.playSound('click', { volume: 0.4, throttleMs: 50 });
      }
      return;
    }
    if (e.button === 0) {
      mouse.clientX = e.clientX;
      mouse.clientY = e.clientY;
      mouse.down = true;
    }
  });

  window.addEventListener("mouseup", (e) => {
    if (state.isInMenu) return;
    if (e.button === 0) {
      mouse.clientX = e.clientX;
      mouse.clientY = e.clientY;
      if (mouse.down) {
        mouse.justReleased = true;
      }
      mouse.down = false;
    }
  });

  // --- TOUCH (MOBILE) ---
  const isInteractiveElement = (target) => {
    return !!target.closest('#pause-btn, .pause-btn, #options-btn, #quick-test-btn, .modal-overlay, #start-screen-overlay, button, input, .card, #activeSkillHud, #testing-panel');
  };

  window.addEventListener("touchstart", (e) => {
    if (state.isInMenu) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (isInteractiveElement(touch.target)) continue;

      const v = getVirtualCoords(touch.clientX, touch.clientY);
      const cam = state.camera || { screenWidth: 1920 };
      const screenMidX = (cam.screenWidth || 1920) / 2;

      // Left half (Virtual Movement Joystick)
      if (v.x < screenMidX && joystick.id === null) {
        joystick.id = touch.identifier;
        joystick.startX = v.x;
        joystick.startY = v.y;
        joystick.currentX = v.x;
        joystick.currentY = v.y;
        joystick.dx = 0;
        joystick.dy = 0;
        joystick.active = true;
        updateJoystickUI();
      } 
      // Right half (Relative Swipe Aiming & Firing - Requires Laser Cannon)
      else if (v.x >= screenMidX && aimInput.id === null) {
        const hasLaser = state.player && state.player.weapons && state.player.weapons.laserCannon && state.player.weapons.laserCannon.level > 0;
        if (!hasLaser) {
          continue;
        }

        aimInput.id = touch.identifier;
        aimInput.startX = v.x;
        aimInput.startY = v.y;
        aimInput.currentX = v.x;
        aimInput.currentY = v.y;
        aimInput.norm = 0;
        aimInput.active = false;
        aimInput.hasDragged = false;
        aimInput.isOverCancelZone = false;
        updateAimJoystickUI();
      }
    }
  }, { passive: false });

  window.addEventListener("touchmove", (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const v = getVirtualCoords(touch.clientX, touch.clientY);

      // Update Movement Joystick
      if (touch.identifier === joystick.id) {
        const deltaX = v.x - joystick.startX;
        const deltaY = v.y - joystick.startY;
        const distance = Math.hypot(deltaX, deltaY);

        if (distance > 0) {
          const clampedDist = Math.min(distance, joystick.maxRadius);
          const angle = Math.atan2(deltaY, deltaX);
          joystick.currentX = joystick.startX + Math.cos(angle) * clampedDist;
          joystick.currentY = joystick.startY + Math.sin(angle) * clampedDist;
          joystick.dx = (Math.cos(angle) * clampedDist) / joystick.maxRadius;
          joystick.dy = (Math.sin(angle) * clampedDist) / joystick.maxRadius;
        } else {
          joystick.currentX = joystick.startX;
          joystick.currentY = joystick.startY;
          joystick.dx = 0;
          joystick.dy = 0;
        }
        updateJoystickUI();
      }

      // Update Aiming Joystick via relative drag vector
      if (touch.identifier === aimInput.id) {
        const hasLaser = state.player && state.player.weapons && state.player.weapons.laserCannon && state.player.weapons.laserCannon.level > 0;
        if (!hasLaser) {
          cancelAiming();
          continue;
        }

        // Check distance to cancel zone
        const cancelZone = document.getElementById('laser-cancel-zone');
        if (cancelZone && cancelZone.style.display !== 'none') {
          const rect = cancelZone.getBoundingClientRect();
          const czCenterX = (rect.left + rect.right) / 2;
          const czCenterY = (rect.top + rect.bottom) / 2;
          const czRadius = Math.max(rect.width, rect.height) / 2 + 18;
          const distToCancel = Math.hypot(touch.clientX - czCenterX, touch.clientY - czCenterY);

          if (distToCancel <= czRadius) {
            cancelZone.classList.add('active-hover');
            aimInput.isOverCancelZone = true;
          } else {
            cancelZone.classList.remove('active-hover');
            aimInput.isOverCancelZone = false;
          }
        }

        const deltaX = v.x - aimInput.startX;
        const deltaY = v.y - aimInput.startY;
        const distance = Math.hypot(deltaX, deltaY);

        if (distance >= 8) {
          aimInput.active = true;
          aimInput.hasDragged = true;
          aimInput.hasTestedAimJoystick = true;
          aimInput.angle = Math.atan2(deltaY, deltaX);
          aimInput.norm = Math.min(1.0, distance / 60);
          const clampedDist = Math.min(distance, 60);
          aimInput.currentX = aimInput.startX + Math.cos(aimInput.angle) * clampedDist;
          aimInput.currentY = aimInput.startY + Math.sin(aimInput.angle) * clampedDist;
        } else {
          aimInput.active = false;
          aimInput.hasDragged = false;
          aimInput.norm = 0;
          aimInput.currentX = aimInput.startX;
          aimInput.currentY = aimInput.startY;
        }
        updateAimJoystickUI();
      }
    }
  }, { passive: false });

  const handleTouchEnd = (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];

      if (touch.identifier === joystick.id) {
        joystick.id = null;
        joystick.active = false;
        joystick.dx = 0;
        joystick.dy = 0;
        updateJoystickUI();
      }

      if (touch.identifier === aimInput.id) {
        const wasOverCancel = aimInput.isOverCancelZone;
        aimInput.isOverCancelZone = false;

        const cancelZone = document.getElementById('laser-cancel-zone');
        if (cancelZone) {
          cancelZone.classList.remove('active-hover');
          cancelZone.style.display = 'none';
        }

        if (wasOverCancel) {
          // Cancel shot completely
          cancelAiming();
          audioManager.playSound('click', { volume: 0.4, throttleMs: 50 });
          continue;
        }

        if (aimInput.hasDragged && aimInput.active) {
          aimInput.justReleased = true;
          aimInput.hasTestedAimJoystick = true;
        }
        aimInput.active = false;
        aimInput.id = null;
        aimInput.hasDragged = false;
        aimInput.norm = 0;
        updateAimJoystickUI();
      }
    }
  };

  window.addEventListener("touchend", handleTouchEnd, { passive: false });
  window.addEventListener("touchcancel", handleTouchEnd, { passive: false });
}

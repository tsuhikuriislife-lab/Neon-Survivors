import { state } from './gameState.js';

export const keys = {};
export const mouse = { x: 0, y: 0, down: false, justReleased: false };

export const joystick = {
  active: false,
  id: null,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  dx: 0,
  dy: 0,
  maxRadius: 50
};

export const aimInput = {
  active: false,
  id: null,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  angle: 0,
  justReleased: false,
  hasDragged: false
};

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

export function screenToWorld(screenX, screenY) {
  const cam = state.camera || { x: 960, y: 540, baseScale: 1, userZoom: 1, screenWidth: window.innerWidth, screenHeight: window.innerHeight };
  const effectiveScale = (cam.baseScale || 1) * (cam.userZoom || 1);
  const screenW = cam.screenWidth || window.innerWidth;
  const screenH = cam.screenHeight || window.innerHeight;
  return {
    x: (screenX - screenW / 2) / effectiveScale + (cam.x || 960),
    y: (screenY - screenH / 2) / effectiveScale + (cam.y || 540)
  };
}

export function updateJoystickUI() {
  const base = document.getElementById('virtual-joystick-base');
  const knob = document.getElementById('virtual-joystick-knob');
  if (!base || !knob) return;

  if (joystick.active) {
    base.style.display = 'block';
    base.style.left = `${joystick.startX}px`;
    base.style.top = `${joystick.startY}px`;
    knob.style.left = `${joystick.currentX}px`;
    knob.style.top = `${joystick.currentY}px`;
  } else {
    base.style.display = 'none';
  }
}

export function updateAimJoystickUI() {
  const base = document.getElementById('virtual-aim-joystick-base');
  const knob = document.getElementById('virtual-aim-joystick-knob');
  if (!base || !knob) return;

  if (aimInput.id !== null && aimInput.hasDragged) {
    base.style.display = 'block';
    base.style.left = `${aimInput.startX}px`;
    base.style.top = `${aimInput.startY}px`;
    knob.style.left = `${aimInput.currentX}px`;
    knob.style.top = `${aimInput.currentY}px`;
  } else {
    base.style.display = 'none';
  }
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
  window.addEventListener("mousemove", (e) => {
    const worldPos = screenToWorld(e.clientX, e.clientY);
    mouse.x = worldPos.x;
    mouse.y = worldPos.y;
  });

  window.addEventListener("mousedown", (e) => {
    if (state.isInMenu) return;
    if (e.target.closest('#options-btn, #quick-test-btn, .modal-overlay, #start-screen-overlay, button, input, .card, #activeSkillHud, #testing-panel')) {
      return;
    }
    if (e.button === 0) {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      mouse.x = worldPos.x;
      mouse.y = worldPos.y;
      mouse.down = true;
    }
  });

  window.addEventListener("mouseup", (e) => {
    if (state.isInMenu) return;
    if (e.button === 0) {
      if (mouse.down) {
        mouse.justReleased = true;
      }
      mouse.down = false;
    }
  });

  // --- TOUCH (MOBILE) ---
  const isInteractiveElement = (target) => {
    return !!target.closest('#options-btn, #quick-test-btn, .modal-overlay, #start-screen-overlay, button, input, .card, #activeSkillHud, #testing-panel');
  };

  window.addEventListener("touchstart", (e) => {
    if (state.isInMenu) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (isInteractiveElement(touch.target)) continue;

      const screenMidX = window.innerWidth / 2;

      // Left half -> Virtual Movement Joystick
      if (touch.clientX < screenMidX && joystick.id === null) {
        joystick.id = touch.identifier;
        joystick.startX = touch.clientX;
        joystick.startY = touch.clientY;
        joystick.currentX = touch.clientX;
        joystick.currentY = touch.clientY;
        joystick.dx = 0;
        joystick.dy = 0;
        joystick.active = true;
        updateJoystickUI();
      } 
      // Right half -> Relative Swipe Aiming & Firing
      else if (touch.clientX >= screenMidX && aimInput.id === null) {
        aimInput.id = touch.identifier;
        aimInput.startX = touch.clientX;
        aimInput.startY = touch.clientY;
        aimInput.currentX = touch.clientX;
        aimInput.currentY = touch.clientY;
        aimInput.active = false;
        aimInput.hasDragged = false;
        updateAimJoystickUI();
      }
    }
  }, { passive: false });

  window.addEventListener("touchmove", (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];

      // Update Movement Joystick
      if (touch.identifier === joystick.id) {
        const deltaX = touch.clientX - joystick.startX;
        const deltaY = touch.clientY - joystick.startY;
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
        const deltaX = touch.clientX - aimInput.startX;
        const deltaY = touch.clientY - aimInput.startY;
        const distance = Math.hypot(deltaX, deltaY);

        if (distance >= 6) {
          aimInput.active = true;
          aimInput.hasDragged = true;
          aimInput.angle = Math.atan2(deltaY, deltaX);
          const clampedDist = Math.min(distance, 50);
          aimInput.currentX = aimInput.startX + Math.cos(aimInput.angle) * clampedDist;
          aimInput.currentY = aimInput.startY + Math.sin(aimInput.angle) * clampedDist;
        } else {
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
        if (aimInput.hasDragged && aimInput.active) {
          aimInput.justReleased = true;
        }
        aimInput.active = false;
        aimInput.id = null;
        aimInput.hasDragged = false;
        updateAimJoystickUI();
      }
    }
  };

  window.addEventListener("touchend", handleTouchEnd, { passive: false });
  window.addEventListener("touchcancel", handleTouchEnd, { passive: false });
}


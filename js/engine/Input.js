import { state } from './gameState.js';

export const keys = {};

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

/** Converts browser client pixels to the fixed virtual canvas coordinate space. */
export function getVirtualCoords(clientX, clientY) {
  const canvas = document.querySelector("#game-container canvas") || document.querySelector("canvas");
  if (!canvas) return { x: clientX, y: clientY };
  const rect = canvas.getBoundingClientRect();
  return {
    x: clientX - (rect.left || 0),
    y: clientY - (rect.top || 0)
  };
}

/** Combines keyboard and virtual joystick movement into a normalized direction vector. */
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
    const magnitude = Math.hypot(dx, dy);
    if (magnitude > 1) {
      dx /= magnitude;
      dy /= magnitude;
    }
  }

  return { dx, dy };
}

/** Updates the movement joystick overlay only when touch movement changes. */
export function updateJoystickUI() {
  const base = document.getElementById('virtual-joystick-base');
  const knob = document.getElementById('virtual-joystick-knob');
  if (!base || !knob) return;

  if (joystick.active) {
    base.style.display = 'block';
    base.style.left = joystick.startX + 'px';
    base.style.top = joystick.startY + 'px';
    knob.style.display = 'block';
    knob.style.left = 'calc(50% + ' + (joystick.dx * 35) + '%)';
    knob.style.top = 'calc(50% + ' + (joystick.dy * 35) + '%)';
  } else {
    base.style.display = 'none';
    knob.style.display = 'none';
  }
}

/** Clears any legacy camera aim offset; the Laser Cannon no longer uses manual aiming. */
export function cancelAiming() {
  if (state.camera && typeof state.camera.setAimOffset === 'function') {
    state.camera.setAimOffset(0, 0);
  }
}

/** Resets movement input when the game pauses, loses focus, or restarts. */
export function resetInputState() {
  cancelAiming();

  joystick.active = false;
  joystick.id = null;
  joystick.dx = 0;
  joystick.dy = 0;

  for (const key in keys) keys[key] = false;

  updateJoystickUI();
}

/**
 * Registers keyboard movement and the mobile movement joystick.
 * @returns {void}
 */
export function initInput() {
  window.addEventListener("blur", resetInputState);

  window.addEventListener("keydown", (event) => {
    keys[event.key.toLowerCase()] = true;

    // Admin Console Toggle
    if (keys['j'] && keys['k'] && keys['l']) {
      if (typeof window.toggleAdminConsole === 'function') {
        window.toggleAdminConsole();
        keys['j'] = false;
        keys['k'] = false;
        keys['l'] = false;
      }
    }
  });

  window.addEventListener("keyup", (event) => {
    keys[event.key.toLowerCase()] = false;
  });

  // Prevent the browser context menu from covering touch-game controls on long press/right click.
  window.addEventListener("contextmenu", (event) => event.preventDefault());

  const isInteractiveElement = (target) => {
    return Boolean(target && target.closest && target.closest(
      '#pause-btn, .pause-btn, #options-btn, #quick-test-btn, .modal-overlay, #start-screen-overlay, button, input, .card, #activeSkillHud, #testing-panel'
    ));
  };

  // Mobile input now reserves only the left half for movement; weapons fire automatically.
  window.addEventListener("touchstart", (event) => {
    if (state.isInMenu) return;

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      if (isInteractiveElement(touch.target) || joystick.id !== null) continue;

      const virtual = getVirtualCoords(touch.clientX, touch.clientY);
      const camera = state.camera || { screenWidth: 1920 };
      const screenMidX = (camera.screenWidth || 1920) / 2;
      if (virtual.x >= screenMidX) continue;

      joystick.id = touch.identifier;
      joystick.startX = virtual.x;
      joystick.startY = virtual.y;
      joystick.currentX = virtual.x;
      joystick.currentY = virtual.y;
      joystick.dx = 0;
      joystick.dy = 0;
      joystick.active = true;
      updateJoystickUI();
    }
  }, { passive: false });

  window.addEventListener("touchmove", (event) => {
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      if (touch.identifier !== joystick.id) continue;

      const virtual = getVirtualCoords(touch.clientX, touch.clientY);
      const deltaX = virtual.x - joystick.startX;
      const deltaY = virtual.y - joystick.startY;
      const distance = Math.hypot(deltaX, deltaY);

      if (distance > 0) {
        const clampedDistance = Math.min(distance, joystick.maxRadius);
        const angle = Math.atan2(deltaY, deltaX);
        joystick.currentX = joystick.startX + Math.cos(angle) * clampedDistance;
        joystick.currentY = joystick.startY + Math.sin(angle) * clampedDistance;
        joystick.dx = (Math.cos(angle) * clampedDistance) / joystick.maxRadius;
        joystick.dy = (Math.sin(angle) * clampedDistance) / joystick.maxRadius;
      } else {
        joystick.currentX = joystick.startX;
        joystick.currentY = joystick.startY;
        joystick.dx = 0;
        joystick.dy = 0;
      }

      updateJoystickUI();
    }
  }, { passive: false });

  const handleTouchEnd = (event) => {
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      if (touch.identifier !== joystick.id) continue;

      joystick.id = null;
      joystick.active = false;
      joystick.dx = 0;
      joystick.dy = 0;
      updateJoystickUI();
    }
  };

  window.addEventListener("touchend", handleTouchEnd, { passive: false });
  window.addEventListener("touchcancel", handleTouchEnd, { passive: false });
}

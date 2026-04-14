import { registerSubsystem } from './registry.js';

// ---------------------------------------------------------------------------
// Tracked keys
// ---------------------------------------------------------------------------
const TRACKED = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Space', 'Enter', 'Escape', 'KeyD', 'KeyX',
]);

// held[code]    = true while key is physically down
// pressed[code] = true for exactly one frame after keydown
const held    = {};
const pressed = {};
const _justDown = {}; // raw flag cleared each frame

for (const code of TRACKED) {
  held[code]     = false;
  pressed[code]  = false;
  _justDown[code] = false;
}

// ---------------------------------------------------------------------------
// DOM event listeners
// ---------------------------------------------------------------------------
window.addEventListener('keydown', (e) => {
  if (!TRACKED.has(e.code)) return;
  e.preventDefault();
  if (!held[e.code]) {
    _justDown[e.code] = true; // first frame only
  }
  held[e.code] = true;
});

window.addEventListener('keyup', (e) => {
  if (!TRACKED.has(e.code)) return;
  e.preventDefault();
  held[e.code]     = false;
  pressed[e.code]  = false;
  _justDown[e.code] = false;
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** True every frame the key is held down. */
export function isKeyDown(code) {
  return held[code] === true;
}

/**
 * True only on the single frame the key was first pressed.
 * Automatically resets after being read once per frame.
 */
export function isKeyPressed(code) {
  return pressed[code] === true;
}

// ---------------------------------------------------------------------------
// Subsystem interface
// ---------------------------------------------------------------------------
const inputSystem = {
  update(_dt) {
    for (const code of TRACKED) {
      pressed[code]   = _justDown[code];
      _justDown[code] = false;
    }
  },
  isKeyDown,
  isKeyPressed,
};

registerSubsystem('input', inputSystem);

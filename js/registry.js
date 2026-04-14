/**
 * registry.js — shared game registry with no imports from other game modules.
 * Subsystems and main.js both import from here, eliminating circular dependencies.
 */

// ---------------------------------------------------------------------------
// Game states
// ---------------------------------------------------------------------------
export const STATE = {
  TITLE:     'TITLE',
  PLAYING:   'PLAYING',
  PAUSED:    'PAUSED',
  GAME_OVER: 'GAME_OVER',
};

// ---------------------------------------------------------------------------
// Subsystem table
// ---------------------------------------------------------------------------
const subsystems = {
  input:      null,
  starfield:  null,
  player:     null,
  projectile:  null,
  powerWeapon: null,
  obstacle:    null,
  collision:  null,
  particles:  null,
  hud:        null,
  messages:   null,
  enemy:      null,
  debug:      null,
};

export function registerSubsystem(name, api) {
  if (!(name in subsystems)) {
    console.warn(`[registry] Unknown subsystem: "${name}"`);
    return;
  }
  subsystems[name] = api;
}

export function getSubsystem(name) {
  return subsystems[name] || null;
}

export function getAllSubsystems() {
  return subsystems;
}

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------
let _gameState = STATE.TITLE;

export function getState() { return _gameState; }
export function setState(s) { _gameState = s; }

// ---------------------------------------------------------------------------
// Game start / reset — resets every registered subsystem then transitions
// ---------------------------------------------------------------------------
export function startGame() {
  for (const sys of Object.values(subsystems)) {
    if (sys && typeof sys.reset === 'function') sys.reset();
  }
  _gameState = STATE.PLAYING;
}

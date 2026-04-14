import { CONFIG } from './config.js';
import { STATE, getState, setState, startGame, getAllSubsystems } from './registry.js';

// ---------------------------------------------------------------------------
// Side-effect imports — each module self-registers via registry.js
// Order matters: dependencies first.
// ---------------------------------------------------------------------------
import './input.js';
import './starfield.js';
import './player.js';
import './projectile.js';
import './powerweapon.js';
import './obstacle.js';
import './enemy.js';
import './particles.js';
import './collision.js';
import './hud.js';
import './messages.js';
import './debug.js';

// ---------------------------------------------------------------------------
// Canvas
// ---------------------------------------------------------------------------
const canvas = document.getElementById('game-canvas');
const ctx    = canvas.getContext('2d');
canvas.width  = CONFIG.canvas.width;
canvas.height = CONFIG.canvas.height;

// Responsive scaling — keep logical size, scale canvas element to fit window.
function resizeCanvas() {
  const scaleX = window.innerWidth  / CONFIG.canvas.width;
  const scaleY = window.innerHeight / CONFIG.canvas.height;
  const scale  = Math.min(scaleX, scaleY);
  canvas.style.width  = `${CONFIG.canvas.width  * scale}px`;
  canvas.style.height = `${CONFIG.canvas.height * scale}px`;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sys(name) { return getAllSubsystems()[name]; }

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------
function update(dt) {
  const state = getState();

  // Input, starfield, and debug run in every state
  sys('input')     ?.update(dt);
  sys('starfield') ?.update(dt);
  sys('debug')     ?.update(dt);

  if (state === STATE.TITLE) {
    if (sys('input') && sys('input').isKeyPressed('Enter')) startGame();
    return;
  }

  if (state === STATE.PAUSED) {
    if (sys('input') && (sys('input').isKeyPressed('Enter') || sys('input').isKeyPressed('Escape'))) {
      setState(STATE.PLAYING);
    }
    return;
  }

  if (state === STATE.GAME_OVER) {
    // Let particles finish their animation
    sys('particles')?.update(dt);
    if (sys('input') && sys('input').isKeyPressed('Enter')) startGame();
    return;
  }

  // --- PLAYING ---
  if (sys('input') && sys('input').isKeyPressed('Escape')) {
    setState(STATE.PAUSED);
    return;
  }

  sys('player')    ?.update(dt);
  sys('projectile') ?.update(dt);
  sys('powerWeapon')?.update(dt);
  sys('obstacle')   ?.update(dt);
  sys('enemy')     ?.update(dt);
  sys('collision') ?.update(dt);
  sys('particles') ?.update(dt);
  sys('hud')       ?.update(dt);
  sys('messages')  ?.update(dt);
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
function render() {
  const state = getState();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Starfield always renders
  sys('starfield')?.render(ctx);

  if (state === STATE.TITLE) {
    renderTitleScreen();
    return;
  }

  // Game objects render in both PLAYING and GAME_OVER (frozen in GAME_OVER)
  sys('obstacle')  ?.render(ctx);
  sys('enemy')     ?.render(ctx);
  sys('projectile')?.render(ctx);
  sys('player')    ?.render(ctx);
  sys('particles') ?.render(ctx);
  sys('hud')        ?.render(ctx);
  sys('powerWeapon')?.render(ctx);

  if (state === STATE.PLAYING) {
    sys('messages')?.render(ctx);
  }

  if (state === STATE.PAUSED) {
    renderPauseScreen();
  }

  if (state === STATE.GAME_OVER) {
    renderGameOverScreen();
  }

  // Debug overlay always renders on top (when enabled)
  sys('debug')?.render(ctx);
}

// ---------------------------------------------------------------------------
// Title Screen
// ---------------------------------------------------------------------------
function renderTitleScreen() {
  const cx = canvas.width  / 2;
  const cy = canvas.height / 2;

  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  // Title
  ctx.font         = 'bold 48px monospace';
  ctx.fillStyle    = '#00FFCC';
  ctx.shadowColor  = '#00FFCC';
  ctx.shadowBlur   = 18;
  ctx.fillText('S P A C E  S H O O T E R', cx, cy - 100);

  // Divider
  ctx.shadowBlur   = 0;
  ctx.fillStyle    = 'rgba(255,255,255,0.15)';
  ctx.fillRect(cx - 220, cy - 66, 440, 2);

  // Controls
  ctx.font         = '20px monospace';
  ctx.fillStyle    = '#aaaaaa';
  ctx.fillText('[Arrow Keys]  Move',         cx, cy - 20);
  ctx.fillText('[Space]       Fire',         cx, cy + 16);
  ctx.fillText('[X]           Heavy Cannon', cx, cy + 52);

  // Blinking prompt
  if (Math.floor(Date.now() / 600) % 2 === 0) {
    ctx.font      = '22px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Press ENTER to Start', cx, cy + 116);
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Pause Screen (rendered on top of frozen game objects)
// ---------------------------------------------------------------------------
function renderPauseScreen() {
  const cx = canvas.width  / 2;
  const cy = canvas.height / 2;

  ctx.save();

  // Dim overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  // Title
  ctx.font        = 'bold 48px monospace';
  ctx.fillStyle   = '#00FFCC';
  ctx.shadowColor = '#00FFCC';
  ctx.shadowBlur  = 18;
  ctx.fillText('P A U S E D', cx, cy - 40);
  ctx.shadowBlur  = 0;

  // Blinking prompt
  if (Math.floor(Date.now() / 600) % 2 === 0) {
    ctx.font      = '22px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Press ENTER or ESC to Resume', cx, cy + 30);
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Game Over Screen (rendered on top of frozen game objects)
// ---------------------------------------------------------------------------
function renderGameOverScreen() {
  const cx = canvas.width  / 2;
  const cy = canvas.height / 2;

  const hud     = sys('hud');
  const score   = hud?.getScore()        ?? 0;
  const best    = hud?.getHighScore()    ?? 0;
  const newBest = hud?.isNewHighScore()  ?? false;

  ctx.save();

  // Dim overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  // Title
  ctx.font        = 'bold 48px monospace';
  ctx.fillStyle   = '#FF4444';
  ctx.shadowColor = '#FF4444';
  ctx.shadowBlur  = 18;
  ctx.fillText('G A M E  O V E R', cx, cy - 100);
  ctx.shadowBlur  = 0;

  // Scores
  ctx.font      = '24px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`Score:  ${score}`, cx, cy - 20);
  ctx.fillText(`Best:   ${best}`,  cx, cy + 20);

  // New high score banner
  if (newBest) {
    ctx.font        = 'bold 22px monospace';
    ctx.fillStyle   = '#FFD700';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur  = 12;
    ctx.fillText('★  NEW HIGH SCORE!  ★', cx, cy + 65);
    ctx.shadowBlur  = 0;
  }

  // Blinking prompt
  if (Math.floor(Date.now() / 600) % 2 === 0) {
    ctx.font      = '22px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Press ENTER to Restart', cx, newBest ? cy + 110 : cy + 80);
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Game Loop
// ---------------------------------------------------------------------------
let lastTimestamp = 0;

// Reset timestamp when tab is hidden so dt doesn't spike on return.
// (rAF is already throttled by the browser when hidden, but the cap
// on dt handles any residual spike anyway — this is belt-and-suspenders.)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) lastTimestamp = 0;
});

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
  lastTimestamp = timestamp;
  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame((ts) => {
  lastTimestamp = ts;
  requestAnimationFrame(gameLoop);
});

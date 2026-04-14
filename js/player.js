import { CONFIG } from './config.js';
import { clamp } from './utils.js';
import { isKeyDown } from './input.js';
import { registerSubsystem } from './registry.js';

const { width, height } = CONFIG.canvas;
const { width: W, height: H, speed } = CONFIG.player;

// ---------------------------------------------------------------------------
// Player entity
// ---------------------------------------------------------------------------
export const player = {
  x:     width / 2,
  y:     height - H / 2 - 20,
  width:  W,
  height: H,
  alive:  true,
  _thrusterPhase: 0,
};

function resetPlayer() {
  player.x              = width / 2;
  player.y              = height - H / 2 - 20;
  player.alive          = true;
  player._thrusterPhase = 0;
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------
function update(dt) {
  if (!player.alive) return;

  if (isKeyDown('ArrowLeft'))  player.x -= speed * dt;
  if (isKeyDown('ArrowRight')) player.x += speed * dt;
  if (isKeyDown('ArrowUp'))    player.y -= speed * dt;
  if (isKeyDown('ArrowDown'))  player.y += speed * dt;

  // Clamp to canvas bounds (center-based)
  player.x = clamp(player.x, W / 2, width  - W / 2);
  player.y = clamp(player.y, H / 2, height - H / 2);

  player._thrusterPhase += dt * 8; // ~8 rad/s pulse
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
function render(ctx) {
  if (!player.alive) return;

  const { x, y } = player;

  ctx.save(); // guard all player rendering

  // --- Thruster flame (behind the ship) ---
  const flicker = 0.6 + 0.4 * Math.sin(player._thrusterPhase);
  const flameH  = (H * 0.35) * flicker;
  const flameW  = W * 0.28;

  // Outer glow
  const glowGrad = ctx.createRadialGradient(x, y + H * 0.35, 0, x, y + H * 0.35, flameH * 1.4);
  glowGrad.addColorStop(0, `rgba(0, 180, 255, ${0.5 * flicker})`);
  glowGrad.addColorStop(1, 'rgba(0, 0, 255, 0)');
  ctx.beginPath();
  ctx.ellipse(x, y + H * 0.35, flameW * 1.6, flameH * 1.4, 0, 0, Math.PI * 2);
  ctx.fillStyle = glowGrad;
  ctx.fill();

  // Inner flame core
  ctx.beginPath();
  ctx.moveTo(x - flameW, y + H * 0.28);
  ctx.lineTo(x,          y + H * 0.28 + flameH);
  ctx.lineTo(x + flameW, y + H * 0.28);
  ctx.closePath();
  ctx.fillStyle = `rgba(100, 200, 255, ${0.8 * flicker})`;
  ctx.fill();

  // --- Ship body ---
  ctx.save(); // nested save for translate
  ctx.translate(x, y);

  // Main hull (triangle)
  ctx.beginPath();
  ctx.moveTo(0,       -H / 2);      // nose
  ctx.lineTo(-W / 2,  H / 2);      // bottom-left
  ctx.lineTo( W / 2,  H / 2);      // bottom-right
  ctx.closePath();
  ctx.fillStyle   = '#1a8cff';
  ctx.strokeStyle = '#66c2ff';
  ctx.lineWidth   = 1.5;
  ctx.fill();
  ctx.stroke();

  // Cockpit window
  ctx.beginPath();
  ctx.ellipse(0, -H * 0.1, W * 0.12, H * 0.14, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#aaddff';
  ctx.fill();

  // Left wing accent
  ctx.beginPath();
  ctx.moveTo(-W * 0.15,  H * 0.1);
  ctx.lineTo(-W * 0.5,   H * 0.5);
  ctx.lineTo(-W * 0.1,   H * 0.3);
  ctx.closePath();
  ctx.fillStyle = '#0055bb';
  ctx.fill();

  // Right wing accent
  ctx.beginPath();
  ctx.moveTo( W * 0.15,  H * 0.1);
  ctx.lineTo( W * 0.5,   H * 0.5);
  ctx.lineTo( W * 0.1,   H * 0.3);
  ctx.closePath();
  ctx.fillStyle = '#0055bb';
  ctx.fill();

  ctx.restore(); // pop translate
  ctx.restore(); // pop outer guard
}

// ---------------------------------------------------------------------------
// Subsystem
// ---------------------------------------------------------------------------
registerSubsystem('player', {
  update,
  render,
  reset: resetPlayer,
});

export default player;

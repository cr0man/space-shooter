import { CONFIG } from './config.js';
import { isKeyPressed } from './input.js';
import { registerSubsystem } from './registry.js';
import player from './player.js';

const { width: PW, height: PH, speed: PSPEED } = CONFIG.projectile;
const { maxProjectiles, fireRate } = CONFIG.player;
const CANVAS_H = CONFIG.canvas.height;

// ---------------------------------------------------------------------------
// Projectile pool
// ---------------------------------------------------------------------------
export const projectiles = [];

for (let i = 0; i < maxProjectiles; i++) {
  projectiles.push({ x: 0, y: 0, width: PW, height: PH, active: false });
}

function acquireProjectile() {
  return projectiles.find(p => !p.active) || null;
}

function fire() {
  const p = acquireProjectile();
  if (!p) return;
  p.x      = player.x;
  p.y      = player.y - player.height / 2; // from nose
  p.active = true;
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------
let lastFireTime = 0;
export function getLastFireTime() { return lastFireTime; }

function update(dt) {
  // Fire on Space (single-press, rate-limited)
  if (player.alive && isKeyPressed('Space')) {
    const now = performance.now();
    if (now - lastFireTime >= fireRate) {
      fire();
      lastFireTime = now;
    }
  }

  // Move active projectiles upward
  for (const p of projectiles) {
    if (!p.active) continue;
    p.y -= PSPEED * dt;
    if (p.y + PH / 2 < 0) p.active = false; // off top of canvas
  }
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
function render(ctx) {
  for (const p of projectiles) {
    if (!p.active) continue;

    const { x, y } = p;

    // Outer glow
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.ellipse(x, y, PW * 3, PH * 1.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#00FFC8';
    ctx.fill();
    ctx.restore();

    // Bolt core
    ctx.beginPath();
    ctx.roundRect(x - PW / 2, y - PH / 2, PW, PH, PW / 2);
    ctx.fillStyle = '#ccffee';
    ctx.fill();

    // Bright centre streak
    ctx.beginPath();
    ctx.roundRect(x - PW / 4, y - PH / 2, PW / 2, PH * 0.7, PW / 4);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
}

// ---------------------------------------------------------------------------
// Subsystem
// ---------------------------------------------------------------------------
registerSubsystem('projectile', {
  update,
  render,
  reset() {
    for (const p of projectiles) p.active = false;
    lastFireTime = performance.now(); // avoids "don't shoot" warning firing immediately
  },
});

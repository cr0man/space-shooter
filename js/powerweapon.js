import { CONFIG } from './config.js';
import { registerSubsystem, getSubsystem } from './registry.js';
import player from './player.js';

const CFG = CONFIG.powerWeapon;
const CANVAS_H = CONFIG.canvas.height;

// ---------------------------------------------------------------------------
// Projectile pool
// ---------------------------------------------------------------------------
export const powerProjectiles = Array.from({ length: CFG.poolSize }, () => ({
  x: 0, y: 0,
  width:  CFG.projectile.width,
  height: CFG.projectile.height,
  active: false,
  _hitSomething: false,
  _wasActive:    false,
}));

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let ammo           = CFG.initialAmmo;
let lastFireTime   = 0;
let nextRefillScore = CFG.ammoRefillScore;
let _pendingLoadedMessage = false;

export function getAmmo() { return ammo; }

// ---------------------------------------------------------------------------
// Fire
// ---------------------------------------------------------------------------
function fireHeavyCannon() {
  const messages = getSubsystem('messages');

  if (ammo <= 0) {
    if (messages) messages.showAlert('Heavy cannon empty!', 'warning');
    return;
  }

  // Find two inactive pool slots
  let fired = 0;
  const offsets = [
    -player.width * 0.5,
    +player.width * 0.5,
  ];

  for (const p of powerProjectiles) {
    if (p.active) continue;
    p.x      = player.x + offsets[fired];
    p.y      = player.y + player.height * 0.1;
    p.active = true;
    p._hitSomething = false;
    p._wasActive    = false;
    fired++;
    if (fired === 2) break;
  }

  ammo--;
  lastFireTime = performance.now();
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------
function update(dt) {
  // Deferred "loaded" message (set in reset(), delivered first live frame)
  if (_pendingLoadedMessage) {
    _pendingLoadedMessage = false;
    const messages = getSubsystem('messages');
    if (messages) messages.showAlert('Heavy cannon loaded!', 'encourage');
  }

  // Ammo refill check
  const hud = getSubsystem('hud');
  if (hud) {
    const score = hud.getScore();
    while (score >= nextRefillScore) {
      const gained = Math.min(CFG.ammoRefillAmount, CFG.maxAmmo - ammo);
      ammo += gained;
      nextRefillScore += CFG.ammoRefillScore;
      if (gained > 0) {
        const messages = getSubsystem('messages');
        if (messages) messages.showAlert(`Ammo resupplied! +${gained}`, 'encourage');
      }
    }
  }

  // Fire input
  const input = getSubsystem('input');
  if (input && input.isKeyPressed('KeyX')) {
    const now = performance.now();
    if (now - lastFireTime >= CFG.fireRate) {
      fireHeavyCannon();
    }
  }

  // Move active projectiles
  const speed = CFG.projectile.speed;
  for (const p of powerProjectiles) {
    if (!p.active) continue;
    p.y -= speed * dt;
    if (p.y + p.height / 2 < 0) {
      p.active = false;
    }
  }
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
function render(ctx) {
  // --- Projectiles ---
  for (const p of powerProjectiles) {
    if (!p.active) continue;

    ctx.save();

    // Outer glow
    ctx.shadowColor = '#FF8C00';
    ctx.shadowBlur  = 14;

    // Amber bolt body
    const grad = ctx.createLinearGradient(p.x, p.y - p.height / 2, p.x, p.y + p.height / 2);
    grad.addColorStop(0,   'rgba(255,200,0,1)');
    grad.addColorStop(0.4, 'rgba(255,120,0,1)');
    grad.addColorStop(1,   'rgba(180,50,0,0.6)');

    const rx = p.width / 2;
    const ry = p.height / 2;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // White centre streak
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - ry * 0.7);
    ctx.lineTo(p.x, p.y + ry * 0.7);
    ctx.stroke();

    ctx.restore();
  }

  // --- Ammo HUD (bottom-left) ---
  const labelX   = 12;
  const barY     = CANVAS_H - 48;
  const iconSize = 10;
  const iconGap  = 4;

  ctx.save();

  // "PWR" label
  ctx.font      = 'bold 13px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ammo > 0 ? '#FFD700' : '#666666';
  ctx.fillText('PWR', labelX, barY + iconSize / 2);

  // Ammo icon squares (10 total)
  const iconsStartX = labelX + 40;
  for (let i = 0; i < CFG.maxAmmo; i++) {
    const ix = iconsStartX + i * (iconSize + iconGap);
    const iy = barY;
    if (i < ammo) {
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(ix, iy, iconSize, iconSize);
    } else {
      ctx.strokeStyle = 'rgba(255,215,0,0.3)';
      ctx.lineWidth   = 1;
      ctx.strokeRect(ix, iy, iconSize, iconSize);
    }
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------
function reset() {
  for (const p of powerProjectiles) {
    p.active        = false;
    p._hitSomething = false;
    p._wasActive    = false;
  }
  ammo                  = CFG.initialAmmo;
  lastFireTime          = 0;
  nextRefillScore       = CFG.ammoRefillScore;
  _pendingLoadedMessage = true;
}

// ---------------------------------------------------------------------------
// Subsystem registration
// ---------------------------------------------------------------------------
registerSubsystem('powerWeapon', { update, render, reset, getAmmo });

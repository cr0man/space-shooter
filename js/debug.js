import { registerSubsystem, getSubsystem } from './registry.js';
import { obstacles } from './obstacle.js';
import { projectiles } from './projectile.js';
import { powerProjectiles } from './powerweapon.js';
import { enemies, enemyProjectiles } from './enemy.js';
import player from './player.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let enabled = false;

// Rolling FPS buffer (last 60 frame-times in seconds)
const FPS_SAMPLES = 60;
const frameTimes  = new Array(FPS_SAMPLES).fill(1 / 60);
let   frameIdx    = 0;

export function isDebugEnabled() { return enabled; }

// Patch hud.addScore so score events are logged when debug is on
function patchHud() {
  const hud = getSubsystem('hud');
  if (!hud || hud._debugPatched) return;
  const original = hud.addScore.bind(hud);
  hud.addScore = (pts) => {
    original(pts);
    if (enabled) {
      console.log(`[debug] +${pts} pts  →  total: ${hud.getScore()}`);
    }
  };
  hud._debugPatched = true;
}

// ---------------------------------------------------------------------------
// Hitbox drawing helpers
// ---------------------------------------------------------------------------
function drawRect(ctx, x, y, w, h, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth   = 1;
  ctx.globalAlpha = 0.7;
  ctx.strokeRect(x - w / 2, y - h / 2, w, h);
  ctx.restore();
}

function drawCircle(ctx, x, y, r, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth   = 1;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Subsystem
// ---------------------------------------------------------------------------
const debugSystem = {
  update(dt) {
    // Track FPS
    frameTimes[frameIdx % FPS_SAMPLES] = dt;
    frameIdx++;

    // Toggle with D key
    const input = getSubsystem('input');
    if (input && input.isKeyPressed('KeyD')) {
      enabled = !enabled;
      console.log(`[debug] Debug mode ${enabled ? 'ON' : 'OFF'}`);
      patchHud();
    }
  },

  render(ctx) {
    if (!enabled) return;

    // --- FPS counter ---
    const avgDt  = frameTimes.reduce((a, b) => a + b, 0) / FPS_SAMPLES;
    const fps    = Math.round(1 / avgDt);

    ctx.save();
    ctx.font         = 'bold 14px monospace';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle    = fps >= 55 ? '#00ff88' : fps >= 30 ? '#ffaa00' : '#ff4444';
    ctx.fillText(`FPS: ${fps}`, 10, 10);

    // Active object counts
    ctx.fillStyle = '#aaaaaa';
    ctx.font      = '12px monospace';
    let activeObs = 0;  for (const o of obstacles)        if (o.active) activeObs++;
    let activeProj = 0; for (const p of projectiles)      if (p.active) activeProj++;
    ctx.fillText(`Obstacles: ${activeObs}`, 10, 28);
    ctx.fillText(`Projectiles: ${activeProj}`, 10, 44);
    let activePwr = 0;  for (const p of powerProjectiles) if (p.active) activePwr++;
    ctx.fillText(`Power Proj: ${activePwr}`, 10, 60);
    ctx.fillText(`PWR Ammo:   ${getSubsystem('powerWeapon')?.getAmmo() ?? 0}`, 10, 76);
    ctx.restore();

    // --- Hitboxes ---

    // Player hitbox (shrunk, same as collision.js)
    if (player.alive) {
      drawRect(ctx,
        player.x, player.y,
        player.width * 0.7, player.height * 0.8,
        '#00ff00'
      );
    }

    // Projectile hitboxes
    for (const p of projectiles) {
      if (!p.active) continue;
      drawRect(ctx, p.x, p.y, p.width, p.height, '#ffff00');
    }

    // Power projectile hitboxes
    for (const p of powerProjectiles) {
      if (!p.active) continue;
      drawRect(ctx, p.x, p.y, p.width, p.height, '#FFD700');
    }

    // Enemy hitboxes
    for (const e of enemies) {
      if (!e.active) continue;
      drawRect(ctx, e.x, e.y, e.width * 0.8, e.height * 0.8, '#ff00ff');
    }
    for (const ep of enemyProjectiles) {
      if (!ep.active) continue;
      drawRect(ctx, ep.x, ep.y, ep.width, ep.height, '#ff88ff');
    }

    // Obstacle hitboxes
    for (const o of obstacles) {
      if (!o.active) continue;
      if (o.type === 'asteroid') {
        // Effective collision circle (same 0.85 shrink as collision.js)
        drawCircle(ctx, o.x, o.y, o.radius * 0.85, '#ff4400');
        // Full bounding circle in dim colour
        drawCircle(ctx, o.x, o.y, o.radius, 'rgba(255,100,0,0.3)');
      } else {
        drawRect(ctx, o.x, o.y,
          o.width  * 0.85, o.height * 0.85,
          '#ff4400'
        );
      }
    }
  },

  reset() {
    // Keep enabled state across resets so the dev doesn't have to re-toggle
  },
};

registerSubsystem('debug', debugSystem);

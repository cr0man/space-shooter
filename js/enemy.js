import { CONFIG } from './config.js';
import { randomRange, clamp } from './utils.js';
import { registerSubsystem, getSubsystem } from './registry.js';
import player from './player.js';

const CW    = CONFIG.canvas.width;
const CH    = CONFIG.canvas.height;
const CFG   = CONFIG.enemy;
const EW    = CFG.width;
const EH    = CFG.height;
const PW    = CFG.projectile.width;
const PH    = CFG.projectile.height;
const CFG_T = CONFIG.terror;
const TW    = CFG_T.width;
const TH    = CFG_T.height;

// ---------------------------------------------------------------------------
// Pools
// ---------------------------------------------------------------------------
export const enemies          = [];
export const enemyProjectiles = [];
export const terrorEnemies    = [];
export const terrorProjectiles = [];

for (let i = 0; i < CFG.maxActive; i++) {
  enemies.push({
    active: false, x: 0, y: 0,
    width: EW, height: EH,
    health: 0, maxHealth: CFG.health,
    fireTimer: 0,
    _phase: 0,
  });
}

for (let i = 0; i < CFG.maxActive * 6; i++) {
  enemyProjectiles.push({
    active: false, x: 0, y: 0,
    vx: 0, vy: 0,
    width: PW, height: PH,
  });
}

// Terror enemy — max 1 active at a time
terrorEnemies.push({
  active: false, x: 0, y: 0,
  width: TW, height: TH,
  health: 0, maxHealth: CFG_T.health,
  fireTimer: 0,
  _phase: 0,
});

for (let i = 0; i < CFG_T.projectilePoolSize; i++) {
  terrorProjectiles.push({
    active: false, x: 0, y: 0,
    vx: 0, vy: 0,
    width: CFG_T.projectile.width,
    height: CFG_T.projectile.height,
  });
}

// ---------------------------------------------------------------------------
// Kill tracking (called by collision.js when a regular enemy dies)
// ---------------------------------------------------------------------------
let totalKills         = 0;
let terrorNextThreshold = CFG_T.killThreshold;

export function onEnemyKilled() {
  totalKills++;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function acquireEnemy()          { return enemies.find(e => !e.active)          || null; }
function acquireProjectile()     { return enemyProjectiles.find(p => !p.active) || null; }
function acquireTerrorProjectile() { return terrorProjectiles.find(p => !p.active) || null; }

function activeEnemyCount()  { let n = 0; for (const e of enemies) if (e.active) n++; return n; }
function terrorActive()      { return terrorEnemies[0].active; }

function fireAt(e) {
  const p = acquireProjectile();
  if (!p) return;

  // Aim toward player with a small random spread
  const dx     = (player.x - e.x) + randomRange(-35, 35);
  const dy     = player.y - e.y;
  const dist   = Math.sqrt(dx * dx + dy * dy) || 1;
  const spd    = CFG.projectile.speed;

  p.active = true;
  p.x      = e.x;
  p.y      = e.y + EH / 2;   // fires from nose (bottom of inverted ship)
  p.vx     = (dx / dist) * spd;
  p.vy     = (dy / dist) * spd;
}

function spawnTerror() {
  const e = terrorEnemies[0];
  if (e.active) return;
  e.active    = true;
  e.x         = CW / 2 + randomRange(-80, 80);
  e.y         = -TH;
  e.health    = CFG_T.health;
  e.fireTimer = 2500; // short grace before first burst
  e._phase    = 0;

  const messages = getSubsystem('messages');
  if (messages) messages.showAlert('⚠ TERROR SHIP INCOMING!', 'warning');
}

function fireTerrorBurst(e) {
  const count = CFG_T.projectileCount;
  const spd   = CFG_T.projectile.speed;
  for (let i = 0; i < count; i++) {
    const p = acquireTerrorProjectile();
    if (!p) continue;
    const angle = (Math.PI * 2 / count) * i;
    p.active = true;
    p.x      = e.x;
    p.y      = e.y;
    p.vx     = Math.cos(angle) * spd;
    p.vy     = Math.sin(angle) * spd;
  }
}

// ---------------------------------------------------------------------------
// Wave state
// ---------------------------------------------------------------------------
let gameTimer   = 0;   // ms since game start
let spawnTimer  = 0;   // ms until next wave
let waveNumber  = 0;   // waves completed so far (0 = none started)
let waveActive  = false; // true while enemies from current wave are alive

function spawnWave() {
  waveNumber++;
  const count = Math.min(waveNumber, 3);
  // Spread enemies evenly across the width
  const step = (CW - EW * 2) / Math.max(count, 1);
  for (let i = 0; i < count; i++) {
    const e = acquireEnemy();
    if (!e) continue;
    e.active    = true;
    e.x         = EW + step * i + randomRange(-20, 20);
    e.y         = -EH - i * 30; // stagger entry so they don't arrive simultaneously
    e.health    = CFG.health;
    e.fireTimer = randomRange(1800, 2800);
    e._phase    = randomRange(0, Math.PI * 2);
  }
  waveActive = true;
  const messages = getSubsystem('messages');
  if (messages) {
    const label = count === 1 ? 'Enemy aircraft detected!' : `${count} enemy aircraft incoming!`;
    messages.showAlert(label, 'warning');
  }
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------
function update(dt) {
  gameTimer  += dt * 1000;
  spawnTimer -= dt * 1000;

  // Detect wave cleared
  if (waveActive && activeEnemyCount() === 0) {
    waveActive = false;
    spawnTimer = CFG.spawnInterval; // cooldown before next wave
  }

  // Spawn next wave when ready
  if (!waveActive &&
      gameTimer >= CFG.spawnDelay &&
      spawnTimer <= 0) {
    spawnWave();
  }

  for (const e of enemies) {
    if (!e.active) continue;

    e._phase += dt;

    // --- Horizontal: track player ---
    const dx = player.x - e.x;
    e.x += Math.sign(dx) * Math.min(Math.abs(dx), CFG.trackSpeed * dt);
    e.x  = clamp(e.x, EW / 2, CW - EW / 2);

    // --- Vertical: enter from top, hover in upper quarter with gentle oscillation ---
    const hoverY  = CH * 0.18 + Math.sin(e._phase * 0.7) * CH * 0.07;
    const dy      = hoverY - e.y;
    e.y += Math.sign(dy) * Math.min(Math.abs(dy), CFG.speed * dt);

    // --- Fire ---
    e.fireTimer -= dt * 1000;
    if (e.fireTimer <= 0 && player.alive) {
      fireAt(e);
      e.fireTimer = randomRange(CFG.fireInterval[0], CFG.fireInterval[1]);
    }
  }

  // Move enemy projectiles
  for (const p of enemyProjectiles) {
    if (!p.active) continue;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.y > CH + 20 || p.y < -20 || p.x < -20 || p.x > CW + 20) {
      p.active = false;
    }
  }

  // --- Terror enemy ---
  // Check if threshold reached
  if (!terrorActive() && totalKills >= terrorNextThreshold) {
    spawnTerror();
    terrorNextThreshold += CFG_T.killThreshold;
  }

  const te = terrorEnemies[0];
  if (te.active) {
    te._phase += dt;

    // Horizontal tracking (more aggressive)
    const tdx = player.x - te.x;
    te.x += Math.sign(tdx) * Math.min(Math.abs(tdx), CFG_T.trackSpeed * dt);
    te.x  = clamp(te.x, TW / 2, CW - TW / 2);

    // Vertical: hover in upper third with sinister drift
    const hoverY = CH * 0.22 + Math.sin(te._phase * 0.5) * CH * 0.08;
    const tdy    = hoverY - te.y;
    te.y += Math.sign(tdy) * Math.min(Math.abs(tdy), CFG_T.speed * dt);

    // 360° burst fire
    te.fireTimer -= dt * 1000;
    if (te.fireTimer <= 0 && player.alive) {
      fireTerrorBurst(te);
      te.fireTimer = CFG_T.fireInterval;
    }
  }

  // Move terror projectiles
  for (const p of terrorProjectiles) {
    if (!p.active) continue;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.y > CH + 30 || p.y < -30 || p.x < -30 || p.x > CW + 30) {
      p.active = false;
    }
  }
}

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------
function healthColors(e) {
  const ratio = e.health / e.maxHealth;
  if (ratio > 0.65) return { hull: '#BB1111', accent: '#FF4444', cockpit: '#FF9999', glow: 'rgba(255,60,0,' };
  if (ratio > 0.32) return { hull: '#BB5500', accent: '#FF8800', cockpit: '#FFBB66', glow: 'rgba(255,140,0,' };
  return                    { hull: '#998800', accent: '#FFDD00', cockpit: '#FFEE88', glow: 'rgba(255,220,0,' };
}

function renderEnemy(ctx, e) {
  const { x, y } = e;
  const colors = healthColors(e);

  ctx.save();
  ctx.translate(x, y);

  // Engine glow at top (ship faces down, engines are at top)
  const flicker = 0.65 + 0.35 * Math.sin(e._phase * 9);
  const glowR   = EH * 0.22 * flicker;
  ctx.save();
  ctx.globalAlpha = 0.55 * flicker;
  ctx.beginPath();
  ctx.ellipse(0, -EH * 0.3, EW * 0.3, glowR * 1.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = colors.accent;
  ctx.fill();
  ctx.restore();

  // Hull — inverted triangle (nose at bottom)
  ctx.beginPath();
  ctx.moveTo( 0,       EH / 2);   // nose
  ctx.lineTo(-EW / 2, -EH / 2);   // top-left
  ctx.lineTo( EW / 2, -EH / 2);   // top-right
  ctx.closePath();
  ctx.fillStyle   = colors.hull;
  ctx.strokeStyle = colors.accent;
  ctx.lineWidth   = 1.5;
  ctx.fill();
  ctx.stroke();

  // Cockpit window
  ctx.beginPath();
  ctx.ellipse(0, EH * 0.08, EW * 0.12, EH * 0.14, 0, 0, Math.PI * 2);
  ctx.fillStyle = colors.cockpit;
  ctx.fill();

  // Wing accents (rgba — no globalAlpha manipulation needed)
  const wColor = colors.accent.replace('#', 'rgba(') + '99)'; // fake 0.6 alpha
  // Left wing
  ctx.beginPath();
  ctx.moveTo(-EW * 0.15, -EH * 0.08);
  ctx.lineTo(-EW * 0.5,  -EH * 0.5);
  ctx.lineTo(-EW * 0.1,  -EH * 0.28);
  ctx.closePath();
  ctx.fillStyle = colors.hull;
  ctx.fill();

  // Right wing
  ctx.beginPath();
  ctx.moveTo( EW * 0.15, -EH * 0.08);
  ctx.lineTo( EW * 0.5,  -EH * 0.5);
  ctx.lineTo( EW * 0.1,  -EH * 0.28);
  ctx.closePath();
  ctx.fillStyle = colors.hull;
  ctx.fill();

  // Health pips above the ship
  const pipR    = 3;
  const pipGap  = 9;
  const pipsW   = (e.maxHealth - 1) * pipGap;
  for (let i = 0; i < e.maxHealth; i++) {
    ctx.beginPath();
    ctx.arc(-pipsW / 2 + i * pipGap, -EH / 2 - 8, pipR, 0, Math.PI * 2);
    ctx.fillStyle = i < e.health ? colors.accent : '#333333';
    ctx.fill();
  }

  ctx.restore();
}

function renderProjectile(ctx, p) {
  const angle = Math.atan2(p.vy, p.vx) + Math.PI / 2;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);

  // Glow
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.beginPath();
  ctx.ellipse(0, 0, PW * 3, PH * 1.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#FF5050';
  ctx.fill();
  ctx.restore();

  // Bolt core
  ctx.beginPath();
  ctx.roundRect(-PW / 2, -PH / 2, PW, PH, PW / 2);
  ctx.fillStyle = '#FF8888';
  ctx.fill();

  // Centre streak
  ctx.beginPath();
  ctx.roundRect(-PW / 4, -PH / 2, PW / 2, PH * 0.7, PW / 4);
  ctx.fillStyle = '#FFEEEE';
  ctx.fill();

  ctx.restore();
}

function renderTerrorEnemy(ctx, e) {
  const { x, y } = e;
  const pulse = 0.5 + 0.5 * Math.sin(e._phase * 3.5);

  ctx.save();
  ctx.translate(x, y);

  // Sinister pulsing aura
  ctx.save();
  ctx.globalAlpha = 0.3 * pulse;
  ctx.beginPath();
  ctx.ellipse(0, 0, TW * 1.2, TH * 1.0, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#C80014';
  ctx.fill();
  ctx.restore();

  // Bat wings — left
  ctx.beginPath();
  ctx.moveTo(-TW * 0.18, -TH * 0.05);
  ctx.lineTo(-TW * 0.85,  TH * 0.05);
  ctx.lineTo(-TW * 1.05,  TH * 0.28);
  ctx.lineTo(-TW * 0.75,  TH * 0.18);
  ctx.lineTo(-TW * 0.5,   TH * 0.08);
  ctx.lineTo(-TW * 0.22, -TH * 0.15);
  ctx.closePath();
  ctx.fillStyle   = '#250008';
  ctx.strokeStyle = '#880018';
  ctx.lineWidth   = 1.5;
  ctx.fill();
  ctx.stroke();

  // Wing spike — left
  ctx.beginPath();
  ctx.moveTo(-TW * 0.72, -TH * 0.02);
  ctx.lineTo(-TW * 1.15, -TH * 0.28);
  ctx.lineTo(-TW * 0.88,  TH * 0.08);
  ctx.closePath();
  ctx.fillStyle = '#3A000E';
  ctx.fill();

  // Bat wings — right (mirror)
  ctx.beginPath();
  ctx.moveTo( TW * 0.18, -TH * 0.05);
  ctx.lineTo( TW * 0.85,  TH * 0.05);
  ctx.lineTo( TW * 1.05,  TH * 0.28);
  ctx.lineTo( TW * 0.75,  TH * 0.18);
  ctx.lineTo( TW * 0.5,   TH * 0.08);
  ctx.lineTo( TW * 0.22, -TH * 0.15);
  ctx.closePath();
  ctx.fillStyle   = '#250008';
  ctx.strokeStyle = '#880018';
  ctx.lineWidth   = 1.5;
  ctx.fill();
  ctx.stroke();

  // Wing spike — right
  ctx.beginPath();
  ctx.moveTo( TW * 0.72, -TH * 0.02);
  ctx.lineTo( TW * 1.15, -TH * 0.28);
  ctx.lineTo( TW * 0.88,  TH * 0.08);
  ctx.closePath();
  ctx.fillStyle = '#3A000E';
  ctx.fill();

  // Main hull — angular pentagonal body, nose at bottom
  ctx.beginPath();
  ctx.moveTo( 0,         TH * 0.5);   // nose
  ctx.lineTo(-TW * 0.42, TH * 0.1);
  ctx.lineTo(-TW * 0.38, -TH * 0.5);
  ctx.lineTo( TW * 0.38, -TH * 0.5);
  ctx.lineTo( TW * 0.42,  TH * 0.1);
  ctx.closePath();
  ctx.fillStyle   = '#160005';
  ctx.strokeStyle = '#CC0028';
  ctx.lineWidth   = 2;
  ctx.fill();
  ctx.stroke();

  // Armour ridges on hull
  ctx.strokeStyle = '#550012';
  ctx.lineWidth   = 1;
  ctx.beginPath(); ctx.moveTo(-TW * 0.22, -TH * 0.3); ctx.lineTo(-TW * 0.28, TH * 0.3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo( TW * 0.22, -TH * 0.3); ctx.lineTo( TW * 0.28, TH * 0.3); ctx.stroke();

  // Engine exhaust — dark crimson flame at top
  const exH = TH * 0.2 * (0.8 + 0.4 * pulse);
  ctx.save();
  ctx.globalAlpha = 0.8 * pulse;
  ctx.beginPath();
  ctx.ellipse(0, -TH * 0.5, TW * 0.18, exH, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#DC0028';
  ctx.fill();
  ctx.restore();

  // Glowing red eyes
  ctx.save();
  for (const ex of [-TW * 0.13, TW * 0.13]) {
    const eyeY = TH * 0.02;
    ctx.globalAlpha = 0.85 + 0.15 * pulse;
    ctx.beginPath();
    ctx.arc(ex, eyeY, TW * 0.13, 0, Math.PI * 2);
    ctx.fillStyle = '#FF1E00';
    ctx.fill();
    // Pupil
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(ex, eyeY, TW * 0.045, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(255, ${Math.floor(60 * pulse)}, 0)`;
    ctx.fill();
  }
  ctx.restore();

  // Skull-like forehead marking
  ctx.strokeStyle = `rgba(180, 0, 20, ${0.4 + 0.3 * pulse})`;
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.arc(0, -TH * 0.2, TW * 0.12, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();

  // Health pips — red diamonds above ship
  const pipR    = 5;
  const pipGap  = 14;
  const pipsW   = (e.maxHealth - 1) * pipGap;
  for (let i = 0; i < e.maxHealth; i++) {
    const px = -pipsW / 2 + i * pipGap;
    const py = -TH / 2 - 12;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.rect(-pipR * 0.7, -pipR * 0.7, pipR * 1.4, pipR * 1.4);
    ctx.fillStyle   = i < e.health ? '#FF0033' : '#2A0008';
    ctx.strokeStyle = '#880022';
    ctx.lineWidth   = 1;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function renderTerrorProjectile(ctx, p) {
  ctx.save();
  const r = 7;
  // Glow
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r * 2.5, 0, Math.PI * 2);
  ctx.fillStyle = '#FF1E1E';
  ctx.fill();
  // Core orb
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = '#FFAAAA';
  ctx.fill();
  ctx.restore();
}

function render(ctx) {
  for (const e of enemies)           { if (e.active) renderEnemy(ctx, e); }
  for (const p of enemyProjectiles)  { if (p.active) renderProjectile(ctx, p); }
  for (const e of terrorEnemies)     { if (e.active) renderTerrorEnemy(ctx, e); }
  for (const p of terrorProjectiles) { if (p.active) renderTerrorProjectile(ctx, p); }
}

// ---------------------------------------------------------------------------
// Subsystem
// ---------------------------------------------------------------------------
registerSubsystem('enemy', {
  update,
  render,
  reset() {
    for (const e of enemies)           e.active = false;
    for (const p of enemyProjectiles)  p.active = false;
    for (const e of terrorEnemies)     e.active = false;
    for (const p of terrorProjectiles) p.active = false;
    gameTimer            = 0;
    spawnTimer           = 0;
    waveNumber           = 0;
    waveActive           = false;
    totalKills           = 0;
    terrorNextThreshold  = CFG_T.killThreshold;
  },
});

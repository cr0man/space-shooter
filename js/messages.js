import { CONFIG } from './config.js';
import { registerSubsystem, getSubsystem } from './registry.js';
import player from './player.js';
import { obstacles } from './obstacle.js';
import { getLastFireTime } from './projectile.js';

const CW = CONFIG.canvas.width;
const CH = CONFIG.canvas.height;
const FADE_S    = CONFIG.messages.fadeDuration    / 1000;
const DISPLAY_S = CONFIG.messages.displayDuration / 1000;
const PROXIMITY = CONFIG.messages.warningProximity;
const TOTAL_S   = DISPLAY_S + FADE_S * 2;

// ---------------------------------------------------------------------------
// Current displayed message
// ---------------------------------------------------------------------------
let current = null; // { text, type, elapsed }

function showMessage(text, type) {
  current = { text, type, elapsed: 0 };
}

// ---------------------------------------------------------------------------
// One-time milestone flags (reset each game)
// ---------------------------------------------------------------------------
const milestones = {
  firstKill:  false,
  score500:   false,
  score1000:  false,
  score2500:  false,
  score5000:  false,
  streak10:   false,
};

// ---------------------------------------------------------------------------
// Warning cooldowns – seconds remaining before the warning can re-fire
// ---------------------------------------------------------------------------
const WARN_COOLDOWN = 5; // seconds between repeats of the same warning

const cooldowns = {
  proximity:  0,
  crowded:    0,
  dangerZone: 0,
  edge:       0,
  noShoot:    0,
};

// ---------------------------------------------------------------------------
// Called by collision.js on every kill
// ---------------------------------------------------------------------------
export function onKill(streak, score) {
  if (!milestones.firstKill) {
    milestones.firstKill = true;
    showMessage('First blood! Keep shooting!', 'encourage');
    return;
  }
  if (streak >= 10 && !milestones.streak10) {
    milestones.streak10 = true;
    showMessage('Sharpshooter!', 'encourage');
  }
}

// ---------------------------------------------------------------------------
// Check all triggers each frame
// ---------------------------------------------------------------------------
function checkTriggers(dt, score) {
  // Tick down all warning cooldowns first (always, regardless of early returns below)
  for (const key of Object.keys(cooldowns)) {
    if (cooldowns[key] > 0) cooldowns[key] -= dt;
  }

  // --- Encouraging: score milestones ---
  if (!milestones.score500  && score >= 500)  { milestones.score500  = true; showMessage("You're on fire!", 'encourage'); return; }
  if (!milestones.score1000 && score >= 1000) { milestones.score1000 = true; showMessage('Unstoppable!', 'encourage'); return; }
  if (!milestones.score2500 && score >= 2500) { milestones.score2500 = true; showMessage('Ace Pilot!', 'encourage'); return; }
  if (!milestones.score5000 && score >= 5000) { milestones.score5000 = true; showMessage('Legendary!', 'encourage'); return; }

  // Single pass: count active obstacles and check proximity without allocating an array.
  const proxCheck = cooldowns.proximity <= 0;
  const proxSq    = PROXIMITY * PROXIMITY;
  let activeCount = 0;
  let closeObstacle = false;
  for (const o of obstacles) {
    if (!o.active) continue;
    activeCount++;
    if (proxCheck && !closeObstacle) {
      const dx = o.x - player.x;
      const dy = o.y - player.y;
      if (dx * dx + dy * dy < proxSq) closeObstacle = true;
    }
  }

  // --- Warning: obstacle proximity ---
  if (proxCheck && closeObstacle) {
    showMessage('Watch out! Incoming!', 'warning');
    cooldowns.proximity = WARN_COOLDOWN;
    return;
  }

  // --- Warning: danger zone (10+ obstacles) ---
  if (cooldowns.dangerZone <= 0 && activeCount >= 10) {
    showMessage('Danger zone!', 'warning');
    cooldowns.dangerZone = WARN_COOLDOWN;
    return;
  }

  // --- Warning: crowded (3+ obstacles) – lower priority than danger zone ---
  if (cooldowns.crowded <= 0 && activeCount >= 3 && activeCount < 10) {
    showMessage("It's getting crowded!", 'warning');
    cooldowns.crowded = WARN_COOLDOWN;
    return;
  }

  // --- Warning: player near canvas edge ---
  const edgeMargin = 60;
  if (cooldowns.edge <= 0) {
    const nearEdge = player.x < edgeMargin || player.x > CW - edgeMargin ||
                     player.y < edgeMargin || player.y > CH - edgeMargin;
    if (nearEdge) {
      showMessage('Stay centered, pilot!', 'warning');
      cooldowns.edge = WARN_COOLDOWN;
      return;
    }
  }

  // --- Warning: no shots fired for 5 seconds ---
  if (cooldowns.noShoot <= 0) {
    const idleMs = performance.now() - getLastFireTime();
    if (idleMs >= 5000) {
      showMessage("Don't forget to shoot!", 'warning');
      cooldowns.noShoot = WARN_COOLDOWN;
    }
  }
}

// ---------------------------------------------------------------------------
// Subsystem
// ---------------------------------------------------------------------------
function update(dt) {
  const hud   = getSubsystem('hud');
  const score = hud ? hud.getScore() : 0;

  checkTriggers(dt, score);

  if (current) {
    current.elapsed += dt;
    if (current.elapsed >= TOTAL_S) current = null;
  }
}

function render(ctx) {
  if (!current) return;

  const { text, type, elapsed } = current;

  // Compute opacity: fade in, hold, fade out
  let opacity;
  if (elapsed < FADE_S) {
    opacity = elapsed / FADE_S;
  } else if (elapsed < FADE_S + DISPLAY_S) {
    opacity = 1;
  } else {
    opacity = 1 - (elapsed - FADE_S - DISPLAY_S) / FADE_S;
  }
  opacity = Math.max(0, Math.min(1, opacity));

  const color = type === 'warning' ? '#FF6600' : '#00FFCC';
  const cx    = CW / 2;

  ctx.save();
  ctx.globalAlpha  = opacity;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';

  // Glow shadow
  ctx.shadowColor  = color;
  ctx.shadowBlur   = 12;
  ctx.font         = 'bold 22px monospace';
  ctx.fillStyle    = color;
  ctx.fillText(text, cx, 18);

  // Crisp overlay pass (remove glow for text clarity)
  ctx.shadowBlur   = 0;
  ctx.fillStyle    = '#ffffff';
  ctx.globalAlpha  = opacity * 0.9;
  ctx.fillText(text, cx, 18);

  ctx.restore();
}

registerSubsystem('messages', {
  update,
  render,
  onKill,
  showAlert(text, type) { showMessage(text, type); },
  reset() {
    current = null;
    for (const k of Object.keys(milestones)) milestones[k] = false;
    for (const k of Object.keys(cooldowns))  cooldowns[k]  = 0;
  },
});

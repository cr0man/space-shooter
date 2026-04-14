import { CONFIG } from './config.js';
import { registerSubsystem } from './registry.js';

const { width: CW } = CONFIG.canvas;
const { interval: BONUS_INTERVAL, points: BONUS_PTS } = CONFIG.survivalBonus;

const LS_KEY = 'spaceShooterHighScore';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let score        = 0;
let highScore    = parseInt(localStorage.getItem(LS_KEY) || '0', 10);
let newHighScore = false;
let bonusTimer   = 0;   // ms accumulated toward next survival bonus

// ---------------------------------------------------------------------------
// Public API  (consumed by main.js game-over screen and collision.js)
// ---------------------------------------------------------------------------
export function addScore(pts) {
  score += pts;
  if (score > highScore) {
    highScore    = score;
    newHighScore = true;
    localStorage.setItem(LS_KEY, String(highScore));
  }
}

export function getScore()        { return score; }
export function getHighScore()    { return highScore; }
export function isNewHighScore()  { return newHighScore; }

// ---------------------------------------------------------------------------
// Subsystem
// ---------------------------------------------------------------------------
function update(dt) {
  bonusTimer += dt * 1000; // convert to ms
  if (bonusTimer >= BONUS_INTERVAL) {
    bonusTimer -= BONUS_INTERVAL;
    addScore(BONUS_PTS);
  }
}

function render(ctx) {
  ctx.save();
  ctx.textAlign    = 'right';
  ctx.textBaseline = 'top';

  // Score
  ctx.font      = 'bold 20px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`SCORE  ${score}`, CW - 12, 12);

  // High score
  ctx.font      = '15px monospace';
  ctx.fillStyle = '#aaaaaa';
  ctx.fillText(`BEST   ${highScore}`, CW - 12, 38);

  ctx.restore();
}

registerSubsystem('hud', {
  update,
  render,
  addScore,
  getScore,
  getHighScore,
  isNewHighScore,
  reset() {
    score        = 0;
    newHighScore = false;
    bonusTimer   = 0;
    // highScore is intentionally preserved across resets
  },
});

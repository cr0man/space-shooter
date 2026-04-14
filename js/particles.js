import { randomRange } from './utils.js';
import { registerSubsystem } from './registry.js';

// ---------------------------------------------------------------------------
// Pool size – enough headroom for simultaneous explosions
// ---------------------------------------------------------------------------
const POOL_SIZE = 200;

const pool = [];
for (let i = 0; i < POOL_SIZE; i++) {
  pool.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, color: '#fff', size: 0, maxSize: 0 });
}

function acquire() {
  return pool.find(p => !p.active) || null;
}

// ---------------------------------------------------------------------------
// Explosion presets
// ---------------------------------------------------------------------------
const PRESETS = {
  obstacle: {
    count:     { min: 10, max: 15 },
    speed:     { min: 40, max: 160 },
    life:      { min: 0.4, max: 0.9 },
    size:      { min: 2,  max: 5   },
    colors:    ['#FF8800', '#FFAA00', '#FFDD00', '#FF5500', '#FFFFFF'],
  },
  player: {
    count:     { min: 25, max: 32 },
    speed:     { min: 60, max: 240 },
    life:      { min: 0.6, max: 1.4 },
    size:      { min: 3,  max: 8   },
    colors:    ['#FF2200', '#FF6600', '#FF9900', '#FFFFFF', '#FFDDAA'],
  },
  enemy: {
    count:     { min: 18, max: 24 },
    speed:     { min: 50, max: 200 },
    life:      { min: 0.5, max: 1.2 },
    size:      { min: 2,  max: 7   },
    colors:    ['#FF2200', '#FF5500', '#FF8800', '#FFAA00', '#FFFFFF'],
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function spawnExplosion(x, y, type) {
  const preset = PRESETS[type] || PRESETS.obstacle;
  const count  = Math.round(randomRange(preset.count.min, preset.count.max));

  for (let i = 0; i < count; i++) {
    const p = acquire();
    if (!p) break;

    const angle = randomRange(0, Math.PI * 2);
    const speed = randomRange(preset.speed.min, preset.speed.max);
    const life  = randomRange(preset.life.min, preset.life.max);
    const size  = randomRange(preset.size.min, preset.size.max);

    p.active  = true;
    p.x       = x;
    p.y       = y;
    p.vx      = Math.cos(angle) * speed;
    p.vy      = Math.sin(angle) * speed;
    p.life    = life;
    p.maxLife = life;
    p.size    = size;
    p.maxSize = size;
    p.color   = preset.colors[Math.floor(Math.random() * preset.colors.length)];
  }
}

// ---------------------------------------------------------------------------
// Subsystem
// ---------------------------------------------------------------------------
function update(dt) {
  for (const p of pool) {
    if (!p.active) continue;
    p.x    += p.vx * dt;
    p.y    += p.vy * dt;
    // Slight drag
    p.vx   *= 1 - (dt * 2.5);
    p.vy   *= 1 - (dt * 2.5);
    p.life -= dt;
    p.size  = p.maxSize * (p.life / p.maxLife);
    if (p.life <= 0) p.active = false;
  }
}

function render(ctx) {
  for (const p of pool) {
    if (!p.active || p.size <= 0) continue;
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

registerSubsystem('particles', {
  update,
  render,
  spawnExplosion,
  reset() {
    for (const p of pool) p.active = false;
  },
});

import { CONFIG } from './config.js';
import { randomRange } from './utils.js';
import { registerSubsystem } from './registry.js';

const CW = CONFIG.canvas.width;
const CH = CONFIG.canvas.height;
const OBS = CONFIG.obstacles;

// ---------------------------------------------------------------------------
// Difficulty tiers  (Section 8 of SDD)
// ---------------------------------------------------------------------------
const TIERS = [
  { time:   0, interval: 1500, maxObstacles:  5, speedMult: 1.0 },
  { time:  30, interval: 1000, maxObstacles:  8, speedMult: 1.2 },
  { time:  60, interval:  700, maxObstacles: 12, speedMult: 1.4 },
  { time: 120, interval:  300, maxObstacles: 20, speedMult: 1.6 },
];

function getTier(elapsedSec) {
  let tier = TIERS[0];
  for (const t of TIERS) {
    if (elapsedSec >= t.time) tier = t;
  }
  return tier;
}

// ---------------------------------------------------------------------------
// Obstacle pool
// ---------------------------------------------------------------------------
export const obstacles = [];

// Asteroid shape vertices – precomputed random offsets give each asteroid a
// unique jagged silhouette that stays consistent during gameplay.
function buildAsteroidVerts(radius, count = 10) {
  const verts = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const r     = radius * randomRange(0.7, 1.3);
    verts.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
  }
  return verts;
}

// Debris shape – a small irregular polygon (5 vertices)
function buildDebrisVerts(w, h) {
  return [
    { x: randomRange(-w * 0.3,  w * 0.3), y: -h / 2 },
    { x:  w / 2,                           y: randomRange(-h * 0.2, h * 0.2) },
    { x: randomRange( w * 0.1,  w * 0.4), y:  h / 2 },
    { x: randomRange(-w * 0.4, -w * 0.1), y:  h / 2 },
    { x: -w / 2,                           y: randomRange(-h * 0.2, h * 0.2) },
  ];
}

function makeAsteroid(size, x, y, speedMult) {
  const cfg   = OBS.asteroid[size];
  const speedY = randomRange(cfg.speed[0], cfg.speed[1]) * speedMult;
  const speedX = randomRange(-30, 30);
  return {
    type:   'asteroid',
    size,
    x:      x  ?? randomRange(cfg.radius, CW - cfg.radius),
    y:      y  ?? -cfg.radius,
    radius: cfg.radius,
    // AABB helpers (for collision module)
    get width()  { return this.radius * 2; },
    get height() { return this.radius * 2; },
    speedY,
    speedX,
    points:  cfg.points,
    active:  true,
    verts:   buildAsteroidVerts(cfg.radius),
    rotation: 0,
    rotSpeed: randomRange(-1.5, 1.5),
  };
}

function makeDebris(x, speedMult) {
  const cfg   = OBS.debris;
  const speedY = randomRange(cfg.speed[0], cfg.speed[1]) * speedMult;
  const speedX = randomRange(-40, 40);
  return {
    type:   'debris',
    size:   null,
    x:      x ?? randomRange(cfg.width, CW - cfg.width),
    y:      -cfg.height,
    width:  cfg.width,
    height: cfg.height,
    radius: null,
    speedY,
    speedX,
    points:  cfg.points,
    active:  true,
    verts:   buildDebrisVerts(cfg.width, cfg.height),
    rotation: 0,
    rotSpeed: randomRange(-3, 3),
  };
}

// ---------------------------------------------------------------------------
// Spawn helpers (exported for collision's asteroid-split logic)
// ---------------------------------------------------------------------------
export function spawnChildAsteroids(parentX, parentY, parentSize) {
  const childSize = parentSize === 'large' ? 'medium' : 'small';
  for (let i = 0; i < 2; i++) {
    const child = makeAsteroid(childSize, parentX, parentY, _currentSpeedMult);
    // Scatter horizontally
    child.speedX = (i === 0 ? -1 : 1) * randomRange(40, 90);
    obstacles.push(child);
  }
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let _elapsedSec      = 0;
let _timeSinceSpawn  = 0;
let _currentSpeedMult = 1.0;

function activeCount() {
  let n = 0;
  for (const o of obstacles) if (o.active) n++;
  return n;
}

function spawnRandom(speedMult) {
  const roll = Math.random();
  let obs;
  if (roll < 0.25) {
    obs = makeAsteroid('large',  undefined, undefined, speedMult);
  } else if (roll < 0.55) {
    obs = makeAsteroid('medium', undefined, undefined, speedMult);
  } else if (roll < 0.80) {
    obs = makeAsteroid('small',  undefined, undefined, speedMult);
  } else {
    obs = makeDebris(undefined, speedMult);
  }
  obstacles.push(obs);
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------
function update(dt) {
  _elapsedSec     += dt;
  _timeSinceSpawn += dt * 1000; // track in ms

  const tier = getTier(_elapsedSec);
  _currentSpeedMult = tier.speedMult;

  // Spawn
  if (_timeSinceSpawn >= tier.interval && activeCount() < tier.maxObstacles) {
    spawnRandom(tier.speedMult);
    _timeSinceSpawn = 0;
  }

  // Move & rotate
  for (const o of obstacles) {
    if (!o.active) continue;
    o.y        += o.speedY   * dt;
    o.x        += o.speedX   * dt;
    o.rotation += o.rotSpeed * dt;

    // Remove if off-screen
    const margin = o.radius ?? Math.max(o.width, o.height);
    if (o.y > CH + margin) o.active = false;

    // Clamp horizontal drift so obstacles don't escape sideways permanently
    if (o.x < -margin) o.active = false;
    if (o.x > CW + margin) o.active = false;
  }

  // Prune inactive obstacles to keep array lean
  if (obstacles.length > 80) {
    const keep = obstacles.filter(o => o.active);
    obstacles.length = 0;
    obstacles.push(...keep);
  }
}

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------
function renderAsteroid(ctx, o) {
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.rotate(o.rotation);

  // Shadow / depth
  ctx.beginPath();
  for (let i = 0; i < o.verts.length; i++) {
    const v = o.verts[i];
    i === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y);
  }
  ctx.closePath();

  const grad = ctx.createRadialGradient(-o.radius * 0.3, -o.radius * 0.3, 0, 0, 0, o.radius * 1.2);
  grad.addColorStop(0, '#aaaaaa');
  grad.addColorStop(0.5, '#666666');
  grad.addColorStop(1, '#333333');
  ctx.fillStyle   = grad;
  ctx.strokeStyle = '#888888';
  ctx.lineWidth   = 1;
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function renderDebris(ctx, o) {
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.rotate(o.rotation);

  ctx.beginPath();
  for (let i = 0; i < o.verts.length; i++) {
    const v = o.verts[i];
    i === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y);
  }
  ctx.closePath();

  ctx.fillStyle   = '#888a7a';
  ctx.strokeStyle = '#ccccaa';
  ctx.lineWidth   = 1;
  ctx.fill();
  ctx.stroke();

  // Metallic highlight
  ctx.beginPath();
  ctx.moveTo(o.verts[0].x * 0.6, o.verts[0].y * 0.6);
  ctx.lineTo(o.verts[1].x * 0.6, o.verts[1].y * 0.6);
  ctx.strokeStyle = 'rgba(255,255,200,0.35)';
  ctx.lineWidth   = 1.5;
  ctx.stroke();

  ctx.restore();
}

function render(ctx) {
  for (const o of obstacles) {
    if (!o.active) continue;
    if (o.type === 'asteroid') renderAsteroid(ctx, o);
    else                       renderDebris(ctx, o);
  }
}

// ---------------------------------------------------------------------------
// Subsystem
// ---------------------------------------------------------------------------
registerSubsystem('obstacle', {
  update,
  render,
  reset() {
    obstacles.length = 0;
    _elapsedSec     = 0;
    _timeSinceSpawn = 0;
    _currentSpeedMult = 1.0;
  },
});

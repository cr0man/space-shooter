import { aabbCollision, circleRectCollision } from './utils.js';
import { CONFIG } from './config.js';
import { registerSubsystem, getSubsystem, setState, STATE } from './registry.js';
import player from './player.js';
import { projectiles } from './projectile.js';
import { powerProjectiles } from './powerweapon.js';
import { obstacles, spawnChildAsteroids } from './obstacle.js';
import { enemies, enemyProjectiles, terrorEnemies, terrorProjectiles, onEnemyKilled } from './enemy.js';

// ---------------------------------------------------------------------------
// Kill-streak counter (used by messages.js trigger)
// ---------------------------------------------------------------------------
let killStreak = 0;
export function getKillStreak() { return killStreak; }

// ---------------------------------------------------------------------------
// Collision helpers
// ---------------------------------------------------------------------------
function powerProjectileHitsObstacle(p, o) {
  if (o.type === 'asteroid') {
    return circleRectCollision(
      { x: o.x, y: o.y, radius: o.radius },
      { x: p.x, y: p.y, width: p.width, height: p.height },
    );
  }
  return aabbCollision(p, o);
}

function projectileHitsObstacle(p, o) {
  if (o.type === 'asteroid') {
    // Projectile is a rect (center-based), asteroid is a circle
    return circleRectCollision(
      { x: o.x, y: o.y, radius: o.radius },
      { x: p.x, y: p.y, width: p.width, height: p.height },
    );
  }
  // Both rects (center-based)
  return aabbCollision(p, o);
}

function obstacleHitsPlayer(o) {
  if (o.type === 'asteroid') {
    return circleRectCollision(
      { x: o.x, y: o.y, radius: o.radius * 0.85 }, // slight forgiveness
      { x: player.x, y: player.y, width: player.width * 0.7, height: player.height * 0.8 },
    );
  }
  // Both rects – shrink hitbox slightly for fairness
  return aabbCollision(
    { x: o.x,      y: o.y,      width: o.width      * 0.85, height: o.height      * 0.85 },
    { x: player.x, y: player.y, width: player.width  * 0.7,  height: player.height * 0.8  },
  );
}

// ---------------------------------------------------------------------------
// Destruction handlers
// ---------------------------------------------------------------------------
function destroyObstacleByPowerWeapon(o, p) {
  o.active        = false;
  p.active        = false;
  p._hitSomething = true;

  const hud = getSubsystem('hud');
  if (hud) hud.addScore(o.points * CONFIG.powerWeapon.pointsMultiplier);

  const particles = getSubsystem('particles');
  if (particles) particles.spawnExplosion(o.x, o.y, 'obstacle');

  // No child asteroids — power weapon one-shots everything
  killStreak++;

  const messages = getSubsystem('messages');
  if (messages) messages.onKill(killStreak, getSubsystem('hud')?.getScore() ?? 0);
}

function destroyEnemyByPowerWeapon(e, p) {
  e.active        = false;
  p.active        = false;
  p._hitSomething = true;
  killStreak++;
  onEnemyKilled();

  const hud = getSubsystem('hud');
  if (hud) hud.addScore(e.points ?? 300);

  const particles = getSubsystem('particles');
  if (particles) particles.spawnExplosion(e.x, e.y, 'enemy');

  const messages = getSubsystem('messages');
  if (messages) {
    messages.showAlert('Enemy down!', 'encourage');
    messages.onKill(killStreak, getSubsystem('hud')?.getScore() ?? 0);
  }
}

function damageTerrorByPowerWeapon(e, p) {
  p.active        = false;
  p._hitSomething = true;
  e.health--;

  const particles = getSubsystem('particles');

  if (e.health <= 0) {
    e.active = false;
    killStreak++;

    const hud = getSubsystem('hud');
    if (hud) hud.addScore(CONFIG.terror.points);

    if (particles) particles.spawnExplosion(e.x, e.y, 'enemy');
    if (particles) particles.spawnExplosion(e.x + 20, e.y - 15, 'enemy');
    if (particles) particles.spawnExplosion(e.x - 20, e.y + 10, 'obstacle');

    const messages = getSubsystem('messages');
    if (messages) {
      messages.showAlert('TERROR SHIP DESTROYED!', 'encourage');
      messages.onKill(killStreak, getSubsystem('hud')?.getScore() ?? 0);
    }
  } else {
    // Hit but alive — heavy spark
    if (particles) particles.spawnExplosion(e.x, e.y, 'obstacle');
    const messages = getSubsystem('messages');
    if (messages) messages.showAlert(`Terror hull: ${e.health} hits remaining`, 'warning');
  }
}

function destroyObstacle(o, p) {
  o.active = false;
  if (p) {
    p.active = false;
    p._hitSomething = true;
  }

  // Award score
  const hud = getSubsystem('hud');
  if (hud) hud.addScore(o.points);

  // Spawn explosion particles
  const particles = getSubsystem('particles');
  if (particles) particles.spawnExplosion(o.x, o.y, 'obstacle');

  // Asteroid splitting
  if (o.type === 'asteroid' && (o.size === 'large' || o.size === 'medium')) {
    spawnChildAsteroids(o.x, o.y, o.size);
  }

  // Kill streak
  killStreak++;

  // Notify message system
  const messages = getSubsystem('messages');
  if (messages) messages.onKill(killStreak, getSubsystem('hud')?.getScore() ?? 0);
}

function destroyPlayer() {
  player.alive = false;
  const particles = getSubsystem('particles');
  if (particles) particles.spawnExplosion(player.x, player.y, 'player');
  setState(STATE.GAME_OVER);
}

function damageEnemy(e, p) {
  // Standard projectiles are deflected by enemy shields — spark only, no damage
  if (p) {
    p.active        = false;
    p._hitSomething = true;
  }
  const particles = getSubsystem('particles');
  if (particles) particles.spawnExplosion(e.x, e.y, 'obstacle');

  const messages = getSubsystem('messages');
  if (messages) messages.showAlert('No effect — use heavy cannon!', 'warning');
}

// ---------------------------------------------------------------------------
// Update  (runs every frame during PLAYING)
// ---------------------------------------------------------------------------
function update(_dt) {
  // --- Projectile vs Obstacle ---
  for (const p of projectiles) {
    if (!p.active) continue;
    for (const o of obstacles) {
      if (!o.active) continue;
      if (projectileHitsObstacle(p, o)) {
        destroyObstacle(o, p);
        break; // one projectile hits one obstacle
      }
    }
  }

  // --- Power projectile vs Obstacle ---
  for (const p of powerProjectiles) {
    if (!p.active) continue;
    for (const o of obstacles) {
      if (!o.active) continue;
      if (powerProjectileHitsObstacle(p, o)) {
        destroyObstacleByPowerWeapon(o, p);
        break;
      }
    }
  }

  // If a projectile went off-screen this frame without hitting anything, break streak
  for (const p of projectiles) {
    if (p._wasActive && !p.active && !p._hitSomething) {
      killStreak = 0;
    }
    // Roll forward: capture active state before next frame's changes
    p._wasActive    = p.active;
    p._hitSomething = false; // reset each frame
  }

  // --- Player projectile vs Enemy ---
  for (const p of projectiles) {
    if (!p.active) continue;
    for (const e of enemies) {
      if (!e.active) continue;
      if (aabbCollision(p, { x: e.x, y: e.y, width: e.width * 0.8, height: e.height * 0.8 })) {
        damageEnemy(e, p);
        break;
      }
    }
  }

  // --- Power projectile vs Enemy ---
  for (const p of powerProjectiles) {
    if (!p.active) continue;
    for (const e of enemies) {
      if (!e.active) continue;
      if (aabbCollision(p, { x: e.x, y: e.y, width: e.width * 0.8, height: e.height * 0.8 })) {
        destroyEnemyByPowerWeapon(e, p);
        break;
      }
    }
  }

  // --- Standard projectile vs Terror (deflect only) ---
  for (const p of projectiles) {
    if (!p.active) continue;
    for (const e of terrorEnemies) {
      if (!e.active) continue;
      if (aabbCollision(p, { x: e.x, y: e.y, width: e.width * 0.8, height: e.height * 0.8 })) {
        p.active        = false;
        p._hitSomething = true;
        const particles = getSubsystem('particles');
        if (particles) particles.spawnExplosion(e.x, e.y, 'obstacle');
        const messages = getSubsystem('messages');
        if (messages) messages.showAlert('No effect — use heavy cannon!', 'warning');
        break;
      }
    }
  }

  // --- Power projectile vs Terror ---
  for (const p of powerProjectiles) {
    if (!p.active) continue;
    for (const e of terrorEnemies) {
      if (!e.active) continue;
      if (aabbCollision(p, { x: e.x, y: e.y, width: e.width * 0.8, height: e.height * 0.8 })) {
        damageTerrorByPowerWeapon(e, p);
        break;
      }
    }
  }

  // --- Obstacle vs Player ---
  if (!player.alive) return;
  for (const o of obstacles) {
    if (!o.active) continue;
    if (obstacleHitsPlayer(o)) {
      destroyPlayer();
      return;
    }
  }

  // --- Enemy projectile vs Player ---
  for (const ep of enemyProjectiles) {
    if (!ep.active) continue;
    if (aabbCollision(
      { x: ep.x, y: ep.y, width: ep.width, height: ep.height },
      { x: player.x, y: player.y, width: player.width * 0.7, height: player.height * 0.8 },
    )) {
      ep.active = false;
      destroyPlayer();
      return;
    }
  }

  // --- Terror projectile vs Player ---
  for (const ep of terrorProjectiles) {
    if (!ep.active) continue;
    if (aabbCollision(
      { x: ep.x, y: ep.y, width: ep.width * 2, height: ep.height * 2 },
      { x: player.x, y: player.y, width: player.width * 0.7, height: player.height * 0.8 },
    )) {
      ep.active = false;
      destroyPlayer();
      return;
    }
  }

  // --- Enemy aircraft vs Player (ramming) ---
  for (const e of enemies) {
    if (!e.active) continue;
    if (aabbCollision(
      { x: e.x, y: e.y, width: e.width * 0.75, height: e.height * 0.75 },
      { x: player.x, y: player.y, width: player.width * 0.7, height: player.height * 0.8 },
    )) {
      e.active = false;
      const particles = getSubsystem('particles');
      if (particles) particles.spawnExplosion(e.x, e.y, 'enemy');
      destroyPlayer();
      return;
    }
  }

  // --- Terror aircraft vs Player (ramming) ---
  for (const e of terrorEnemies) {
    if (!e.active) continue;
    if (aabbCollision(
      { x: e.x, y: e.y, width: e.width * 0.7, height: e.height * 0.7 },
      { x: player.x, y: player.y, width: player.width * 0.7, height: player.height * 0.8 },
    )) {
      e.active = false;
      const particles = getSubsystem('particles');
      if (particles) {
        particles.spawnExplosion(e.x, e.y, 'enemy');
        particles.spawnExplosion(e.x, e.y, 'obstacle');
      }
      destroyPlayer();
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Subsystem
// ---------------------------------------------------------------------------
registerSubsystem('collision', {
  update,
  reset() {
    killStreak = 0;
    for (const p of projectiles) {
      p._wasActive    = false;
      p._hitSomething = false;
    }
    for (const p of powerProjectiles) {
      p._wasActive    = false;
      p._hitSomething = false;
    }
  },

});

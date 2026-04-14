# Space Shooter

A browser-based arcade space shooter built with vanilla JavaScript and the HTML5 Canvas API. No dependencies, no build step — open `index.html` and play.

![Space Shooter gameplay](https://via.placeholder.com/800x400?text=Add+a+screenshot+here)

---

## Features

- **Scrolling starfield** background for the illusion of deep-space flight
- **Two obstacle types** — asteroids (small / medium / large) and metallic debris, each with unique shapes and point values
- **Asteroid splitting** — large asteroids break into two mediums; mediums break into two smalls
- **Enemy aircraft** that track the player and fire aimed shots
- **Terror Ship** boss that appears every 4 kills and unleashes 360° bullet bursts
- **Heavy Cannon** power weapon with limited ammo (refills every 500 score points)
- **Particle explosions** for every destruction event
- **Contextual messages** — milestone encouragements and proximity warnings
- **Persistent high score** via `localStorage`
- **Difficulty ramp** — spawn rate and speed increase over the first two minutes
- **Pause support** and a **debug overlay** (hitboxes + FPS counter)
- Responsive canvas — scales to any window size while maintaining the 4:3 aspect ratio

---

## Getting Started

No installation required.

```bash
git clone <repo-url>
cd game1
# then open index.html in any modern browser
```

Or simply double-click `index.html`. Because the game uses ES6 modules, some browsers require it to be served over HTTP rather than a `file://` URL. A quick way to do that:

```bash
# Python 3
python3 -m http.server 8080
# then open http://localhost:8080
```

---

## Controls

| Key | Action |
|-----|--------|
| `Arrow Keys` | Move the ship (all four directions) |
| `Space` | Fire standard laser |
| `X` | Fire Heavy Cannon (limited ammo) |
| `Enter` | Start / Restart |
| `Escape` | Pause / Resume |
| `D` | Toggle debug overlay (hitboxes + FPS) |

---

## Scoring

| Event | Points |
|-------|--------|
| Small asteroid | 50 |
| Medium asteroid | 100 |
| Large asteroid | 150 |
| Debris | 75 |
| Enemy aircraft | 300 |
| Terror Ship | 1,500 |
| Survival bonus | +10 every 5 s |
| Heavy Cannon kill | 2× obstacle points |

Score milestones trigger in-game messages: *"You're on fire!"* at 500, *"Unstoppable!"* at 1,000, *"Ace Pilot!"* at 2,500, *"Legendary!"* at 5,000.

---

## Difficulty Progression

| Time elapsed | Spawn interval | Max obstacles | Speed multiplier |
|-------------|---------------|---------------|-----------------|
| 0 – 30 s | 1,500 ms | 5 | 1.0× |
| 30 – 60 s | 1,000 ms | 8 | 1.2× |
| 60 – 120 s | 700 ms | 12 | 1.4× |
| 120 s+ | 300 ms | 20 | 1.6× |

Enemy aircraft appear after 15 seconds (up to 3 at once, in waves). The Terror Ship spawns for the first time after 4 kills and returns every 4 kills thereafter.

---

## Project Structure

```
game1/
├── index.html          # Entry point
├── css/
│   └── style.css       # Layout and canvas centering
└── js/
    ├── config.js       # All tunable constants in one place
    ├── main.js         # Game loop, state machine, screen rendering
    ├── registry.js     # Subsystem registration and lookup
    ├── input.js        # Keyboard state (isKeyDown / isKeyPressed)
    ├── player.js       # Player ship logic and rendering
    ├── projectile.js   # Standard projectile pool
    ├── powerweapon.js  # Heavy Cannon pool and ammo logic
    ├── obstacle.js     # Asteroid / debris spawning and movement
    ├── enemy.js        # Enemy aircraft, Terror Ship, their projectiles
    ├── collision.js    # All hit-testing and destruction handlers
    ├── particles.js    # Particle pool for explosion effects
    ├── hud.js          # Score, high score, ammo display
    ├── messages.js     # Contextual message panel
    ├── starfield.js    # Scrolling background stars
    ├── debug.js        # Debug overlay (toggle with D)
    └── utils.js        # randomRange, clamp, AABB, circleRect helpers
```

---

## Technical Notes

- **No external dependencies** — pure HTML5 Canvas 2D, ES6 modules, vanilla JS
- **Delta-time movement** — frame-rate-independent; capped at 100 ms to survive tab switching
- **Object pooling** — projectiles, particles, enemies, and obstacles all use pre-allocated pools to keep garbage collection minimal
- **Subsystem architecture** — each module self-registers via `registry.js`; `main.js` drives them by name without tight coupling
- **High score** is persisted in `localStorage` under the key `spaceShooterHighScore`

---

## Browser Compatibility

Tested on the latest versions of Chrome, Firefox, Edge, and Safari. Requires a browser with ES6 module support (all modern browsers qualify).

---

## License

MIT

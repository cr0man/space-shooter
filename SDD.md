# Software Design Document: Space Arcade Shooter

**Project:** Space Arcade Shooter
**Version:** 1.0
**Date:** 2026-04-13

---

## 1. Introduction

### 1.1 Purpose
This document defines the software design for a browser-based arcade game in which the player pilots an aircraft through space, avoiding and destroying obstacles while accumulating score. The game is rendered in a single HTML5 Canvas and controlled entirely via keyboard.

### 1.2 Scope
The deliverable is a standalone, client-side web game (HTML + CSS + JavaScript). No server or backend is required. The game runs in any modern browser.

### 1.3 Definitions & Abbreviations
| Term | Meaning |
|------|---------|
| Player Aircraft | The ship controlled by the user |
| Obstacle | Any object that can damage the player (asteroid, debris) |
| Projectile | A bullet fired by the player aircraft |
| HUD | Heads-Up Display -- on-screen score and status elements |
| Message Panel | UI area that shows contextual messages to the player |

---

## 2. System Overview

### 2.1 High-Level Architecture

```
+------------------------------------------------------+
|                    Browser Window                     |
|  +------------------------------------------------+  |
|  |               Game Canvas (800x600)             |  |
|  |                                                  |  |
|  |   [Message Panel]          [Score / HUD]        |  |
|  |                                                  |  |
|  |          * * *    (asteroids)                    |  |
|  |       <>---       (debris)                       |  |
|  |                                                  |  |
|  |            /\                                    |  |
|  |           /  \    (player aircraft)              |  |
|  |          /____\                                  |  |
|  +------------------------------------------------+  |
+------------------------------------------------------+
```

### 2.2 Technology Stack
| Layer | Technology |
|-------|-----------|
| Rendering | HTML5 Canvas 2D API |
| Logic | Vanilla JavaScript (ES6+) |
| Layout / Styling | CSS3 |
| Asset Format | Programmatic shapes (no external sprites required) |

---

## 3. Functional Requirements

### FR-01: Player Aircraft
| ID | Requirement |
|----|-------------|
| FR-01.1 | The player aircraft is rendered at the bottom-center of the canvas on game start. |
| FR-01.2 | The aircraft moves in four directions via arrow keys: Up, Down, Left, Right. |
| FR-01.3 | Movement is continuous while a key is held; the aircraft stops when the key is released. |
| FR-01.4 | The aircraft is constrained to the visible canvas area (cannot move off-screen). |
| FR-01.5 | The aircraft has a visible triangular or ship-like shape, drawn facing upward. |
| FR-01.6 | The aircraft has an exhaust/thruster flame animation rendered behind it. |

### FR-02: Firing Mechanism
| ID | Requirement |
|----|-------------|
| FR-02.1 | Pressing the Space key fires a projectile from the nose of the aircraft. |
| FR-02.2 | Projectiles travel upward at a constant velocity until they leave the canvas or hit an obstacle. |
| FR-02.3 | A fire-rate limiter enforces a minimum interval of 150ms between shots to prevent spamming. |
| FR-02.4 | A maximum of 10 active projectiles may exist on screen simultaneously. |
| FR-02.5 | Projectiles are rendered as small bright elongated shapes (laser bolts). |

### FR-03: Obstacles
| ID | Requirement |
|----|-------------|
| FR-03.1 | Obstacles spawn at random horizontal positions along the top edge of the canvas. |
| FR-03.2 | Obstacles drift downward at varying speeds. |
| FR-03.3 | Two obstacle types exist: **Asteroids** and **Debris**. |
| FR-03.4 | **Asteroids** are irregular, roughly circular rocky shapes. They come in three sizes: Small (20px), Medium (35px), Large (50px). |
| FR-03.5 | **Debris** consists of angular metallic fragments of destroyed spacecraft. They are smaller and faster than asteroids. |
| FR-03.6 | Obstacle spawn rate increases over time to raise difficulty. |
| FR-03.7 | Obstacles that leave the bottom of the canvas are removed from the game. |
| FR-03.8 | Some obstacles may have slight horizontal drift (not purely vertical). |

### FR-04: Collision Detection
| ID | Requirement |
|----|-------------|
| FR-04.1 | Collision is detected using axis-aligned bounding box (AABB) or circle-based hit testing. |
| FR-04.2 | **Projectile vs. Obstacle:** The obstacle is destroyed; the projectile is removed; score is awarded; a destruction animation plays. |
| FR-04.3 | **Obstacle vs. Player Aircraft:** The player aircraft is destroyed; the game ends; a destruction animation plays. |
| FR-04.4 | Large asteroids, when destroyed, split into 2 smaller asteroids that scatter. |

### FR-05: Score System
| ID | Requirement |
|----|-------------|
| FR-05.1 | Score is displayed continuously in the top-right corner of the canvas. |
| FR-05.2 | Points are awarded per obstacle destroyed: |

| Obstacle | Points |
|----------|--------|
| Small Asteroid | 50 |
| Medium Asteroid | 100 |
| Large Asteroid | 150 |
| Debris | 75 |

| ID | Requirement |
|----|-------------|
| FR-05.3 | A survival time bonus of +10 points is awarded every 5 seconds the player stays alive. |
| FR-05.4 | The current high score (persisted in `localStorage`) is displayed alongside the current score. |
| FR-05.5 | If the player beats the high score, a "NEW HIGH SCORE!" message is shown at game over. |

### FR-06: Message Panel
| ID | Requirement |
|----|-------------|
| FR-06.1 | A message panel is rendered at the top-center of the canvas. |
| FR-06.2 | Messages fade in, display for 3 seconds, then fade out. |
| FR-06.3 | Only one message is shown at a time; new messages replace the current one. |
| FR-06.4 | **Encouraging messages** are triggered on score milestones: |

| Trigger | Message (examples) |
|---------|--------------------|
| First kill | "First blood! Keep shooting!" |
| Score >= 500 | "You're on fire!" |
| Score >= 1000 | "Unstoppable!" |
| Score >= 2500 | "Ace Pilot!" |
| Score >= 5000 | "Legendary!" |
| 10-kill streak (no miss) | "Sharpshooter!" |

| ID | Requirement |
|----|-------------|
| FR-06.5 | **Warning messages** are triggered by proximity or game state: |

| Trigger | Message (examples) |
|---------|--------------------|
| Obstacle within 150px of player | "Watch out! Incoming!" |
| 3+ obstacles on screen simultaneously | "It's getting crowded!" |
| 10+ obstacles on screen | "Danger zone!" |
| Player near edge of canvas | "Stay centered, pilot!" |
| No shots fired for 5 seconds | "Don't forget to shoot!" |

| ID | Requirement |
|----|-------------|
| FR-06.6 | Warning messages are styled differently from encouraging messages (e.g., amber/red vs. green/cyan). |

### FR-07: Game States
| ID | Requirement |
|----|-------------|
| FR-07.1 | The game has three states: **Title Screen**, **Playing**, **Game Over**. |
| FR-07.2 | **Title Screen:** Displays game title, controls summary, and "Press ENTER to Start". |
| FR-07.3 | **Playing:** The main game loop is active; player can move, fire, and score. |
| FR-07.4 | **Game Over:** Displays final score, high score, and "Press ENTER to Restart". All game objects freeze or clear. |

### FR-08: Visual Effects
| ID | Requirement |
|----|-------------|
| FR-08.1 | A scrolling starfield background creates the illusion of forward movement through space. |
| FR-08.2 | Obstacle destruction triggers a particle explosion effect (orange/yellow fragments). |
| FR-08.3 | Player destruction triggers a larger explosion effect (red/orange/white). |
| FR-08.4 | Projectiles have a subtle glow or trail effect. |
| FR-08.5 | The player aircraft has a pulsing engine glow. |

---

## 4. Non-Functional Requirements

### NFR-01: Performance
| ID | Requirement |
|----|-------------|
| NFR-01.1 | The game loop runs at 60 FPS on mid-range hardware. |
| NFR-01.2 | Frame-rate-independent movement using delta-time. |
| NFR-01.3 | Object pooling is used for projectiles and particles to minimize garbage collection. |

### NFR-02: Compatibility
| ID | Requirement |
|----|-------------|
| NFR-02.1 | Runs on Chrome, Firefox, Edge, Safari (latest two versions). |
| NFR-02.2 | Canvas scales responsively to window size while maintaining 4:3 aspect ratio. |

### NFR-03: Code Quality
| ID | Requirement |
|----|-------------|
| NFR-03.1 | Code is organized into ES6 modules or clearly separated classes. |
| NFR-03.2 | No external runtime dependencies (no frameworks, no libraries). |
| NFR-03.3 | Constants (speeds, sizes, colors, messages) are centralized in a configuration object. |

---

## 5. Data Design

### 5.1 Game Configuration Object

```javascript
const CONFIG = {
  canvas: { width: 800, height: 600 },
  player: {
    width: 40,
    height: 50,
    speed: 300,           // pixels per second
    fireRate: 150,        // ms between shots
    maxProjectiles: 10,
  },
  projectile: {
    width: 4,
    height: 12,
    speed: 500,           // pixels per second
  },
  obstacles: {
    spawnIntervalStart: 1500,  // ms at game start
    spawnIntervalMin: 300,     // ms minimum at peak difficulty
    spawnRampTime: 120000,     // ms to reach peak difficulty
    asteroid: {
      small:  { radius: 10, speed: [80, 150],  points: 50  },
      medium: { radius: 17, speed: [60, 120],  points: 100 },
      large:  { radius: 25, speed: [40, 90],   points: 150 },
    },
    debris: {
      width: 15, height: 20,
      speed: [120, 200],
      points: 75,
    },
  },
  messages: {
    displayDuration: 3000,     // ms
    fadeDuration: 500,         // ms
    warningProximity: 150,     // px
  },
  survivalBonus: {
    interval: 5000,            // ms
    points: 10,
  },
  starfield: {
    starCount: 120,
    speedRange: [30, 100],     // pixels per second
  },
};
```

### 5.2 Entity Structures

```
Player {
  x, y           : number    // center position
  width, height   : number
  alive           : boolean
  lastFireTime    : number   // timestamp of last shot
}

Projectile {
  x, y           : number
  width, height   : number
  active          : boolean
  speed           : number
}

Obstacle {
  x, y           : number
  type            : "asteroid" | "debris"
  size            : "small" | "medium" | "large"  // asteroids only
  radius | width  : number
  speedY          : number   // downward speed
  speedX          : number   // horizontal drift
  points          : number
  active          : boolean
}

Particle {
  x, y           : number
  vx, vy         : number   // velocity
  life           : number   // remaining lifetime (seconds)
  color          : string
  size           : number
}
```

### 5.3 Persistent Data
| Key | Storage | Content |
|-----|---------|---------|
| `spaceShooterHighScore` | localStorage | Integer -- all-time high score |

---

## 6. Module Design

### 6.1 Module Breakdown

```
index.html          -- Entry point, canvas element, base CSS
js/
  main.js           -- Initialization, game loop, state management
  config.js         -- CONFIG constant
  input.js          -- Keyboard input handler
  player.js         -- Player aircraft logic and rendering
  projectile.js     -- Projectile pool and logic
  obstacle.js       -- Obstacle spawning, movement, types
  collision.js      -- Collision detection routines
  particles.js      -- Particle system for explosions
  hud.js            -- Score display and HUD rendering
  messages.js       -- Message panel logic and rendering
  starfield.js      -- Background starfield effect
  utils.js          -- Shared helpers (random range, clamp, AABB)
```

### 6.2 Game Loop (main.js)

```
function gameLoop(timestamp) {
    deltaTime = (timestamp - lastTimestamp) / 1000
    lastTimestamp = timestamp

    update(deltaTime)
    render(ctx)

    requestAnimationFrame(gameLoop)
}

function update(dt) {
    handleInput(dt)
    updatePlayer(dt)
    updateProjectiles(dt)
    updateObstacles(dt)
    checkCollisions()
    updateParticles(dt)
    updateMessages(dt)
    updateStarfield(dt)
    checkSurvivalBonus()
    checkMessageTriggers()
}

function render(ctx) {
    clearCanvas(ctx)
    renderStarfield(ctx)
    renderObstacles(ctx)
    renderProjectiles(ctx)
    renderPlayer(ctx)
    renderParticles(ctx)
    renderHUD(ctx)
    renderMessages(ctx)
}
```

### 6.3 Input Handler (input.js)

```
Tracked keys: ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Space, Enter

State map:
  keys = { ArrowUp: false, ArrowDown: false, ... }

Events:
  keydown -> keys[e.code] = true
  keyup   -> keys[e.code] = false

Exports:
  isKeyDown(code) : boolean
  isKeyPressed(code) : boolean  // true only on first frame
```

Calls `e.preventDefault()` for tracked keys to suppress browser scrolling.

### 6.4 Collision Detection (collision.js)

```
Projectile vs Obstacle:
  For each active projectile P, for each active obstacle O:
    if AABB(P, O) or circleRect(P, O):
      -> destroy O (spawn particles, add score)
      -> deactivate P
      -> if O is large asteroid, spawn 2 medium; if medium, spawn 2 small

Obstacle vs Player:
  For each active obstacle O:
    if AABB(O, player) or circleRect(O, player):
      -> destroy player (spawn large explosion)
      -> set gameState = GAME_OVER
```

### 6.5 Message System (messages.js)

```
State:
  currentMessage: { text, type, startTime, opacity }
  triggers: Map of condition -> { message, fired }

showMessage(text, type):
  currentMessage = { text, type, startTime: now, opacity: 0 }

updateMessages(dt):
  if currentMessage exists:
    elapsed = now - startTime
    if elapsed < fadeDuration:        opacity ramps 0 -> 1
    elif elapsed < displayDuration:   opacity = 1
    elif elapsed < display + fade:    opacity ramps 1 -> 0
    else:                             currentMessage = null

renderMessages(ctx):
  if currentMessage:
    set font, alpha = opacity
    color = type === 'warning' ? '#FF6600' : '#00FFCC'
    drawText centered at top of canvas

checkMessageTriggers(score, killStreak, obstacles, player):
  evaluate each trigger condition
  fire appropriate showMessage() call
```

---

## 7. Interface Design

### 7.1 Screen Layout

```
+--------------------------------------------------+
|  [Message Panel - centered, top]                  |
|                                 SCORE: 1250       |
|                                 HI:    3400       |
|                                                    |
|        *          <>                               |
|    *        *              <>                      |
|                 *                                  |
|                        |                           |
|                        |  (projectile)             |
|                                                    |
|                       /\                           |
|                      /  \                          |
|                     /____\                         |
+--------------------------------------------------+
```

### 7.2 Title Screen

```
+--------------------------------------------------+
|                                                    |
|                                                    |
|           S P A C E   S H O O T E R              |
|                                                    |
|            [Arrow Keys] - Move                    |
|            [Space]      - Fire                    |
|                                                    |
|           Press ENTER to Start                    |
|                                                    |
+--------------------------------------------------+
```

### 7.3 Game Over Screen

```
+--------------------------------------------------+
|                                                    |
|              G A M E   O V E R                    |
|                                                    |
|              Score:  1250                          |
|              Best:   3400                          |
|                                                    |
|           Press ENTER to Restart                  |
|                                                    |
+--------------------------------------------------+
```

---

## 8. Difficulty Progression

| Time Elapsed | Spawn Interval | Max Simultaneous Obstacles | Obstacle Speed Multiplier |
|-------------|---------------|---------------------------|--------------------------|
| 0 - 30s | 1500ms | 5 | 1.0x |
| 30s - 60s | 1000ms | 8 | 1.2x |
| 60s - 120s | 700ms | 12 | 1.4x |
| 120s+ | 300ms | 20 | 1.6x |

The spawn interval is interpolated linearly between start and minimum values over `spawnRampTime`.

---

## 9. Audio (Optional / Future Enhancement)

Audio is not in scope for v1.0. The architecture accommodates a future `audio.js` module with the following hooks:
- `playSound('fire')` on projectile spawn
- `playSound('explosion_small')` on obstacle destroy
- `playSound('explosion_large')` on player destroy
- Background music loop during Playing state

---

## 10. Testing Strategy

| Area | Method |
|------|--------|
| Collision accuracy | Visual overlay of bounding boxes (debug mode toggle) |
| Frame rate | FPS counter rendered in debug mode |
| Input responsiveness | Manual play testing for simultaneous key presses |
| Score correctness | Console logging of score events |
| Message triggers | Forced score/state injection via debug console |
| Edge cases | Player at canvas bounds, max projectiles, rapid fire |
| Browser compat | Manual test on Chrome, Firefox, Safari, Edge |

Debug mode is toggled by pressing the `D` key during gameplay.

---

## 11. File Delivery Structure

```
game1/
  index.html
  css/
    style.css
  js/
    config.js
    main.js
    input.js
    player.js
    projectile.js
    obstacle.js
    collision.js
    particles.js
    hud.js
    messages.js
    starfield.js
    utils.js
  SDD.md
```

---

## 12. Acceptance Criteria

1. Player aircraft moves smoothly in all four directions with arrow keys and stays within canvas bounds.
2. Space key fires projectiles upward with enforced rate limiting.
3. Asteroids (3 sizes) and debris spawn from the top and move downward.
4. Projectile-obstacle collision destroys the obstacle, awards correct points, and plays a particle effect.
5. Large asteroids split into smaller ones on destruction.
6. Obstacle-player collision destroys the player and transitions to Game Over.
7. Score displays in real-time; high score persists across sessions via localStorage.
8. Message panel shows encouraging messages at score milestones and warnings on proximity threats.
9. Starfield background scrolls continuously.
10. Game runs at 60 FPS with delta-time-based movement.
11. Title screen and Game Over screen allow starting/restarting with Enter key.
12. No external dependencies -- single folder, opens in a browser.

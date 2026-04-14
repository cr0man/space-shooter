# Space Arcade Shooter - Implementation Tasks

## Task 1: Project Scaffolding & Configuration
**Status:** [x] Done
**Files:** `index.html`, `css/style.css`, `js/config.js`, `js/utils.js`
**SDD Refs:** Section 2.2, 5.1, 6.1, 11, NFR-02, NFR-03

- Create `index.html` with canvas element (800x600), link CSS and JS modules
- Create `css/style.css` with page layout, canvas centering, responsive scaling (4:3 aspect ratio)
- Create `js/config.js` with the full CONFIG object (canvas, player, projectile, obstacles, messages, starfield constants)
- Create `js/utils.js` with shared helpers: `randomRange()`, `clamp()`, `aabbCollision()`, `circleRectCollision()`

---

## Task 2: Game Loop & State Management
**Status:** [x] Done
**Files:** `js/main.js`
**SDD Refs:** Section 6.2, FR-07

- Implement `main.js` as the entry point module
- Set up `requestAnimationFrame` game loop with delta-time calculation
- Implement three game states: `TITLE`, `PLAYING`, `GAME_OVER`
- Implement `update(dt)` and `render(ctx)` dispatcher functions that delegate to subsystems based on current state
- Wire Enter key to transition: TITLE -> PLAYING, GAME_OVER -> PLAYING (reset)

---

## Task 3: Input Handler
**Status:** [x] Done
**Files:** `js/input.js`
**SDD Refs:** Section 6.3, FR-01.2, FR-01.3, FR-02.1

- Track key state for: ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Space, Enter
- Implement `isKeyDown(code)` for continuous input (movement)
- Implement `isKeyPressed(code)` for single-fire input (fire, enter) -- true only on first frame
- Call `e.preventDefault()` on tracked keys to suppress browser scrolling
- Reset pressed-key state each frame

---

## Task 4: Starfield Background
**Status:** [x] Done
**Files:** `js/starfield.js`
**SDD Refs:** FR-08.1, Section 5.1 (starfield config)

- Initialize 120 stars at random positions with random speeds (30-100 px/s)
- Update star positions downward each frame (delta-time based)
- Wrap stars back to top when they exit the bottom
- Render stars as small white dots with varying brightness/size
- Starfield runs in all game states (background is always alive)

---

## Task 5: Player Aircraft
**Status:** [x] Done
**Files:** `js/player.js`
**SDD Refs:** FR-01, Section 5.2 (Player entity)

- Create player entity: position (center-bottom), dimensions (40x50), alive state
- Implement movement: read arrow keys, move at 300 px/s, delta-time based
- Clamp position to canvas bounds (cannot move off-screen)
- Render aircraft as a triangular/ship shape facing upward
- Render exhaust/thruster flame with pulsing animation (FR-08.5)
- Expose `reset()` to reinitialize on game restart

---

## Task 6: Projectile System
**Status:** [x] Done
**Files:** `js/projectile.js`
**SDD Refs:** FR-02, Section 5.2 (Projectile entity), NFR-01.3

- Implement projectile pool (max 10 active projectiles for object pooling)
- Fire projectile from aircraft nose on Space key press
- Enforce 150ms fire-rate limiter between shots
- Move projectiles upward at 500 px/s (delta-time based)
- Deactivate projectiles that leave the top of the canvas
- Render as bright elongated laser bolts with subtle glow/trail effect (FR-08.4)
- Expose `reset()` to clear all projectiles on game restart

---

## Task 7: Obstacle System
**Status:** [x] Done
**Files:** `js/obstacle.js`
**SDD Refs:** FR-03, Section 5.2 (Obstacle entity), Section 8 (Difficulty)

- Spawn obstacles at random x-positions along the top edge
- Implement two types: Asteroids (small/medium/large) and Debris
- Asteroids: irregular circular shapes, 3 sizes (radius 10/17/25), speeds per config
- Debris: angular metallic fragments (15x20), faster than asteroids
- Apply optional horizontal drift to some obstacles (FR-03.8)
- Implement difficulty ramp: spawn interval decreases from 1500ms to 300ms over 120s
- Enforce max simultaneous obstacles per difficulty tier (5/8/12/20)
- Apply speed multiplier per difficulty tier (1.0x/1.2x/1.4x/1.6x)
- Remove obstacles that exit the bottom of the canvas
- Expose `spawnChildAsteroids(x, y, parentSize)` for asteroid splitting
- Expose `reset()` to clear all obstacles on game restart

---

## Task 8: Collision Detection
**Status:** [x] Done
**Files:** `js/collision.js`
**SDD Refs:** FR-04, Section 6.4

- Implement projectile-vs-obstacle collision:
  - Destroy obstacle, deactivate projectile
  - Award points to score
  - Trigger particle explosion
  - Large asteroid -> spawn 2 medium; medium -> spawn 2 small (FR-04.4)
- Implement obstacle-vs-player collision:
  - Destroy player (set alive = false)
  - Trigger large explosion
  - Transition game state to GAME_OVER
- Use AABB for rectangular entities, circle-rect for asteroid-vs-rect checks
- Track kill streak (consecutive hits without misses) for message triggers

---

## Task 9: Particle System
**Status:** [x] Done
**Files:** `js/particles.js`
**SDD Refs:** FR-08.2, FR-08.3, NFR-01.3

- Implement particle pool for object reuse (minimize GC)
- Each particle: position, velocity, lifetime, color, size
- `spawnExplosion(x, y, type)`:
  - Obstacle destruction: 10-15 orange/yellow particles, small radius
  - Player destruction: 25-30 red/orange/white particles, large radius
- Update particles: move by velocity, decrease lifetime, shrink size
- Remove/recycle particles when lifetime expires
- Render particles as small fading circles

---

## Task 10: Score System & HUD
**Status:** [x] Done
**Files:** `js/hud.js`
**SDD Refs:** FR-05, Section 5.3

- Maintain current score, increment on obstacle destruction per point table:
  - Small asteroid: 50, Medium: 100, Large: 150, Debris: 75
- Award survival bonus: +10 points every 5 seconds alive (FR-05.3)
- Load/save high score from/to `localStorage` key `spaceShooterHighScore` (FR-05.4)
- Render score and high score in top-right corner of canvas
- Detect and flag new high score at game over (FR-05.5)
- Expose `reset()` to zero score on game restart (preserve high score)

---

## Task 11: Message Panel
**Status:** [x] Done
**Files:** `js/messages.js`
**SDD Refs:** FR-06, Section 6.5

- Render message panel at top-center of canvas
- Implement fade-in (500ms), display (3000ms), fade-out (500ms) lifecycle
- One message at a time; new messages replace current
- **Encouraging messages** (green/cyan) on:
  - First kill: "First blood! Keep shooting!"
  - Score >= 500: "You're on fire!"
  - Score >= 1000: "Unstoppable!"
  - Score >= 2500: "Ace Pilot!"
  - Score >= 5000: "Legendary!"
  - 10-kill streak: "Sharpshooter!"
- **Warning messages** (amber/red) on:
  - Obstacle within 150px of player: "Watch out! Incoming!"
  - 3+ obstacles on screen: "It's getting crowded!"
  - 10+ obstacles on screen: "Danger zone!"
  - Player near canvas edge: "Stay centered, pilot!"
  - No shots fired for 5 seconds: "Don't forget to shoot!"
- Ensure milestone triggers fire only once per game session
- Warning triggers can re-fire with a cooldown to avoid spam

---

## Task 12: Title Screen & Game Over Screen
**Status:** [x] Done (implemented in Task 2, verified complete)
**Files:** `js/main.js` (extend)
**SDD Refs:** FR-07, Section 7.2, 7.3

- **Title Screen:**
  - Render "S P A C E  S H O O T E R" title text, centered
  - Show controls: "[Arrow Keys] - Move" / "[Space] - Fire"
  - Show "Press ENTER to Start"
  - Starfield animates in background
- **Game Over Screen:**
  - Render "G A M E  O V E R" text
  - Show final score and high score
  - Show "NEW HIGH SCORE!" if applicable
  - Show "Press ENTER to Restart"
  - Starfield animates in background

---

## Task 13: Integration & Game Reset
**Status:** [x] Done
**Files:** `js/main.js` (extend)
**SDD Refs:** All FR sections

- Wire all modules into the main game loop (update + render calls)
- Implement full game reset: player, projectiles, obstacles, particles, score, messages, difficulty timer
- Ensure Enter key transitions work cleanly between all states
- Verify no stale state leaks between game sessions

---

## Task 14: Debug Mode
**Status:** [x] Done
**Files:** `js/main.js` (extend)
**SDD Refs:** Section 10

- Toggle debug mode with `D` key during gameplay
- Show FPS counter in top-left corner
- Render collision bounding boxes/circles as colored overlays
- Log score events to console

---

## Task 15: Polish & Testing
**Status:** [x] Done
**Files:** All
**SDD Refs:** Section 10, 12 (Acceptance Criteria)

- Verify all 12 acceptance criteria from SDD Section 12
- Test simultaneous key presses (move + fire)
- Test edge cases: player at bounds, max projectiles, rapid fire, asteroid splitting chain
- Test difficulty ramp over extended play
- Test high score persistence across page reloads
- Test responsive canvas scaling on window resize
- Cross-browser spot check (Chrome, Firefox)
- Performance check: confirm 60 FPS with many objects on screen

---

## Dependency Graph

```
Task 1 (Scaffolding)
  |
  +---> Task 2 (Game Loop)
  |       |
  |       +---> Task 3 (Input)
  |       |       |
  |       |       +---> Task 5 (Player) ----+
  |       |       |                          |
  |       |       +---> Task 6 (Projectiles)-+---> Task 8 (Collision) --+
  |       |                                  |                          |
  |       +---> Task 4 (Starfield)           |                          |
  |       |                                  |                          |
  |       +---> Task 7 (Obstacles) ----------+                          |
  |                                                                     |
  +---> Task 9 (Particles) <-------------------------------------------+
  |
  +---> Task 10 (Score/HUD) <---- Task 8
  |
  +---> Task 11 (Messages) <----- Task 8, Task 10
  |
  +---> Task 12 (Screens) <------ Task 2
  |
  +---> Task 13 (Integration) <-- All above
  |
  +---> Task 14 (Debug) <-------- Task 13
  |
  +---> Task 15 (Polish) <------- Task 14
```

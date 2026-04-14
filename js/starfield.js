import { CONFIG } from './config.js';
import { randomRange } from './utils.js';
import { registerSubsystem } from './registry.js';

const { width, height } = CONFIG.canvas;
const { starCount, speedRange } = CONFIG.starfield;

// ---------------------------------------------------------------------------
// Star pool
// ---------------------------------------------------------------------------
const stars = [];

function initStars() {
  stars.length = 0;
  for (let i = 0; i < starCount; i++) {
    stars.push(createStar(true));
  }
}

function createStar(randomY = false) {
  return {
    x:          randomRange(0, width),
    y:          randomY ? randomRange(0, height) : randomRange(-10, 0),
    speed:      randomRange(speedRange[0], speedRange[1]),
    radius:     randomRange(0.5, 2),
    brightness: randomRange(0.4, 1.0),
  };
}

// ---------------------------------------------------------------------------
// Subsystem
// ---------------------------------------------------------------------------
const starfield = {
  update(dt) {
    for (const star of stars) {
      star.y += star.speed * dt;
      if (star.y > height + star.radius) {
        // Recycle — reset to just above the top
        Object.assign(star, createStar(false));
      }
    }
  },

  render(ctx) {
    for (const star of stars) {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
      ctx.fill();
    }
  },

  reset() {
    initStars();
  },
};

// Boot
initStars();
registerSubsystem('starfield', starfield);

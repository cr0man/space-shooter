export const CONFIG = {
  canvas: { width: 800, height: 600 },
  player: {
    width: 40,
    height: 50,
    speed: 300,
    fireRate: 150,
    maxProjectiles: 10,
  },
  projectile: {
    width: 4,
    height: 12,
    speed: 500,
  },
  obstacles: {
    spawnIntervalStart: 1500,
    spawnIntervalMin: 300,
    spawnRampTime: 120000,
    asteroid: {
      small:  { radius: 10, speed: [80, 150],  points: 50  },
      medium: { radius: 17, speed: [60, 120],  points: 100 },
      large:  { radius: 25, speed: [40, 90],   points: 150 },
    },
    debris: {
      width: 15,
      height: 20,
      speed: [120, 200],
      points: 75,
    },
  },
  messages: {
    displayDuration: 3000,
    fadeDuration: 500,
    warningProximity: 150,
  },
  survivalBonus: {
    interval: 5000,
    points: 10,
  },
  starfield: {
    starCount: 120,
    speedRange: [30, 100],
  },
  enemy: {
    width: 44,
    height: 50,
    speed: 130,           // px/s for vertical entry / repositioning
    trackSpeed: 55,       // px/s horizontal tracking toward player
    health: 3,            // hits to destroy
    points: 300,
    spawnDelay: 15000,    // ms before first enemy appears
    spawnInterval: 20000, // ms between subsequent spawns
    maxActive: 3,
    projectile: {
      width: 4,
      height: 12,
      speed: 230,
    },
    fireInterval: [2000, 4000], // ms between shots (random in range)
  },
  terror: {
    width: 68, height: 78,
    speed: 85,
    trackSpeed: 75,
    health: 4,              // power-weapon hits to destroy
    points: 1500,
    killThreshold: 4,       // regular kills before first terror spawn
    fireInterval: 1600,     // ms between 360° bursts
    projectileCount: 8,     // directions per burst
    projectilePoolSize: 16, // 2 bursts worth
    projectile: { width: 6, height: 6, speed: 185 },
  },
  powerWeapon: {
    projectile:       { width: 10, height: 18, speed: 420 },
    fireRate:         500,  // ms between shots
    poolSize:          10,  // 5 dual-shots visible simultaneously
    initialAmmo:        5,
    maxAmmo:           10,
    ammoRefillAmount:   3,
    ammoRefillScore:  500,  // +3 ammo every 500 score points
    pointsMultiplier:   2,  // 2× obstacle points when destroyed by power weapon
  },
};

/**
 * Returns a random number between min (inclusive) and max (exclusive).
 */
export function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Clamps value between min and max.
 */
export function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * AABB collision between two rectangles.
 * Each rect: { x, y, width, height } where x,y is the center.
 */
export function aabbCollision(a, b) {
  const aLeft   = a.x - a.width / 2;
  const aRight  = a.x + a.width / 2;
  const aTop    = a.y - a.height / 2;
  const aBottom = a.y + a.height / 2;

  const bLeft   = b.x - b.width / 2;
  const bRight  = b.x + b.width / 2;
  const bTop    = b.y - b.height / 2;
  const bBottom = b.y + b.height / 2;

  return aLeft < bRight && aRight > bLeft && aTop < bBottom && aBottom > bTop;
}

/**
 * Collision between a circle and a rectangle.
 * Circle: { x, y, radius }
 * Rect: { x, y, width, height } where x,y is the center.
 */
export function circleRectCollision(circle, rect) {
  const rectLeft   = rect.x - rect.width / 2;
  const rectRight  = rect.x + rect.width / 2;
  const rectTop    = rect.y - rect.height / 2;
  const rectBottom = rect.y + rect.height / 2;

  const closestX = clamp(circle.x, rectLeft, rectRight);
  const closestY = clamp(circle.y, rectTop, rectBottom);

  const dx = circle.x - closestX;
  const dy = circle.y - closestY;

  return (dx * dx + dy * dy) < (circle.radius * circle.radius);
}

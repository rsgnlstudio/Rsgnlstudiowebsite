/**
 * Shape of the meadow, shared by the ground mesh and the vegetation scatter so
 * everything sits on the same surface. The camera looks down -z from near the
 * origin; `d = -z` is the distance into the field.
 */

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Ground height at (x, z). Keep terrainHeightGLSL in sync. */
export function terrainHeight(x: number, z: number) {
  const d = -z;
  // The field rises gently away from the camera so it fills the frame.
  const rise = 2.2 * smoothstep(-5, 90, d);
  // Rolling swells, kept flat right under the camera.
  const roll =
    (0.35 * Math.sin(x * 0.09 + z * 0.04) +
      0.25 * Math.sin(x * 0.05 - z * 0.11 + 1.3)) *
    smoothstep(2, 18, d);
  // Wooded slopes on both sides.
  const slopes = smoothstep(14, 80, Math.abs(x)) * 9 * smoothstep(0, 40, d);
  return rise + roll + slopes;
}

/** GLSL twin of terrainHeight(), for shaders that move things on the ground. */
export const terrainHeightGLSL = /* glsl */ `
float terrainHeight(float x, float z) {
  float d = -z;
  float rise = 2.2 * smoothstep(-5.0, 90.0, d);
  float roll = (0.35 * sin(x * 0.09 + z * 0.04) + 0.25 * sin(x * 0.05 - z * 0.11 + 1.3))
    * smoothstep(2.0, 18.0, d);
  float slopes = smoothstep(14.0, 80.0, abs(x)) * 9.0 * smoothstep(0.0, 40.0, d);
  return rise + roll + slopes;
}
`;

/**
 * The stream: it comes out of the forest edge left of the middle, winds
 * toward the camera along the foot of the left slope and leaves the frame on
 * the left. x of its middle at distance d. Keep streamGLSL in sync.
 */
export function streamX(d: number) {
  return -11.5 + 8 * smoothstep(20, 60, d) - 0.45 * Math.max(0, 12 - d) + 0.9 * Math.sin(d * 0.19 + 0.7);
}

/** Half-width of the stream's water at distance d. */
export function streamHalfWidth(d: number) {
  return 0.85 + 0.02 * Math.max(d, 0);
}

/**
 * True where (x, d) is in the stream or on its bank, widened by `margin`
 * metres: nothing grows there. By default the bank widens with distance, so
 * the plants on it don't close over the water when seen at a low angle.
 */
export function inStream(x: number, d: number, margin = 0.4 + Math.max(d, 0) * 0.03) {
  return Math.abs(x - streamX(d)) < streamHalfWidth(d) * 1.15 + margin;
}

/** GLSL twin of streamX() and streamHalfWidth(), for the painted ground. */
export const streamGLSL = /* glsl */ `
float streamX(float d) {
  return -11.5 + 8.0 * smoothstep(20.0, 60.0, d) - 0.45 * max(0.0, 12.0 - d) + 0.9 * sin(d * 0.19 + 0.7);
}
float streamHalfWidth(float d) {
  return 0.85 + 0.02 * max(d, 0.0);
}
`;

/** Nearest and farthest scatter distances for the meadow vegetation. */
export const FIELD = { near: 1.2, far: 85 } as const;

/**
 * Ground seen from the night top view (with margin for wide and portrait
 * screens): |x| <= halfWidth, d from near to far. The day scatter is a wedge
 * that fills the low camera's view; part of each kind fills this instead.
 */
export const OVERHEAD = { halfWidth: 120, near: -40, far: 125 } as const;

/**
 * A random ground point (x, d) inside OVERHEAD. With `skipNearField`, points
 * close in front of the day camera are re-rolled: the day wedge covers them,
 * and sprites sized for the top view would loom there.
 */
export function overheadPoint(rng: () => number, skipNearField = true): [x: number, d: number] {
  for (;;) {
    const x = (rng() * 2 - 1) * OVERHEAD.halfWidth;
    const d = OVERHEAD.near + rng() * (OVERHEAD.far - OVERHEAD.near);
    const nearField = d > -2 && d < 30 && Math.abs(x) < d * 1.1 + 4;
    if (!skipNearField || !nearField) return [x, d];
  }
}

/**
 * Distance along a ray to the ground, by marching and then bisecting.
 * Returns `max` when the ray doesn't hit within it (e.g. it points at the sky).
 */
export function rayGroundDistance(
  origin: { x: number; y: number; z: number },
  dir: { x: number; y: number; z: number },
  max = 300,
) {
  const above = (s: number) =>
    origin.y + dir.y * s - terrainHeight(origin.x + dir.x * s, origin.z + dir.z * s);
  let prev = 0;
  for (let s = 1; s <= max; s *= 1.08) {
    if (above(s) < 0) {
      let lo = prev;
      let hi = s;
      for (let i = 0; i < 12; i++) {
        const mid = (lo + hi) / 2;
        if (above(mid) < 0) hi = mid;
        else lo = mid;
      }
      return (lo + hi) / 2;
    }
    prev = s;
  }
  return max;
}

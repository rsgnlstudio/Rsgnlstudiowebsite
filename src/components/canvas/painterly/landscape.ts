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

/** Half-width of the open meadow between the tree lines at distance d. */
export function clearingHalfWidth(d: number) {
  return 5.5 + d * 0.26;
}

/** x of the band of blue flowers that winds through the field. */
export function blueBandX(d: number) {
  return -1.6 + Math.sin(d * 0.09 + 0.6) * 2.4 - d * 0.04;
}

/** Nearest and farthest scatter distances for the meadow vegetation. */
export const FIELD = { near: 1.2, far: 85 } as const;

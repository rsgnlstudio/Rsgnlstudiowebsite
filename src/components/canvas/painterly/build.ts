import { homeSections } from "@/config/sections";

/** The day camera: the build-up runs from far away from it to near it. */
const EYE = homeSections[0].camera.position;

/**
 * The intro build-up, `uBuild` 0 -> 1 (sharedUniforms, written by Lights from
 * the store's `intro`). Like a painter working back to front, the far land is
 * laid in first and the meadow at the camera's feet last, in broad sweeps
 * along the horizon, so the front reads as paint going on, not as a wipe.
 *
 * buildAt() is 0 where nothing is painted yet and 1 where the paint is
 * finished. morphPaint (nightLight.ts) brings the paint out of the void with
 * it, and the stroke layers grow their plants up from the root with it.
 *
 * Needs noiseGLSL before it.
 */
export const buildGLSL = /* glsl */ `
uniform float uBuild;

// How long one spot takes to come in, as a share of the build-up.
const float BUILD_SPAN = 0.42;

// 0 = painted first (far), 1 = painted last (at the camera's feet).
float buildOrder(vec3 world) {
  vec2 rel = world.xz - vec2(${EYE[0].toFixed(2)}, ${EYE[2].toFixed(2)});
  float d = max(length(rel), 2.0);
  float order = 1.0 - clamp(log(d * 0.5) / log(80.0), 0.0, 1.0);
  // Sweeps in the camera's view (angle across, log distance in depth), so
  // they keep their size on screen and lie along the horizon.
  vec2 c = vec2(rel.x / d * 4.0, log(d) * 2.6);
  float sweep = vnoise(c) * 0.65 + vnoise(c * 2.7 + 5.1) * 0.35;
  return clamp(order + (sweep - 0.5) * 0.24, 0.0, 1.0);
}

float buildAt(vec3 world) {
  if (uBuild >= 1.0) return 1.0;
  float start = buildOrder(world) * (1.0 - BUILD_SPAN);
  return smoothstep(start, start + BUILD_SPAN, uBuild);
}
`;

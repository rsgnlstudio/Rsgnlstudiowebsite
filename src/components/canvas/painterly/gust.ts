import { Vector2 } from "three";

/**
 * The day's cursor wind, written by CursorWind every frame: a strong wind
 * blowing outward from the cursor, in gusts that run out from it like rings.
 * It is measured on screen, so whatever is drawn around the cursor (near
 * flowers or the far field) is blown away from it. Plants bend away and
 * pollen is blown aside.
 */
export const gustUniforms = {
  /** Cursor in normalized device coordinates. */
  uGustCursor: { value: new Vector2() },
  /** Viewport width / height, so the reach is round on screen. */
  uGustAspect: { value: 1 },
  /** 0 = calm. Around 1 the plants next to the cursor bend about 60 degrees. */
  uGustStrength: { value: 0 },
  /** Reach in NDC units of the screen height (2 = the whole height). */
  uGustRadius: { value: 0.55 },
};

/**
 * `cursorGust(pos, phase)`: the wind at world point `pos` as a screen
 * direction (x right, y up) times its bend in radians, pointing away from the
 * cursor. Needs `uniform float uTime;`.
 */
export const gustGLSL = /* glsl */ `
uniform vec2 uGustCursor;
uniform float uGustAspect;
uniform float uGustStrength;
uniform float uGustRadius;

vec2 cursorGust(vec3 pos, float phase) {
  if (uGustStrength <= 0.0) return vec2(0.0);
  vec4 clip = projectionMatrix * viewMatrix * vec4(pos, 1.0);
  if (clip.w <= 0.0) return vec2(0.0);
  vec2 away = (clip.xy / clip.w - uGustCursor) * vec2(uGustAspect, 1.0);
  float r = length(away) / uGustRadius;
  if (r > 3.0) return vec2(0.0);
  // Strongest close to the cursor, but not right under it, where the
  // direction turns over.
  float reach = exp(-r * r * 0.8) * smoothstep(0.0, 0.2, r);
  // Gusts run outward in rings; each plant flutters in them.
  float rings = 0.6 + 0.4 * sin(uTime * 6.0 - r * 5.0);
  float flutter = 0.12 * sin(uTime * 15.0 + phase * 3.0);
  return away / max(length(away), 1e-4) * uGustStrength * reach * (rings + flutter);
}
`;

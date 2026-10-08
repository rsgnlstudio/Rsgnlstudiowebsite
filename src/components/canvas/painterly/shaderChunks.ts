/** GLSL helpers shared by the painterly materials. */

export const noiseGLSL = /* glsl */ `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
    mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    sum += amp * vnoise(p);
    p = mat2(1.6, 1.2, -1.2, 1.6) * p;
    amp *= 0.5;
  }
  return sum;
}

// Brushstroke field: noise stretched along a direction, so it reads as
// parallel strokes of paint rather than blobs.
float strokes(vec2 p, vec2 dir, float stretch) {
  vec2 d = normalize(dir);
  vec2 q = vec2(dot(p, d) / stretch, dot(p, vec2(-d.y, d.x)));
  return vnoise(q + vnoise(q * 0.5) * 1.5);
}
`;

export const colorGLSL = /* glsl */ `
// Hue rotation in YIQ space, plus saturation and value scaling.
vec3 vary(vec3 c, vec3 v) {
  const mat3 toYIQ = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312);
  const mat3 toRGB = mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703);
  vec3 yiq = toYIQ * c;
  float h = atan(yiq.z, yiq.y) + v.x;
  float chroma = length(yiq.yz) * v.y;
  yiq = vec3(yiq.x * v.z, chroma * cos(h), chroma * sin(h));
  return max(toRGB * yiq, 0.0);
}
`;

/** Needs `uniform vec3 uHaze;` declared before it. */
export const hazeGLSL = /* glsl */ `
vec3 applyHaze(vec3 c, float dist) {
  float f = 1.0 - exp(-max(dist - 18.0, 0.0) * 0.0065);
  return mix(c, uHaze, clamp(f, 0.0, 0.92));
}
`;

/**
 * Sharpens a mipmapped alpha mask so alpha-tested sprites keep their size in
 * the distance instead of thinning out.
 */
export const alphaGLSL = /* glsl */ `
float sharpAlpha(float a) {
  return clamp((a - 0.5) / max(fwidth(a), 0.0001) + 0.5, 0.0, 1.0);
}
`;

/** Needs uTime and uWind. Returns a sideways sway for a point at `pos`. */
export const windGLSL = /* glsl */ `
float windSway(vec3 pos, float phase) {
  // Slow and coherent: under the brushstroke pass, fast motion reads as
  // flicker, so the meadow breathes rather than shivers.
  float gust = vnoise(pos.xz * 0.04 + vec2(uTime * 0.05, uTime * 0.02));
  float sway = sin(uTime * 0.45 + phase * 0.3 + pos.x * 0.12 + pos.z * 0.08) * 0.7
    + sin(uTime * 0.8 + phase) * 0.15;
  return uWind * sway * (0.35 + gust);
}
`;

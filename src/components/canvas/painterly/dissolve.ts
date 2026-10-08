/**
 * The day -> night dissolve. Both worlds evaluate the same field at world
 * positions: painted surfaces vanish where dissolveField(p) < uDissolve, and
 * the dust exists exactly there. So the painting seems to crumble into dust
 * (and the dust to settle back into paint on the way back).
 *
 * Needs noiseGLSL before it and `uniform float uDissolve;`.
 */
export const dissolveGLSL = /* glsl */ `
float dissolveField(vec3 p) {
  // Far first: the horizon crumbles before the meadow under the camera.
  float far = smoothstep(-30.0, 260.0, -p.z);
  float n = fbm(p.xz * 0.05 + vec2(p.y * 0.04, 0.0));
  n = clamp((n - 0.22) / 0.52, 0.0, 1.0);
  // Finer noise, so the front frays instead of running as a clean line.
  float fray = vnoise(p.xz * 0.9 + p.y * 0.7);
  return clamp(0.6 * n + 0.36 * (1.0 - far) + fray * 0.05, 0.0, 1.0);
}
`;

/**
 * For painted fragment shaders: discards the fragment once the dissolve has
 * passed it and returns the glow of the burning edge (HDR, so it blooms), to
 * add to the color. Needs dissolveGLSL and `uniform vec3 uDustEdge;`.
 */
export const paintDissolveGLSL = /* glsl */ `
vec3 dissolvePaint(vec3 world) {
  if (uDissolve < -0.05) return vec3(0.0);
  float gap = dissolveField(world) - uDissolve;
  if (gap < 0.0) discard;
  return uDustEdge * 2.4 * (1.0 - smoothstep(0.0, 0.022, gap));
}
`;

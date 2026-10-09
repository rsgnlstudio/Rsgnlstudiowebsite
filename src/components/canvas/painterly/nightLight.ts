import type { PaletteKey } from "@/config/palette";
import { buildGLSL } from "./build";
import { dustUniforms } from "./dust";
import { sharedUniforms } from "./palette";

/** Palette colors nightLightGLSL reads; add them to the material's palette. */
export const NIGHT_LIGHT_KEYS = ["void", "dust", "dustLit", "cursorLight"] as const satisfies readonly PaletteKey[];

/** Uniforms nightLightGLSL declares (besides the palette). */
export const nightLightUniforms = {
  uTime: sharedUniforms.uTime,
  uMoonDir: sharedUniforms.uMoonDir,
  uMorph: sharedUniforms.uMorph,
  uBuild: sharedUniforms.uBuild,
  uLightPos: dustUniforms.uLightPos,
  uLightStrength: dustUniforms.uLightStrength,
  uLightIntensity: dustUniforms.uLightIntensity,
  uLightRadius: dustUniforms.uLightRadius,
};

/**
 * The dark the night world floats in, faintly clouded, in a view direction.
 * Needs noiseGLSL, `uniform float uTime;` and `uniform vec3 uVoid;`.
 */
export const voidGLSL = /* glsl */ `
vec3 voidColor(vec3 dir) {
  float fog = fbm(dir.xz * 2.2 + dir.y * 1.3 + uTime * 0.004);
  return uVoid * (0.55 + 0.9 * fog);
}
`;

/**
 * The night's light model, shared by the dust and the painted world, so the
 * paint is lit exactly like the dust it turns into: a faint moonlit base that
 * breathes in slow drifts, and the light that follows the cursor (HDR near
 * it, so it blooms).
 *
 * morphPaint() is the day -> night morph for painted materials: everywhere at
 * once, the paint takes on this light, then sinks into the void the dust
 * floats in. At uMorph = 0 it returns the color unchanged, at 1 it is the
 * void, so the painted world can stop rendering without a cut. During the
 * intro it also brings the paint out of the same void as it is laid in
 * (buildAt, painterly/build.ts).
 *
 * Needs noiseGLSL before it and the NIGHT_LIGHT_KEYS palette uniforms.
 */
export const nightLightGLSL = /* glsl */ `
uniform float uTime;
uniform vec3 uMoonDir;
uniform float uMorph;
uniform vec3 uLightPos;
uniform float uLightStrength;
uniform float uLightIntensity;
uniform float uLightRadius;

${voidGLSL}
${buildGLSL}

// Moonlit base, before the per-speck brightness.
vec3 moonBase(vec3 p, vec3 n) {
  float moon = max(dot(n, uMoonDir), 0.0);
  // Slow drifts of brighter dust, so the dark field is never flat.
  float breathe = 0.45 + 1.1 * vnoise(p.xz * 0.035 + vec2(uTime * 0.012, -uTime * 0.008));
  return uDust * (0.06 + 0.45 * moon) * breathe;
}

// Strength of the cursor light at p.
float cursorFalloff(vec3 p) {
  float reach = distance(uLightPos, p) / uLightRadius;
  return uLightStrength * uLightIntensity / (1.0 + reach * reach * 22.0) * (1.0 - smoothstep(0.55, 1.0, reach));
}

// Its color: warm, turning pale where it is strongest.
vec3 cursorColor(float falloff) {
  return mix(uCursorLight, uDustLit, smoothstep(0.6, 2.5, falloff));
}

// Diffuse term toward the light, with a little wrap.
float cursorDiffuse(vec3 p, vec3 n) {
  vec3 toLight = uLightPos - p;
  float facing = dot(n, toLight / max(length(toLight), 1e-3));
  return mix(max(facing, 0.0), facing * 0.5 + 0.5, 0.2);
}

vec3 morphPaint(vec3 col, vec3 world) {
  // Intro: the paint comes out of the dark as it is laid in.
  if (uBuild < 1.0) col = mix(voidColor(normalize(world - cameraPosition)), col, buildAt(world));
  if (uMorph <= 0.0) return col;
  // Seen from the night camera everything is ground, so light it as ground.
  vec3 n = vec3(0.0, 1.0, 0.0);
  float falloff = cursorFalloff(world);
  vec3 light = moonBase(world, n) * 4.0 + cursorColor(falloff) * cursorDiffuse(world, n) * falloff * 1.1;
  vec3 night = col * light;
  col = mix(col, night, smoothstep(0.0, 0.5, uMorph));
  return mix(col, voidColor(normalize(world - cameraPosition)), smoothstep(0.5, 1.0, uMorph));
}
`;

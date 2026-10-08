import { Color, MathUtils, Vector3 } from "three";
import { DISSOLVE_RANGE } from "@/config/scene";
import {
  PALETTE_KEYS,
  type Palette,
  type PaletteKey,
  type PaletteSet,
} from "@/config/palette";
import { useLookStore } from "@/store/look";

type ColorUniform = { value: Color };
type ColorSet = Record<PaletteKey, Color>;

const uniformName = (key: PaletteKey) =>
  `u${key[0].toUpperCase()}${key.slice(1)}`;

const toColors = (palette: Palette) =>
  Object.fromEntries(
    PALETTE_KEYS.map((key) => [key, new Color(palette[key])]),
  ) as ColorSet;

const parseAll = (palettes: Record<PaletteSet, Palette>) => ({
  day: toColors(palettes.day),
  dusk: toColors(palettes.dusk),
  night: toColors(palettes.night),
});

let colors = parseAll(useLookStore.getState().palettes);

// Re-parse only when leva edits a palette, not every frame.
useLookStore.subscribe((state, prev) => {
  if (state.palettes !== prev.palettes) colors = parseAll(state.palettes);
});

/**
 * One shared uniform per palette color, e.g. `uSkyTop`. Every material that
 * spreads these gets the same objects, so a single update per frame recolors
 * the whole scene.
 */
const paletteUniforms = Object.fromEntries(
  PALETTE_KEYS.map((key) => [uniformName(key), { value: colors.day[key].clone() }]),
) as Record<string, ColorUniform>;

/** Uniforms for a material that uses the given palette colors. */
export function paletteUniformsFor(keys: readonly PaletteKey[]) {
  return Object.fromEntries(
    keys.map((key) => [uniformName(key), paletteUniforms[uniformName(key)]]),
  );
}

/**
 * The live palette colors as an array, for a `uniform vec3 uColors[n]` that
 * shaders index per instance. The entries are the same Color objects as the
 * named uniforms, so they follow the palette every frame.
 */
export function paletteArrayFor(keys: readonly PaletteKey[]) {
  return keys.map((key) => paletteUniforms[uniformName(key)].value);
}

/** GLSL `uniform vec3 uKey;` declarations matching paletteUniformsFor. */
export function paletteGLSL(keys: readonly PaletteKey[]) {
  return keys.map((key) => `uniform vec3 ${uniformName(key)};`).join("\n");
}

/**
 * Time, wind and the light state derived from `night`, shared by every
 * material that needs them. Written by Lights once per frame.
 */
export const sharedUniforms = {
  uTime: { value: 0 },
  uWind: { value: 1 },
  /** Raw night value, 0..1. */
  uNight: { value: 0 },
  /** Sunset strength: peaks while the sun touches the mountains. */
  uDusk: { value: 0 },
  /** Night glow: flowers, fireflies, stars and moon light up. */
  uGlow: { value: 0 },
  uSunDir: { value: new Vector3(0, 1, 0) },
  /** Sun visibility, 1 by day, 0 once it has set. */
  uSunStrength: { value: 1 },
  uMoonDir: { value: new Vector3(0, -1, 0) },
  uMoonStrength: { value: 0 },
  /**
   * Dissolve threshold, -0.1 (all painted) .. 1.1 (all dust). Compared with
   * dissolveField() (painterly/dissolve.ts): painted surfaces are gone where
   * the field is below it, dust exists there.
   */
  uDissolve: { value: -0.1 },
};

/** Painted surfaces are fully gone above this, dust is fully gone below 0. */
export const DISSOLVE_DONE = 1.1;

const direction = (target: Vector3, azimuth: number, elevation: number) =>
  target.set(
    Math.sin(azimuth) * Math.cos(elevation),
    Math.sin(elevation),
    -Math.cos(azimuth) * Math.cos(elevation),
  );

/**
 * Applies `night` to the scene: mixes the palette day -> dusk -> night, sinks
 * the sun behind the mountains in the gap between the trees, raises the moon,
 * turns up the night glow and moves the day -> dust dissolve.
 */
export function updateLight(night: number) {
  const n = MathUtils.clamp(night, 0, 1);
  const toDusk = MathUtils.smoothstep(n, 0, 0.5);
  const toNight = MathUtils.smoothstep(n, 0.5, 1);
  for (const key of PALETTE_KEYS) {
    const target = paletteUniforms[uniformName(key)].value;
    if (n <= 0.5) target.lerpColors(colors.day[key], colors.dusk[key], toDusk);
    else target.lerpColors(colors.dusk[key], colors.night[key], toNight);
  }

  const u = sharedUniforms;
  u.uNight.value = n;
  u.uDusk.value = MathUtils.smoothstep(n, 0.12, 0.45) * (1 - MathUtils.smoothstep(n, 0.55, 0.85));
  u.uGlow.value = MathUtils.smoothstep(n, 0.55, 1);
  // By day the sun hangs low in the gap between the trees, so the meadow is
  // backlit and the sky glows. It touches the ridges around n = 0.4 and is
  // gone by 0.6.
  direction(u.uSunDir.value, -0.06, MathUtils.lerp(0.19, -0.22, MathUtils.smoothstep(n, 0.2, 0.8)));
  u.uSunStrength.value = 1 - MathUtils.smoothstep(n, 0.5, 0.65);
  direction(u.uMoonDir.value, 0.14, MathUtils.lerp(-0.15, 0.25, MathUtils.smoothstep(n, 0.5, 1)));
  u.uMoonStrength.value = MathUtils.smoothstep(n, 0.55, 0.95);
  // Linear in night (already eased), so the front moves at an even pace.
  const dissolve = MathUtils.clamp((n - DISSOLVE_RANGE[0]) / (DISSOLVE_RANGE[1] - DISSOLVE_RANGE[0]), 0, 1);
  u.uDissolve.value = MathUtils.lerp(-0.1, DISSOLVE_DONE, dissolve);
}

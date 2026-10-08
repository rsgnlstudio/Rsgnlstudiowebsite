/**
 * Every color the scene uses, in three sets: warm day, sunset (dusk) and cold
 * night. Materials never hardcode colors: they read shared uniforms mixed by
 * the store's `night` value (see src/components/canvas/painterly/palette.ts):
 * day -> dusk over night 0..0.5, dusk -> night over 0.5..1, while the sun
 * sets behind the mountains.
 *
 * Values are sRGB hex, as picked in a paint program.
 */

export const PALETTE_KEYS = [
  // Sky
  "skyTop",
  "skyMid",
  "skyHorizon",
  "cloudLight",
  "cloudShade",
  "cloudShadow",
  "haze",
  "sun",
  "sunGlow",
  "moon",
  // Mountains (near ridge, far ridge, violet shadow strokes)
  "mountainNear",
  "mountainFar",
  "mountainShade",
  // Conifers
  "coniferDark",
  "coniferLight",
  // Ground
  "groundDeep",
  "groundMid",
  "groundLight",
  "groundWarm",
  "fieldShadow",
  // Grass and stems
  "grassDeep",
  "grassMid",
  "grassLight",
  // Flowers
  "flowerPink",
  "flowerPinkDeep",
  "flowerWhite",
  "flowerYellow",
  "flowerOrange",
  "flowerBlue",
  "flowerPeriwinkle",
  "flowerCenter",
  "flowerGlow",
  "firefly",
  // Foreground leaves
  "leafDark",
  "leafMid",
  "leafLight",
] as const;

export type PaletteKey = (typeof PALETTE_KEYS)[number];
export type Palette = Record<PaletteKey, string>;
export type PaletteSet = "day" | "dusk" | "night";

/** Warm afternoon light. */
export const dayPalette: Palette = {
  skyTop: "#8c84d8",
  skyMid: "#b6aeea",
  skyHorizon: "#f4d4d6",
  cloudLight: "#fff1d6",
  cloudShade: "#f8c4cc",
  cloudShadow: "#b4a6de",
  haze: "#d9c6e6",
  sun: "#fff3cc",
  sunGlow: "#ffd7a0",
  moon: "#eef2ff",

  mountainNear: "#3a3c9e",
  mountainFar: "#7c74c8",
  mountainShade: "#7b56a8",

  coniferDark: "#0c1610",
  coniferLight: "#2c4c32",

  groundDeep: "#1a2a18",
  groundMid: "#3d6a2a",
  groundLight: "#b6ca4a",
  groundWarm: "#e3b25a",
  fieldShadow: "#4c1a30",

  grassDeep: "#132616",
  grassMid: "#2f6a2c",
  grassLight: "#b6d850",

  flowerPink: "#f79fc4",
  flowerPinkDeep: "#e94c88",
  flowerWhite: "#fff6e4",
  flowerYellow: "#fbdc68",
  flowerOrange: "#f6983a",
  flowerBlue: "#4b58d8",
  flowerPeriwinkle: "#9b9cf2",
  flowerCenter: "#f5a524",
  flowerGlow: "#ffe2b0",
  firefly: "#e4ff9a",

  leafDark: "#13261a",
  leafMid: "#2f5a2c",
  leafLight: "#9cc450",

};

/** Sunset: the sun sinks behind the mountains, everything burns orange and magenta. */
export const duskPalette: Palette = {
  skyTop: "#4f4596",
  skyMid: "#d06e9c",
  skyHorizon: "#ffae68",
  cloudLight: "#ffd096",
  cloudShade: "#f37488",
  cloudShadow: "#7a4688",
  haze: "#ec9a98",
  sun: "#fff0b4",
  sunGlow: "#ff8644",
  moon: "#f2e8ff",

  mountainNear: "#4a3a8e",
  mountainFar: "#a66aaa",
  mountainShade: "#5c2a6e",

  coniferDark: "#120a14",
  coniferLight: "#40243c",

  groundDeep: "#1c1418",
  groundMid: "#5e4a2a",
  groundLight: "#d8a050",
  groundWarm: "#ff9a50",
  fieldShadow: "#3e0f26",

  grassDeep: "#170f12",
  grassMid: "#4e4826",
  grassLight: "#e0a84a",

  flowerPink: "#ff88a8",
  flowerPinkDeep: "#e43c6a",
  flowerWhite: "#ffd8b0",
  flowerYellow: "#ffc050",
  flowerOrange: "#ff7a2a",
  flowerBlue: "#5c48b0",
  flowerPeriwinkle: "#a680d4",
  flowerCenter: "#ff9a20",
  flowerGlow: "#ffb070",
  firefly: "#ffe08a",

  leafDark: "#140c10",
  leafMid: "#3e2a22",
  leafLight: "#a8703a",

};

/** Cold moonlit night; flowers and fireflies glow. */
export const nightPalette: Palette = {
  skyTop: "#050a26",
  skyMid: "#13205c",
  skyHorizon: "#2c4c90",
  cloudLight: "#5a6cb4",
  cloudShade: "#2a3474",
  cloudShadow: "#141a46",
  haze: "#1e3468",
  sun: "#ffd0a0",
  sunGlow: "#1c2c6c",
  moon: "#eaf4ff",

  mountainNear: "#0f1a4a",
  mountainFar: "#26397c",
  mountainShade: "#1c1454",

  coniferDark: "#02040a",
  coniferLight: "#0c1a2c",

  groundDeep: "#02060c",
  groundMid: "#0a1e2c",
  groundLight: "#1a4a5c",
  groundWarm: "#24305c",
  fieldShadow: "#0a0822",

  grassDeep: "#02060a",
  grassMid: "#0a222a",
  grassLight: "#2a6a6c",

  flowerPink: "#7656b4",
  flowerPinkDeep: "#5a3a9c",
  flowerWhite: "#8aa2d8",
  flowerYellow: "#a0b4a4",
  flowerOrange: "#8c7a8c",
  flowerBlue: "#3a4ad4",
  flowerPeriwinkle: "#7a92f2",
  flowerCenter: "#c4d482",
  flowerGlow: "#5cc0ff",
  firefly: "#c8ff6a",

  leafDark: "#01040a",
  leafMid: "#081a26",
  leafLight: "#1a4a52",

};

export const palettes: Record<PaletteSet, Palette> = {
  day: dayPalette,
  dusk: duskPalette,
  night: nightPalette,
};

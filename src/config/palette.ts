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
  // The stream (deep water, and the sky's reflection on it)
  "water",
  "waterLight",
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
  "flowerRed",
  "flowerViolet",
  "flowerMagenta",
  "flowerBrown",
  "flowerCenter",
  "flowerGlow",
  "featuredGlow",
  "firefly",
  // The nightingale (plain brown back, rufous tail, pale buff breast, dark eye and beak)
  "nightingale",
  "nightingaleTail",
  "nightingaleBreast",
  "nightingaleDark",
  // Night dust world (and the night light the painting takes on as it turns into it)
  "void",
  "dust",
  "dustLit",
  "cursorLight",
  // The night map (consulting): trails, the active path, the city's lights,
  // the goal, the lantern, the groves around the clearings
  "mapLine",
  "mapPath",
  "cityLight",
  "goalLight",
  "lantern",
  "clearingGlow",
] as const;

export type PaletteKey = (typeof PALETTE_KEYS)[number];
export type Palette = Record<PaletteKey, string>;
export type PaletteSet = "day" | "dusk" | "night";

/** Warm afternoon light, white-balanced toward amber. */
export const dayPalette: Palette = {
  skyTop: "#9084ca",
  skyMid: "#bcaedb",
  skyHorizon: "#fbd4c8",
  cloudLight: "#fff1c8",
  cloudShade: "#ffc4bf",
  cloudShadow: "#baa6d0",
  haze: "#e0c6d7",
  sun: "#fff3bf",
  sunGlow: "#ffd795",
  moon: "#eef2ff",

  mountainNear: "#3c3c94",
  mountainFar: "#8074bb",
  mountainShade: "#7f569d",

  coniferDark: "#0d160e",
  coniferLight: "#2e4c2e",

  groundDeep: "#1b2a16",
  groundMid: "#3f6a27",
  groundLight: "#bcca45",
  groundWarm: "#eab254",
  fieldShadow: "#4f1a2c",
  water: "#31788c",
  waterLight: "#bab0dd",

  grassDeep: "#142614",
  grassMid: "#316a28",
  grassLight: "#bcd84a",

  flowerPink: "#fe9fb7",
  flowerPinkDeep: "#f04c7f",
  flowerWhite: "#fff6d5",
  flowerYellow: "#ffdc61",
  flowerOrange: "#fd9836",
  flowerBlue: "#4e58ca",
  flowerPeriwinkle: "#a09ce2",
  flowerRed: "#df1a10",
  flowerViolet: "#6f3ca8",
  flowerMagenta: "#be1e66",
  flowerBrown: "#402416",
  flowerCenter: "#fca521",
  flowerGlow: "#ffe2a4",
  featuredGlow: "#ffd995",
  firefly: "#ebff90",

  nightingale: "#8e6441",
  nightingaleTail: "#ba582a",
  nightingaleBreast: "#edd2a6",
  nightingaleDark: "#2c1c12",

  void: "#0b0a1c",
  dust: "#3a3a7a",
  dustLit: "#ffd8a8",
  cursorLight: "#ffd2a0",

  mapLine: "#c8b89a",
  mapPath: "#fff0d0",
  cityLight: "#ffc070",
  goalLight: "#fff6e0",
  lantern: "#ffd27a",
  clearingGlow: "#d8f0ff",
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
  water: "#6a4c96",
  waterLight: "#ffb488",

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
  flowerRed: "#ff3c22",
  flowerViolet: "#5a3496",
  flowerMagenta: "#d02c66",
  flowerBrown: "#34160e",
  flowerCenter: "#ff9a20",
  flowerGlow: "#ffb070",
  featuredGlow: "#ffae6a",
  firefly: "#ffe08a",

  nightingale: "#7e4a3a",
  nightingaleTail: "#c4502a",
  nightingaleBreast: "#f4b48a",
  nightingaleDark: "#2c1420",

  void: "#0e0816",
  dust: "#3a2a64",
  dustLit: "#ffc08a",
  cursorLight: "#ffc28c",

  mapLine: "#a88cb4",
  mapPath: "#ffe0b8",
  cityLight: "#ffaa58",
  goalLight: "#fff0d8",
  lantern: "#ffc468",
  clearingGlow: "#c0dcff",
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
  water: "#061430",
  waterLight: "#3c62a8",

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
  flowerRed: "#7c3c84",
  flowerViolet: "#4636b4",
  flowerMagenta: "#6a3aa4",
  flowerBrown: "#0e0e22",
  flowerCenter: "#c4d482",
  flowerGlow: "#5cc0ff",
  featuredGlow: "#8ad8ff",
  firefly: "#c8ff6a",

  nightingale: "#3c3a64",
  nightingaleTail: "#5a3c62",
  nightingaleBreast: "#8a8ab4",
  nightingaleDark: "#0e0e1e",

  void: "#010309",
  dust: "#123c78",
  dustLit: "#8ee6ff",
  cursorLight: "#a8e4ff",

  mapLine: "#6f8fc8",
  mapPath: "#ffe6b8",
  cityLight: "#ffb24e",
  goalLight: "#fff1d0",
  lantern: "#ffc966",
  clearingGlow: "#9fd8ff",
};

export const palettes: Record<PaletteSet, Palette> = {
  day: dayPalette,
  dusk: duskPalette,
  night: nightPalette,
};

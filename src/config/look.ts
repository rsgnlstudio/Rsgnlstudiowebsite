/**
 * Tunable look of the painterly scene. The canvas reads the runtime copy in
 * src/store/look.ts.
 */

export interface LookSettings {
  /** Distance beyond the focus over which blur ramps to full. The focus
   * itself follows the near meadow, below the centre of the frame (see Effects). */
  focusRange: number;
  /** Bokeh size multiplier for the depth-of-field effect. */
  blurStrength: number;
  /** Film grain amount, 0..1. */
  grain: number;
  /** Vignette amount, 0..1. */
  vignette: number;
  /** Multiplier on the flower and grass counts of the device tier. */
  flowerDensity: number;
  /** Wind sway multiplier; 0 freezes the vegetation. */
  wind: number;
  /** Day: strength of the wind blowing out from the cursor; 0 turns it off. */
  cursorWind: number;
  /** Glow (bloom) multiplier for the sun, moon, stars and glowing flowers. */
  glow: number;
  /** Night: brightness of the light that follows the cursor. */
  lightIntensity: number;
  /** Night: reach of the cursor light in world units. */
  lightRadius: number;
  /** Night: dust point size in pixels at the focus distance. */
  dustSize: number;
  /** Night: how much the dust blurs into bokeh away from the focus. */
  dustBokeh: number;
  /** Night: how hard the moving light kicks up the dust. */
  dustKick: number;
  /** Strength of the chromatic fringe toward the frame edges, 0..1. */
  fringe: number;
  /** How much strokes pick up the wet paint around them (wet in wet), 0..1. */
  wetBlend: number;
  /** Day: resting glow of the project flower beds (HDR, so bloom picks it up). */
  featuredRest: number;
  /** Day: how far the project beds' resting glow breathes (0 = steady). */
  featuredBreathe: number;
  /** Day: glow at the peak of a project bed's pulse (its hint that it can be clicked). */
  featuredPulse: number;
  /** Day: extra glow of a hovered project bed. */
  featuredHover: number;
  /** Day: size gain of the flowers of a hovered project bed (0.08 = 8% bigger). */
  featuredGrow: number;
}

export const defaultLook: LookSettings = {
  focusRange: 45,
  blurStrength: 4.5,
  grain: 0.3,
  vignette: 0,
  flowerDensity: 0.3,
  wind: 1.7,
  cursorWind: 1,
  glow: 1.15,
  lightIntensity: 2.6,
  lightRadius: 30,
  dustSize: 1.15,
  dustBokeh: 1,
  dustKick: 1,
  fringe: 0.35,
  wetBlend: 0.85,
  featuredRest: 0.08,
  featuredBreathe: 0.4,
  featuredPulse: 1.3,
  featuredHover: 2.6,
  featuredGrow: 0.1,
};

export type QualityTier = "high" | "low";

export interface QualityPreset {
  /** Device pixel ratio range for the canvas. */
  dpr: [number, number];
  /** Base instance counts at flowerDensity = 1. */
  flowers: number;
  grass: number;
  conifers: number;
  /** Conifers in the woods of the night map, left of the stream (mostly outside the day view). */
  woods: number;
  /** Share of the flower beds' plants (src/config/flowers.ts) to paint. */
  beds: number;
  /** Depth-of-field buffer resolution relative to the canvas. */
  dofResolution: number;
  fireflies: number;
  /** Glowing pollen drifting over the meadow by day. */
  pollen: number;
  stars: number;
  multisampling: number;
  /**
   * Night dust: specks per square metre of ground and of flowers (at full
   * density, see NIGHT_GROUND in painterly/landscape.ts), and points on the
   * trees, the city's buildings and floating motes.
   */
  dust: { ground: number; trees: number; city: number; flowers: number; motes: number };
  /** Resolution of the square texture that records the cursor light's wake. */
  trailSize: number;
}

export const qualityPresets: Record<QualityTier, QualityPreset> = {
  high: {
    dpr: [1, 1.5],
    flowers: 8000,
    grass: 15000,
    conifers: 150,
    woods: 260,
    beds: 1,
    dofResolution: 0.5,
    fireflies: 260,
    pollen: 320,
    stars: 900,
    multisampling: 0,
    dust: { ground: 7.3, trees: 150000, city: 50000, flowers: 1.27, motes: 900 },
    trailSize: 512,
  },
  low: {
    dpr: [1, 1.25],
    flowers: 3400,
    grass: 6000,
    conifers: 100,
    woods: 150,
    beds: 0.65,
    dofResolution: 0.35,
    fireflies: 120,
    pollen: 140,
    stars: 500,
    multisampling: 0,
    dust: { ground: 3.05, trees: 66000, city: 22000, flowers: 0.53, motes: 400 },
    trailSize: 256,
  },
};

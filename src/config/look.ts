/**
 * Tunable look of the painterly scene. Defaults live here; leva (dev only)
 * edits the runtime copy in src/store/look.ts.
 */

export interface LookSettings {
  /** Distance beyond the focus over which blur ramps to full. The focus
   * itself follows the ground at the centre of the frame (see Effects). */
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
  /** Glow (bloom) multiplier for the sun, moon, stars and glowing flowers. */
  glow: number;
}

export const defaultLook: LookSettings = {
  focusRange: 120,
  blurStrength: 6.9,
  grain: 0.3,
  vignette: 0,
  flowerDensity: 0.3,
  wind: 1.7,
  glow: 1.15,
};

export type QualityTier = "high" | "low";

export interface QualityPreset {
  /** Device pixel ratio range for the canvas. */
  dpr: [number, number];
  /** Base instance counts at flowerDensity = 1. */
  flowers: number;
  grass: number;
  conifers: number;
  /** Depth-of-field buffer resolution relative to the canvas. */
  dofResolution: number;
  fireflies: number;
  stars: number;
  multisampling: number;
}

export const qualityPresets: Record<QualityTier, QualityPreset> = {
  high: {
    dpr: [1, 1.5],
    flowers: 8000,
    grass: 10000,
    conifers: 150,
    dofResolution: 0.5,
    fireflies: 260,
    stars: 900,
    multisampling: 0,
  },
  low: {
    dpr: [1, 1.25],
    flowers: 3400,
    grass: 4200,
    conifers: 100,
    dofResolution: 0.35,
    fireflies: 120,
    stars: 500,
    multisampling: 0,
  },
};

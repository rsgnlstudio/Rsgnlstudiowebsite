/**
 * Tunable look of the painterly scene. Defaults live here; leva (dev only)
 * edits the runtime copy in src/store/look.ts.
 */

export interface LookSettings {
  /** Distance from the camera (world units) that is perfectly sharp. */
  focusDistance: number;
  /** Distance beyond the focus over which blur ramps to full. */
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
  /** Repaint the frame with brushstrokes (off shows the raw render). */
  brushStrokes: boolean;
  /** Brushstroke size multiplier. */
  strokeScale: number;
  /** Glow (bloom) multiplier for the sun, moon, stars and glowing flowers. */
  glow: number;
}

export const defaultLook: LookSettings = {
  focusDistance: 10,
  focusRange: 70,
  blurStrength: 2,
  grain: 0.32,
  vignette: 0.35,
  flowerDensity: 1,
  wind: 1,
  brushStrokes: true,
  strokeScale: 1,
  glow: 1,
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
  /** Number of brushstroke layers, coarse to fine (max 4). The finest
   * layer is the most expensive effect, so the low tier drops it. */
  strokeLayers: number;
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
    strokeLayers: 4,
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
    strokeLayers: 3,
    fireflies: 120,
    stars: 500,
    multisampling: 0,
  },
};

import { PROJECT_BEDS } from "@/config/flowers";

/**
 * The project beds' glow, written by FlowerBeds every frame and read by the
 * stroke material of their layer (`featured` in StrokeMaterialOptions).
 * Strokes carry their bed's index (Stroke.feature); its entry in
 * uFeatureHover is how hovered that bed is.
 */
export const featuredUniforms = {
  /** Per project bed, 0..1: eased toward 1 while hovered. */
  uFeatureHover: { value: PROJECT_BEDS.map(() => 0) },
  /** Resting glow; fades out as the day morphs into the night. */
  uFeatureRest: { value: 0 },
  /** How far the resting glow breathes (0 = steady, e.g. reduced motion). */
  uFeatureBreathe: { value: 0 },
  /**
   * Per project bed: uTime at which its latest pulse started. Now and then a
   * bed flares up on its own (a ripple of light running through its
   * flowers), as a hint that it can be clicked.
   */
  uFeaturePulseStart: { value: PROJECT_BEDS.map(() => -100) },
  /** Glow at the peak of a pulse (0 = no pulses, e.g. reduced motion). */
  uFeaturePulseGlow: { value: 0 },
  /** Extra glow at full hover. */
  uFeatureHoverGlow: { value: 0 },
  /** Size gain at full hover. */
  uFeatureGrow: { value: 0 },
};

export const FEATURE_COUNT = PROJECT_BEDS.length;

/** Seconds a pulse takes to run through a bed, and the spread of its ripple. */
export const PULSE = { duration: 1.8, ripple: 0.7 } as const;

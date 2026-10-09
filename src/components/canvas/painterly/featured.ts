import { FEATURED_FLOWERS } from "@/config/flowers";

/**
 * The featured flowers' glow, written by FeaturedFlowers every frame and read
 * by the stroke material of their layer (`featured` in StrokeMaterialOptions).
 * Strokes carry their flower's index (Stroke.feature); its entry in
 * uFeatureHover is how hovered that flower is.
 */
export const featuredUniforms = {
  /** Per featured flower, 0..1: eased toward 1 while hovered. */
  uFeatureHover: { value: FEATURED_FLOWERS.map(() => 0) },
  /** Resting glow; fades out as the day morphs into the night. */
  uFeatureRest: { value: 0 },
  /** How far the resting glow breathes (0 = steady, e.g. reduced motion). */
  uFeatureBreathe: { value: 0 },
  /** Extra glow at full hover. */
  uFeatureHoverGlow: { value: 0 },
  /** Size gain at full hover. */
  uFeatureGrow: { value: 0 },
};

export const FEATURE_COUNT = FEATURED_FLOWERS.length;

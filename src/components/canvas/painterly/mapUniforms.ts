import { Vector3, Vector4 } from "three";
import { PLACES } from "@/config/nightMap";

/**
 * State of the night map's layers (MapLines, MapLights), written by NightMap
 * every frame.
 */
export const mapUniforms = {
  /** Index of the active path in PATHS, -1 for none. */
  uActivePath: { value: -1 },
  /** Metres along the active path the panel has reached (lit up to there). */
  uPathReach: { value: 0 },
  /** Path of the clearing under the cursor, glimmering as a preview; -1 for none. */
  uPreviewPath: { value: -1 },
  uPixelRatio: { value: 1 },
  /** Where every place is (world space). */
  uPlacePos: { value: PLACES.map(() => new Vector3()) },
  /** Per place: shown, hovered, lit (on the active path or open), current step (pulses). */
  uPlaceState: { value: PLACES.map(() => new Vector4()) },
};

/** Kinds of places, as numbers for the shader (aKind in MapLights). */
export const PLACE_KIND_INDEX = {
  clearing: 0,
  service: 1,
  summit: 2,
  goal: 3,
  meadow: 4,
  lantern: 5,
  testimonial: 6,
} as const;

import { clearingHalfWidth } from "./landscape";
import { mulberry32 } from "./random";

/** Share of conifers in the tree lines along the meadow; the rest stand far off. */
export const CONIFER_EDGE_SHARE = 0.72;

/** Where the conifers stand and how big they are. */
export interface ConiferLayout {
  count: number;
  /** Base position; y is relative to the ground. */
  offset: Float32Array; // vec3
  /** Signed crown width (negative mirrors the tree), height. */
  size: Float32Array; // vec2
  /** 1 for the hazy far tree line, 0 for the tree lines along the meadow. */
  far: Uint8Array;
  /** Color variation: hue shift (radians), saturation and value multipliers. */
  variation: Float32Array; // vec3
  /** Wind phase. */
  phase: Float32Array;
}

/**
 * Conifer layout, shared by the painted trees (Conifers) and their dust twins
 * (Dust), so the night world stands where the day world did.
 */
export function scatterConifers(count: number): ConiferLayout {
  const data: ConiferLayout = {
    count,
    offset: new Float32Array(count * 3),
    size: new Float32Array(count * 2),
    far: new Uint8Array(count),
    variation: new Float32Array(count * 3),
    phase: new Float32Array(count),
  };
  const rng = mulberry32(4242);
  const edge = Math.round(count * CONIFER_EDGE_SHARE);
  for (let i = 0; i < count; i++) {
    let x: number;
    let d: number;
    let height: number;
    if (i < edge) {
      // Tree lines framing the meadow on both sides.
      const side = i % 2 === 0 ? -1 : 1;
      d = 14 + Math.pow(rng(), 1.4) * 65;
      x = side * (clearingHalfWidth(d) + Math.pow(rng(), 1.5) * d * 1.3);
      height = (13 + rng() * 17) * (1 + d / 120);
    } else {
      // A hazy far tree line below the mountains.
      d = 120 + rng() * 60;
      // Thinner in the middle so the view to the mountains stays open.
      const u = rng() * 2 - 1;
      x = Math.sign(u) * Math.pow(Math.abs(u), 0.6) * d * 1.3;
      height = 4 + rng() * 5;
      data.far[i] = 1;
    }
    // y is relative to the ground; the stroke shader seats the tree (SQUEEZE).
    data.offset.set([x, -0.8, -d], i * 3);
    const slim = i < edge ? 0.27 : 0.45;
    data.size.set([height * slim * (rng() < 0.5 ? -1 : 1), height], i * 2);
    // Two draws that used to pick lean and texture, kept so the layout (and
    // the dust twins) stay where they are.
    rng();
    rng();
    data.variation.set([(rng() - 0.5) * 0.3, 0.8 + rng() * 0.4, 0.75 + rng() * 0.5], i * 3);
    data.phase[i] = rng() * Math.PI * 2;
  }
  return data;
}

import { inStream, streamX } from "./landscape";
import { mulberry32 } from "./random";

/**
 * How the conifers are shared out, after the site's layout sketch: a stand
 * close by on the right, a thinner line behind the stream on the left, the
 * forest edge across the back of the meadow, and a hazy line far off below
 * the mountains (the rest).
 */
const SHARE = { right: 0.27, left: 0.1, edge: 0.5 } as const;

/** Where the conifers stand and how big they are. */
export interface ConiferLayout {
  count: number;
  /** Base position; y is relative to the ground. */
  offset: Float32Array; // vec3
  /** Signed crown width (negative mirrors the tree), height. */
  size: Float32Array; // vec2
  /** 1 for the hazy far tree line, 0 for the trees around the meadow. */
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
  const right = Math.round(count * SHARE.right);
  const left = right + Math.round(count * SHARE.left);
  const edge = left + Math.round(count * SHARE.edge);
  for (let i = 0; i < count; i++) {
    let x: number;
    let d: number;
    let height: number;
    let slim = 0.27;
    if (i < right) {
      // A stand close by on the right, framing the beds; the nearest trees
      // reach out of the frame.
      d = 6 + Math.pow(rng(), 1.3) * 40;
      x = 7.5 + d * 0.15 + Math.pow(rng(), 1.6) * (4 + d * 0.9);
      height = (13 + rng() * 13) * (1 + d / 120);
    } else if (i < left) {
      // A looser line on the left, beyond the stream.
      do {
        d = 34 + Math.pow(rng(), 1.2) * 40;
        x = streamX(d) - 5 - Math.pow(rng(), 1.5) * (6 + d * 0.9);
      } while (inStream(x, d, 3));
      height = 6 + rng() * 6;
    } else if (i < edge) {
      // The forest edge across the back of the meadow, below the mountains;
      // thinner in the middle, where the stream comes out of it.
      do {
        d = 48 + Math.pow(rng(), 0.8) * 24;
        x = (rng() * 2 - 1) * d * 0.95;
      } while (inStream(x, d, 2.5) || (Math.abs(x) < 8 && rng() < 0.4));
      height = 5 + rng() * 4.5;
      slim = 0.7;
    } else {
      // A hazy far tree line below the mountains.
      d = 120 + rng() * 60;
      // Thinner in the middle so the view to the mountains stays open.
      const u = rng() * 2 - 1;
      x = Math.sign(u) * Math.pow(Math.abs(u), 0.6) * d * 1.3;
      height = 4 + rng() * 5;
      slim = 0.45;
      data.far[i] = 1;
    }
    // y is relative to the ground; the stroke shader seats the tree (SQUEEZE).
    data.offset.set([x, -0.8, -d], i * 3);
    data.size.set([height * slim * (rng() < 0.5 ? -1 : 1), height], i * 2);
    data.variation.set([(rng() - 0.5) * 0.3, 0.8 + rng() * 0.4, 0.75 + rng() * 0.5], i * 3);
    data.phase[i] = rng() * Math.PI * 2;
  }
  return data;
}

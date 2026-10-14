import { CLEARING_RADIUS, CLEARINGS } from "@/config/nightMap";
import { inStream, streamX } from "./landscape";
import { distanceToTrail } from "./nightMap";
import { mulberry32, valueNoise } from "./random";

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
  /** Index in CLEARINGS of the grove around a clearing the tree belongs to, -1 for none. */
  grove: Int8Array;
}

/** Trees in the grove around each clearing. */
const GROVE_TREES = 12;

/**
 * True where the woods of the night map grow (src/config/nightMap.ts): left
 * of the stream from the bottom edge of the map to the back forest edge,
 * leaving the clearings and the trails through them open.
 */
function inWoods(x: number, d: number) {
  if (x < -82 || d < -8 || d > 84) return false;
  if (x > (d < 16 ? -24 : streamX(d) - 6)) return false;
  for (const c of CLEARINGS) {
    if (Math.hypot(x - c.position[0], d - c.position[1]) < CLEARING_RADIUS + 1) return false;
  }
  return distanceToTrail(x, d, 3) >= 2.2;
}

/**
 * The woods of the night map, appended after the meadow's trees with their
 * own random sequence, so the day layout doesn't move. Thinner where the day
 * camera looks (inside its view, |x| < 0.8 d + 6), so the day keeps its loose
 * tree line beyond the stream; dense outside it.
 */
function scatterWoods(data: ConiferLayout, from: number, to: number) {
  const rng = mulberry32(6161);
  for (let i = from; i < to; ) {
    const x = -82 + rng() * 64;
    const d = -8 + rng() * 92;
    if (!inWoods(x, d)) continue;
    const seen = Math.abs(x) < d * 0.8 + 6;
    // Thickets and thinner patches.
    if (rng() > (seen ? 0.12 : 0.55 + 0.45 * valueNoise(x * 0.07, d * 0.07, 61))) continue;
    const height = 8 + rng() * 8;
    data.offset.set([x, -0.8, -d], i * 3);
    data.size.set([height * 0.3 * (rng() < 0.5 ? -1 : 1), height], i * 2);
    data.variation.set([(rng() - 0.5) * 0.3, 0.8 + rng() * 0.4, 0.75 + rng() * 0.5], i * 3);
    data.phase[i] = rng() * Math.PI * 2;
    i++;
  }
}

/**
 * A grove in every clearing of the night map: a loose copse of trees,
 * tallest in the middle, standing on its own in the open space the woods
 * leave around it, so each clearing reads as a group of trees that lights
 * up together (the night's counterpart of the day's flower beds). Appended
 * after the woods with their own random sequence. Night only: the painted
 * trees (Conifers) skip them, so by day the clearings stay open.
 */
function scatterGroves(data: ConiferLayout, from: number) {
  const rng = mulberry32(7373);
  let i = from;
  CLEARINGS.forEach((c, grove) => {
    const placed: [number, number][] = [];
    for (let k = 0; k < GROVE_TREES; k++) {
      let x = c.position[0];
      let d = c.position[1];
      // Spread out a little: each tree keeps some room from the others.
      for (let attempt = 0; attempt < 30; attempt++) {
        const a = rng() * Math.PI * 2;
        const r = Math.sqrt(rng()) * CLEARING_RADIUS;
        x = c.position[0] + Math.cos(a) * r;
        d = c.position[1] + Math.sin(a) * r;
        if (placed.every(([px, pd]) => Math.hypot(x - px, d - pd) > 2.4)) break;
      }
      placed.push([x, d]);
      // Taller toward the middle of the grove.
      const middle = 1 - Math.hypot(x - c.position[0], d - c.position[1]) / CLEARING_RADIUS;
      const height = 6 + middle * 4 + rng() * 3;
      data.offset.set([x, -0.8, -d], i * 3);
      data.size.set([height * 0.32 * (rng() < 0.5 ? -1 : 1), height], i * 2);
      data.variation.set([(rng() - 0.5) * 0.3, 0.8 + rng() * 0.4, 0.75 + rng() * 0.5], i * 3);
      data.phase[i] = rng() * Math.PI * 2;
      data.grove[i] = grove;
      i++;
    }
  });
}

/** Number of grove trees appended after the woods (none without woods). */
const groveCount = (woods: number) => (woods > 0 ? CLEARINGS.length * GROVE_TREES : 0);

/**
 * Conifer layout, shared by the painted trees (Conifers) and their dust twins
 * (Dust), so the night world stands where the day world did: `count` trees
 * around the meadow, then `woods` trees in the woods of the night map, then
 * the groves around its clearings.
 */
export function scatterConifers(count: number, woods = 0): ConiferLayout {
  const total = count + woods + groveCount(woods);
  const data: ConiferLayout = {
    count: total,
    offset: new Float32Array(total * 3),
    size: new Float32Array(total * 2),
    far: new Uint8Array(total),
    variation: new Float32Array(total * 3),
    phase: new Float32Array(total),
    grove: new Int8Array(total).fill(-1),
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
  scatterWoods(data, count, count + woods);
  if (woods > 0) scatterGroves(data, count + woods);
  return data;
}

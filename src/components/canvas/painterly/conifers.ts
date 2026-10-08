import { CONIFER_ATLAS } from "./brushTextures";
import { clearingHalfWidth } from "./landscape";
import { mulberry32 } from "./random";
import { allocateSprites } from "./sprites";

/** Share of conifers in the tree lines along the meadow; the rest stand far off. */
export const CONIFER_EDGE_SHARE = 0.72;

/**
 * Conifer layout, shared by the painted trees (Conifers) and their dust twins
 * (Dust), so the night world stands where the day world did. `offset.y` is
 * relative to the ground; size.x is the signed width.
 */
export function scatterConifers(count: number) {
  const data = allocateSprites(count);
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
      data.tint[i] = 0.25;
    } else {
      // A hazy far tree line below the mountains.
      d = 120 + rng() * 60;
      // Thinner in the middle so the view to the mountains stays open.
      const u = rng() * 2 - 1;
      x = Math.sign(u) * Math.pow(Math.abs(u), 0.6) * d * 1.3;
      height = 4 + rng() * 5;
      data.tint[i] = 0.5;
    }
    const z = -d;
    // y is relative to the ground; the shader seats the tree (SQUEEZE).
    data.offset.set([x, -0.8, z], i * 3);
    const slim = i < edge ? 0.27 : 0.45;
    data.size.set([height * slim * (rng() < 0.5 ? -1 : 1), height], i * 2);
    data.lean[i] = (rng() - 0.5) * 0.04;
    data.cell[i] = Math.floor(rng() * CONIFER_ATLAS.cols);
    data.variation.set([(rng() - 0.5) * 0.3, 0.8 + rng() * 0.4, 0.75 + rng() * 0.5], i * 3);
    data.phase[i] = rng() * Math.PI * 2;
  }
  return data;
}

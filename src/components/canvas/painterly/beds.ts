import { type BedArea, FLOWER_BEDS, PROJECT_BEDS } from "@/config/flowers";
import { inStream } from "./landscape";
import { FLOWER_SPECIES, type FlowerKind, type PetalTint, pickTint } from "./plants";
import { mulberry32 } from "./random";

/** A plant in a flower bed. */
export interface BedPlant {
  x: number;
  d: number;
  kind: FlowerKind;
  tint: PetalTint;
  height: number;
  /** Index into FLOWER_BEDS. */
  bed: number;
  /** Project bed it belongs to, 1-based (0 = none); see Stroke.feature. */
  feature: number;
}

/** (x, d) relative to an area's middle, in its own turned frame, as a share of its radii. */
export function areaReach(area: BedArea, x: number, d: number, margin = 0) {
  const turn = area.turn ?? 0;
  const dx = x - area.x;
  const dd = d - area.d;
  const u = dx * Math.cos(turn) + dd * Math.sin(turn);
  const v = -dx * Math.sin(turn) + dd * Math.cos(turn);
  return Math.hypot(u / (area.rx + margin), v / (area.rd + margin));
}

/**
 * An area as drawn: the bed layer is squeezed toward the centre on narrow
 * screens (uTreeSqueeze), so its areas move in and narrow with it.
 */
export function squeezeArea(area: BedArea, squeeze: number): BedArea {
  return { ...area, x: area.x * squeeze, rx: area.rx * squeeze };
}

/** Room left around the beds in the wild meadow, in metres. */
const GAP_MARGIN = 0.3;

const allAreas = FLOWER_BEDS.flatMap((bed) => bed.areas);
const glslFloat = (v: number) => v.toFixed(4);
const gapNear = Math.min(...allAreas.map((a) => a.d - Math.max(a.rx, a.rd))) - GAP_MARGIN;
const gapFar = Math.max(...allAreas.map((a) => a.d + Math.max(a.rx, a.rd))) + GAP_MARGIN;

/**
 * GLSL: inBedGap(xz, squeeze) is 1 where a wild plant rooted at world xz
 * would stand in a flower bed (widened by GAP_MARGIN), with the beds where
 * they are drawn (squeezeArea), else 0. Unsqueezed layers hide their plants
 * there, so the gap moves in with the beds on narrow screens. Generated from
 * the bed config, the same test as areaReach.
 */
export const bedGapGLSL = /* glsl */ `
float bedReach(vec2 p, vec2 centre, vec2 radii, vec2 turn, float squeeze) {
  vec2 q = p - centre * vec2(squeeze, 1.0);
  vec2 uv = vec2(q.x * turn.x + q.y * turn.y, -q.x * turn.y + q.y * turn.x);
  return length(uv / (radii * vec2(squeeze, 1.0) + ${glslFloat(GAP_MARGIN)}));
}
float inBedGap(vec2 xz, float squeeze) {
  vec2 p = vec2(xz.x, -xz.y);
  if (p.y < ${glslFloat(gapNear)} || p.y > ${glslFloat(gapFar)}) return 0.0;
  float reach = 2.0;
${allAreas
  .map((a) => {
    const turn = a.turn ?? 0;
    const v = (x: number, y: number) => `vec2(${glslFloat(x)}, ${glslFloat(y)})`;
    return `  reach = min(reach, bedReach(p, ${v(a.x, a.d)}, ${v(a.rx, a.rd)}, ${v(Math.cos(turn), Math.sin(turn))}, squeeze));`;
  })
  .join("\n")}
  return 1.0 - step(1.0, reach);
}
`;

/**
 * The plants of every flower bed (src/config/flowers.ts), shared by the
 * painted beds (FlowerBeds) and their dust twins (Dust), so the night world
 * stands where the day world did. `scale` thins them out on weaker devices.
 * Plants crowd toward the middle of a bed and thin out at its edge, and
 * nothing grows in the stream.
 */
export function scatterBeds(scale: number): BedPlant[] {
  const plants: BedPlant[] = [];
  FLOWER_BEDS.forEach((bed, index) => {
    const rng = mulberry32(5300 + index * 97);
    const sizes = bed.areas.map((a) => a.rx * a.rd);
    const total = sizes.reduce((sum, s) => sum + s, 0);
    const weights = bed.flowers.reduce((sum, f) => sum + f.weight, 0);
    const feature = index < PROJECT_BEDS.length ? index + 1 : 0;
    const count = Math.round(bed.plants * scale);
    for (let placed = 0, tries = 0; placed < count && tries < count * 50; tries++) {
      let pick = rng() * total;
      const area = bed.areas.find((_, i) => (pick -= sizes[i]) <= 0) ?? bed.areas[0];
      const r = Math.max(area.rx, area.rd) * 1.2;
      const x = area.x + (rng() * 2 - 1) * r;
      const d = area.d + (rng() * 2 - 1) * r;
      const reach = areaReach(area, x, d);
      // Dense in the middle, a ragged edge.
      if (reach > 1 || rng() > 1.15 - reach * reach * 0.6 || inStream(x, d)) continue;
      let w = rng() * weights;
      const flower = bed.flowers.find((f) => (w -= f.weight) <= 0) ?? bed.flowers[0];
      const [h0, h1] = FLOWER_SPECIES[flower.kind].height;
      plants.push({
        x,
        d,
        kind: flower.kind,
        tint: flower.tint ?? pickTint(rng, flower.kind),
        height: h0 + rng() * (h1 - h0),
        bed: index,
        feature,
      });
      placed++;
    }
  });
  return plants;
}

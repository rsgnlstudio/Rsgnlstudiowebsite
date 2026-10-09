import type { PaletteKey } from "@/config/palette";
import { brushCell, type BrushKind } from "./brushes";
import type { Rng } from "./random";
import type { Stroke, StrokeBuffer } from "./strokes";

/**
 * How each plant is painted: the strokes a painter would put down for it,
 * in the plant frame (x sideways, y up, z toward the camera; see strokes.ts).
 * Shared by the meadow, the flowers by the lens and the conifers.
 */

/** Colors every plant layer can use; strokes index into this list. */
export const PLANT_COLORS = [
  "grassDeep",
  "grassMid",
  "grassLight",
  "groundWarm",
  "fieldShadow",
  "flowerPink",
  "flowerPinkDeep",
  "flowerWhite",
  "flowerYellow",
  "flowerOrange",
  "flowerBlue",
  "flowerPeriwinkle",
  "flowerCenter",
  "coniferDark",
  "coniferLight",
] as const satisfies readonly PaletteKey[];

export type PlantColor = (typeof PLANT_COLORS)[number];
export const paint = (key: PlantColor) => PLANT_COLORS.indexOf(key);

/** Petal colors, by tint slot (as picked by the meadow scatter). */
export const PETAL_TINTS = [
  "flowerPink",
  "flowerPinkDeep",
  "flowerWhite",
  "flowerYellow",
  "flowerOrange",
  "flowerBlue",
  "flowerPeriwinkle",
] as const satisfies readonly PlantColor[];

/** The second paint on the brush for each petal color (shows as it runs dry). */
const PETAL_DRY: Record<(typeof PETAL_TINTS)[number], PlantColor> = {
  flowerPink: "flowerPinkDeep",
  flowerPinkDeep: "flowerPink",
  flowerWhite: "flowerYellow",
  flowerYellow: "flowerOrange",
  flowerOrange: "flowerYellow",
  flowerBlue: "flowerPeriwinkle",
  flowerPeriwinkle: "flowerBlue",
};

/** Flower kinds, matching the meadow species list. */
export const FLOWER_KIND = {
  cosmos: 0,
  daisy: 1,
  buttercup: 2,
  lupine: 3,
  rose: 4,
  cluster: 5,
  sideCosmos: 6,
  yarrow: 7,
} as const;

/** Value steps come in halves, so light reads as blocks of paint. */
const stepShade = (x: number) => Math.min(2, Math.max(0, Math.round(x * 2) / 2));

type Vec3 = readonly [number, number, number];

/** Everything a plant builder needs besides its own shape. */
export interface PlantContext {
  out: StrokeBuffer;
  rng: Rng;
  root: Vec3;
  /** Plant height in frame units. */
  height: number;
  /** Wind phase of the whole plant. */
  phase: number;
  /** Base value step of the plant (0 shadow .. 2 light), before quantising. */
  light: number;
  /** Hue, saturation and value variation of the plant. */
  variation: readonly [number, number, number];
  /** Stroke detail, 0 (a distant dab) .. 1 (seen close up). */
  detail: number;
  /** Featured flower index, 1-based (see Stroke.feature). */
  feature?: number;
}

function brush(rng: Rng, kind: BrushKind) {
  return brushCell(kind, Math.floor(rng() * 8));
}

function add(ctx: PlantContext, stroke: Omit<Stroke, "root" | "height" | "phase" | "variation"> & Partial<Stroke>) {
  ctx.out.add({
    root: ctx.root,
    height: ctx.height,
    phase: ctx.phase,
    variation: ctx.variation,
    feature: ctx.feature,
    ...stroke,
  });
}

/** A stem from the root to `top`, gently curved, with a leaf or two. */
function stem(ctx: PlantContext, top: Vec3, leaves: number) {
  const { rng, height } = ctx;
  const width = Math.max(0.012, height * 0.035);
  add(ctx, {
    start: [0, 0, 0],
    vec: top,
    width,
    bend: (rng() - 0.5) * 0.3,
    wave: (rng() - 0.5) * 0.12,
    brush: brush(rng, "round"),
    color: paint("grassDeep"),
    dry: paint("grassMid"),
    dryness: 0.5,
    shade: stepShade(ctx.light - 0.3),
  });
  for (let i = 0; i < leaves; i++) {
    const at = 0.15 + rng() * 0.35;
    const side = i % 2 === 0 ? 1 : -1;
    const len = height * (0.25 + rng() * 0.2);
    add(ctx, {
      start: [top[0] * at, top[1] * at, -0.002],
      vec: [side * len * 0.75, len * 0.65, 0],
      width: len * 0.32,
      bend: side * (0.1 + rng() * 0.3),
      wave: (rng() - 0.5) * 0.15,
      opacity: 0.75 + rng() * 0.25,
      brush: brush(rng, "filbert"),
      color: paint(rng() < 0.7 ? "grassDeep" : "grassMid"),
      dry: paint("grassMid"),
      dryness: 0.5,
      shade: stepShade(ctx.light - 0.4 + rng() * 0.4),
    });
  }
}

/** Petals radiating from `centre`, painted from the centre outward. */
function petalRing(
  ctx: PlantContext,
  centre: Vec3,
  options: {
    count: number;
    length: number;
    width: number;
    tint: (typeof PETAL_TINTS)[number];
    brush: BrushKind;
    /** Vertical squash of the head (1 = facing the camera, 0 = edge-on). */
    squash: number;
    /** Only petals within this angle range (radians), e.g. a cup from the side. */
    arc?: [number, number];
    glow: number;
  },
) {
  const { rng, detail } = ctx;
  const [a0, a1] = options.arc ?? [0, Math.PI * 2];
  const full = !options.arc;
  const turn = rng() * Math.PI * 2;
  const petals: { dx: number; dy: number; len: number; shade: number }[] = [];
  const z = (k: number) => centre[2] + 0.002 * (k + 1);
  for (let i = 0; i < options.count; i++) {
    const t = full ? i / options.count : options.count === 1 ? 0.5 : i / (options.count - 1);
    // Loose, never evenly spaced: a painter's petals, not a diagram.
    const angle = (full ? turn : 0) + a0 + (a1 - a0) * t + (rng() - 0.5) * 0.6;
    const len = options.length * (0.7 + rng() * 0.55);
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    // Upper petals catch the light, lower ones turn into shadow.
    const shade = ctx.light + dy * 0.45 + (rng() - 0.5) * 0.4;
    petals.push({ dx, dy, len, shade });
    add(ctx, {
      start: [centre[0] + dx * len * 0.05, centre[1] + dy * len * 0.05 * options.squash, z(i)],
      vec: [dx * len, dy * len * options.squash, -Math.abs(dy) * len * (1 - options.squash) * 0.5],
      width: options.width * (0.85 + rng() * 0.3),
      bend: (rng() - 0.5) * 0.4,
      wave: (rng() - 0.5) * 0.1,
      brush: brush(rng, options.brush),
      opacity: 0.85 + rng() * 0.15,
      color: paint(options.tint),
      dry: paint(PETAL_DRY[options.tint]),
      dryness: 0.45,
      shade: stepShade(shade),
      sway: 1,
      glow: options.glow,
    });
  }
  if (detail < 0.85) return;
  // Seen close, a petal is several strokes: a lighter one laid over its
  // outer half, and a deep one pulled out from the centre.
  petals.forEach(({ dx, dy, len, shade }, i) => {
    const sq = options.squash;
    const offset = (rng() - 0.5) * 0.3;
    add(ctx, {
      start: [
        centre[0] + dx * len * 0.3 - dy * offset * options.width,
        centre[1] + (dy * len * 0.3 + dx * offset * options.width) * sq,
        z(options.count + i),
      ],
      vec: [dx * len * 0.65, dy * len * 0.65 * sq, 0],
      width: options.width * (0.4 + rng() * 0.2),
      bend: (rng() - 0.5) * 0.4,
      brush: brush(rng, "filbert"),
      opacity: 0.55 + rng() * 0.3,
      color: paint(options.tint),
      dry: paint(options.tint),
      shade: stepShade(shade + 0.6),
      sway: 1,
      glow: options.glow,
    });
    add(ctx, {
      start: [centre[0], centre[1], z(options.count * 2 + i)],
      vec: [dx * len * 0.38, dy * len * 0.38 * sq, 0],
      width: options.width * 0.3,
      brush: brush(rng, "round"),
      color: paint(PETAL_DRY[options.tint]),
      dry: paint(options.tint),
      dryness: 0.6,
      shade: stepShade(shade - 0.3),
      sway: 1,
      glow: options.glow,
    });
  });
}

/**
 * A dab of paint, for flower centres, buds and distant flowers: two touches
 * of the brush, the second smaller, shifted and a shade apart, so the color
 * breaks like real paint instead of sitting there as one flat coin.
 */
function dab(ctx: PlantContext, at: Vec3, size: number, color: PlantColor, dry: PlantColor, shade: number, glow = 0) {
  const { rng } = ctx;
  for (let k = 0; k < 2; k++) {
    const s = size * (k === 0 ? 1 : 0.55 + rng() * 0.2);
    const angle = (rng() - 0.5) * 1.2 + (rng() < 0.5 ? 0 : Math.PI);
    const len = s * (0.9 + rng() * 0.5);
    const cx = at[0] + (k === 0 ? 0 : (rng() - 0.5) * size * 0.5);
    const cy = at[1] + (k === 0 ? 0 : (rng() - 0.2) * size * 0.4);
    add(ctx, {
      start: [cx - (Math.cos(angle) * len) / 2, cy - (Math.sin(angle) * len) / 2, at[2] + k * 0.002],
      vec: [Math.cos(angle) * len, Math.sin(angle) * len, 0],
      width: s * (0.5 + rng() * 0.25),
      bend: (rng() - 0.5) * 0.6,
      wave: (rng() - 0.5) * 0.15,
      opacity: k === 0 ? 0.8 + rng() * 0.2 : 0.5 + rng() * 0.3,
      brush: brush(rng, k === 0 ? "dab" : "filbert"),
      color: paint(k === 0 ? color : dry),
      dry: paint(k === 0 ? dry : color),
      dryness: 0.5,
      shade: stepShade(shade + (k === 0 ? 0 : 0.5)),
      glow,
    });
  }
}

/**
 * One meadow flower. `tint` is a PETAL_TINTS slot; `glow` lights its petals
 * at night.
 */
export function paintFlower(ctx: PlantContext, kind: number, tint: number, glow: number) {
  const { rng, height: H, detail } = ctx;
  const petal = PETAL_TINTS[tint] ?? "flowerPink";
  const lean = (rng() - 0.5) * 0.25 * H;
  const head: Vec3 = [lean, H, 0.02];
  const leaves = detail > 0.6 ? 1 + Math.floor(rng() * 2) : detail > 0.3 ? 1 : 0;

  // Far away a flower is a stem and a dab or two of color.
  if (detail < 0.2 || kind === FLOWER_KIND.cluster) {
    if (detail > 0.1) stem(ctx, [head[0], head[1] * 0.9, 0], 0);
    const n = kind === FLOWER_KIND.cluster ? 2 + Math.floor(rng() * 3) : 1;
    for (let i = 0; i < n; i++) {
      const at: Vec3 = [head[0] + (rng() - 0.5) * H * 0.3, H * (0.75 + rng() * 0.3), 0.02 + i * 0.002];
      const tintI = i === 0 ? petal : PETAL_TINTS[Math.floor(rng() * PETAL_TINTS.length)];
      dab(ctx, at, H * (0.22 + rng() * 0.12), tintI, PETAL_DRY[tintI], ctx.light + (rng() - 0.3) * 0.5, glow);
    }
    return;
  }

  switch (kind) {
    case FLOWER_KIND.cosmos:
    case FLOWER_KIND.rose: {
      stem(ctx, [head[0], head[1] * 0.97, 0], leaves);
      const rose = kind === FLOWER_KIND.rose;
      const r = H * (rose ? 0.17 : 0.2);
      petalRing(ctx, head, {
        count: rose ? 5 : detail > 0.5 ? 8 : 6,
        length: r,
        width: r * (rose ? 0.95 : 0.55),
        tint: petal,
        brush: rose ? "dab" : "filbert",
        squash: 0.55 + rng() * 0.35,
        glow,
      });
      dab(ctx, [head[0], head[1], head[2] + 0.03], r * 0.42, "flowerCenter", "flowerOrange", ctx.light + 0.5);
      break;
    }
    case FLOWER_KIND.daisy: {
      stem(ctx, [head[0], head[1] * 0.97, 0], leaves);
      const r = H * 0.15;
      petalRing(ctx, head, {
        count: detail > 0.5 ? 13 : 8,
        length: r,
        width: r * 0.32,
        tint: petal,
        brush: "round",
        squash: 0.5 + rng() * 0.4,
        glow,
      });
      dab(ctx, [head[0], head[1], head[2] + 0.03], r * 0.6, "flowerYellow", "flowerOrange", ctx.light + 0.5);
      break;
    }
    case FLOWER_KIND.sideCosmos: {
      stem(ctx, [head[0], head[1] * 0.97, 0], leaves);
      const r = H * 0.2;
      // Seen from the side: a cup of petals opening upward.
      petalRing(ctx, [head[0], head[1] - r * 0.15, head[2]], {
        count: 5,
        length: r,
        width: r * 0.55,
        tint: petal,
        brush: "filbert",
        squash: 0.9,
        arc: [0.35, Math.PI - 0.35],
        glow,
      });
      dab(ctx, [head[0], head[1] - r * 0.1, head[2] + 0.03], r * 0.35, "flowerCenter", "flowerOrange", ctx.light);
      break;
    }
    case FLOWER_KIND.buttercup: {
      // A sprig: two or three small cups on branching stems.
      stem(ctx, [head[0], head[1] * 0.8, 0], leaves);
      const heads = 2 + Math.floor(rng() * 2);
      for (let i = 0; i < heads; i++) {
        const top: Vec3 = [head[0] + (i - (heads - 1) / 2) * H * 0.22, H * (0.8 + rng() * 0.25), 0.02 + i * 0.01];
        add(ctx, {
          start: [head[0] * 0.8, H * 0.6, 0.005],
          vec: [top[0] - head[0] * 0.8, top[1] - H * 0.6, 0],
          width: H * 0.025,
          brush: brush(rng, "round"),
          color: paint("grassMid"),
          dry: paint("grassDeep"),
          shade: stepShade(ctx.light - 0.3),
        });
        petalRing(ctx, top, {
          count: 3,
          length: H * 0.09,
          width: H * 0.07,
          tint: petal,
          brush: "dab",
          squash: 0.9,
          arc: [0.5, Math.PI - 0.5],
          glow,
        });
      }
      break;
    }
    case FLOWER_KIND.lupine: {
      // A spike of small dabs, smaller toward the tip.
      stem(ctx, [head[0], head[1] * 0.6, 0], leaves);
      const n = detail > 0.5 ? 12 : 7;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const y = H * (0.55 + 0.45 * t);
        const size = H * 0.1 * (1 - t * 0.6);
        const side = i % 2 === 0 ? 1 : -1;
        dab(
          ctx,
          [head[0] * (0.6 + 0.4 * t) + side * size * 0.3, y, 0.02 + i * 0.002],
          size,
          petal,
          PETAL_DRY[petal],
          ctx.light + t * 0.5 - 0.2 + side * 0.15,
          glow,
        );
      }
      break;
    }
    case FLOWER_KIND.yarrow: {
      // A flat umbel: tiny pale dabs in a low dome.
      stem(ctx, [head[0], head[1] * 0.9, 0], leaves);
      const n = detail > 0.5 ? 9 : 5;
      for (let i = 0; i < n; i++) {
        const t = (i / (n - 1)) * 2 - 1;
        dab(
          ctx,
          [head[0] + t * H * 0.16, H * (0.92 + (1 - t * t) * 0.07), 0.02 + i * 0.002],
          H * 0.07,
          petal,
          PETAL_DRY[petal],
          ctx.light + (1 - t * t) * 0.4 - 0.1,
          glow,
        );
      }
      break;
    }
  }
}

/**
 * A tuft of grass: a few tapering blades from the root, dark at the root,
 * running into light at the tips where the brush runs dry. `sun` (0..1) is
 * how sunlit the tuft is.
 */
export function paintTuft(ctx: PlantContext, sun: number) {
  const { rng, height: H, detail } = ctx;
  const blades = detail > 0.5 ? 3 + Math.floor(rng() * 4) : detail > 0.2 ? 2 + Math.floor(rng() * 2) : 1;
  for (let i = 0; i < blades; i++) {
    const spread = (rng() - 0.5) * 1.2;
    const len = H * (0.6 + rng() * 0.45);
    const lit = rng() < 0.2 + sun * 0.5;
    const warm = rng() < 0.08;
    add(ctx, {
      start: [spread * H * 0.15, -0.02, (rng() - 0.5) * 0.02],
      vec: [spread * len * 0.45, len, 0],
      width: H * (0.055 + rng() * 0.05),
      bend: (rng() - 0.5) * 0.5,
      wave: (rng() - 0.5) * 0.2,
      opacity: 0.7 + rng() * 0.3,
      brush: brush(rng, "round"),
      color: paint(lit ? "grassLight" : "grassMid"),
      dry: paint(warm ? "groundWarm" : "grassMid"),
      dryness: 0.4,
      shade: stepShade(ctx.light + (lit ? -0.1 : -0.2)),
    });
  }
}

/**
 * A fir, painted the way a painter would: first the dark mass blocked in
 * with zigzag strokes across the crown (so no sky shows through), then branch
 * jabs from the trunk outward and down at irregular heights, shorter toward
 * the top, and last a few lit strokes. `width` is the crown's full width at
 * the base; `far` paints it with fewer, broader strokes.
 */
export function paintConifer(ctx: PlantContext, width: number, far: boolean) {
  const { rng, height: H } = ctx;
  const flip = width < 0 ? -1 : 1;
  const W = Math.abs(width);
  const crown = (t: number) => (W / 2) * Math.pow(Math.max(0, 1 - t * 0.95), 0.85);

  // The mass: zigzag strokes across the crown, stacked up the cone.
  const masses = far ? 4 : 9;
  for (let i = 0; i < masses; i++) {
    const t = (i + 0.5) / masses;
    const reach = crown(t) * (0.8 + rng() * 0.25);
    const dir = i % 2 === 0 ? 1 : -1;
    add(ctx, {
      start: [-dir * reach, H * (0.06 + 0.86 * t) + (H / masses) * 0.3, -0.01 - 0.001 * i],
      vec: [dir * reach * 2, -(H / masses) * (0.3 + rng() * 0.5), 0],
      width: (H / masses) * 1.5,
      bend: (rng() - 0.5) * 0.2,
      brush: brush(rng, "flat"),
      color: paint("coniferDark"),
      dry: paint("coniferDark"),
      dryness: 0,
      shade: stepShade(ctx.light - 0.2 + rng() * 0.3),
      sway: 0.3 + t * 0.5,
    });
  }

  // Branch jabs at irregular heights, more low down where the crown is wide.
  const jabs = far ? 10 : Math.round(40 + H * 1.2);
  for (let i = 0; i < jabs; i++) {
    const t = Math.pow(rng(), 0.8);
    const y = H * (0.08 + 0.88 * t);
    const side = (rng() < 0.5 ? 1 : -1) * flip;
    const len = crown(t) * (0.55 + rng() * 0.6);
    const from = side * crown(t) * rng() * 0.25;
    add(ctx, {
      start: [from, y, 0.002 + 0.0005 * i],
      vec: [side * len, -len * (0.1 + rng() * 0.45), 0],
      width: H * (far ? 0.12 : 0.05) * (0.6 + rng() * 0.7),
      bend: side * (rng() - 0.3) * 0.3,
      wave: (rng() - 0.5) * 0.2,
      brush: brush(rng, rng() < 0.5 ? "flat" : "round"),
      opacity: 0.7 + rng() * 0.3,
      color: paint("coniferDark"),
      dry: paint("coniferLight"),
      dryness: 0.25,
      shade: stepShade(ctx.light + (rng() - 0.5) * 0.6),
      sway: 0.4 + t * 0.6,
    });
  }

  // A few tips catch the light, mostly on the side toward the sun.
  const lit = far ? 1 : Math.round(4 + rng() * 6);
  for (let i = 0; i < lit; i++) {
    const t = 0.15 + rng() * 0.75;
    const side = rng() < 0.75 ? -1 : 1;
    const len = crown(t) * (0.3 + rng() * 0.4);
    add(ctx, {
      start: [side * crown(t) * 0.45, H * (0.08 + 0.88 * t), 0.06 + 0.001 * i],
      vec: [side * len, -len * 0.3, 0],
      width: H * 0.035,
      brush: brush(rng, "filbert"),
      color: paint("coniferLight"),
      dry: paint("coniferDark"),
      dryness: 0.3,
      shade: stepShade(ctx.light + 0.3),
      sway: 0.6 + t * 0.4,
    });
  }

  // The leader at the very top.
  add(ctx, {
    start: [0, H * 0.85, 0.05],
    vec: [(rng() - 0.5) * W * 0.05, H * 0.17, 0],
    width: Math.max(W * 0.06, 0.1),
    brush: brush(rng, "round"),
    color: paint("coniferDark"),
    shade: 0.5,
    sway: 1,
  });
}

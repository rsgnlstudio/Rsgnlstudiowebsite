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
  "flowerRed",
  "flowerViolet",
  "flowerMagenta",
  "flowerBrown",
  "flowerCenter",
  "coniferDark",
  "coniferLight",
] as const satisfies readonly PaletteKey[];

export type PlantColor = (typeof PLANT_COLORS)[number];
export const paint = (key: PlantColor) => PLANT_COLORS.indexOf(key);

/** Petal colors a flower can be painted in. */
export const PETAL_TINTS = [
  "flowerPink",
  "flowerPinkDeep",
  "flowerWhite",
  "flowerYellow",
  "flowerOrange",
  "flowerBlue",
  "flowerPeriwinkle",
  "flowerRed",
  "flowerViolet",
  "flowerMagenta",
] as const satisfies readonly PlantColor[];

export type PetalTint = (typeof PETAL_TINTS)[number];

/** The second paint on the brush for each petal color (shows as it runs dry). */
const PETAL_DRY: Record<PetalTint, PlantColor> = {
  flowerPink: "flowerPinkDeep",
  flowerPinkDeep: "flowerPink",
  flowerWhite: "flowerYellow",
  flowerYellow: "flowerOrange",
  flowerOrange: "flowerYellow",
  flowerBlue: "flowerPeriwinkle",
  flowerPeriwinkle: "flowerBlue",
  flowerRed: "flowerMagenta",
  flowerViolet: "flowerBlue",
  flowerMagenta: "flowerPinkDeep",
};

/**
 * The meadow's species, after the site's flower plan: each section of the
 * site has its own flower (see src/config/flowers.ts), and a few wild ones
 * grow in between. `height` is the range in metres, `tints` the petal colors
 * it comes in, by weight. `cluster` is a far flower, a dab or two of paint.
 */
export const FLOWER_SPECIES = {
  /** Schleierkraut (baby's breath): an airy veil of tiny white florets. */
  gypsophila: { height: [0.45, 0.7], tints: { flowerWhite: 9, flowerPink: 1 } },
  /** Mohnblume (corn poppy): four broad red petals around a dark eye. */
  poppy: { height: [0.5, 0.8], tints: { flowerRed: 1 } },
  /** Margerite (ox-eye daisy): white rays around a yellow disc. */
  daisy: { height: [0.45, 0.7], tints: { flowerWhite: 1 } },
  /** Rapunzel-Glockenblume (rampion bellflower): small lilac bells up a slim stem. */
  bellflower: { height: [0.5, 0.8], tints: { flowerPeriwinkle: 2, flowerViolet: 2 } },
  /** Cosmea (cosmos): open, notched petals in pink, white and deep rose. */
  cosmos: { height: [0.6, 0.95], tints: { flowerPink: 4, flowerWhite: 2.5, flowerMagenta: 2.5 } },
  /** Ringelblume (pot marigold): a dense head of orange rays. */
  calendula: { height: [0.3, 0.5], tints: { flowerOrange: 3, flowerYellow: 1 } },
  /** Sumpfdotterblume (marsh marigold): glossy gold cups over round leaves. */
  marshMarigold: { height: [0.22, 0.38], tints: { flowerYellow: 1 } },
  /** Hahnenfuss (buttercup): small yellow cups on branching stems. */
  buttercup: { height: [0.35, 0.6], tints: { flowerYellow: 1 } },
  /** Wiesensalbei (meadow sage): violet spikes of hooded flowers in whorls. */
  sage: { height: [0.4, 0.65], tints: { flowerViolet: 3, flowerBlue: 1 } },
  /** Wiesenklee (red clover): low, round pink heads over three-part leaves. */
  clover: { height: [0.18, 0.32], tints: { flowerPink: 2, flowerMagenta: 1 } },
  /** Spitzwegerich (ribwort plantain): dark seed heads with a ring of pale stamens. */
  plantain: { height: [0.35, 0.55], tints: { flowerWhite: 1 } },
  /** Teufelskralle (round-headed rampion): a ball of curled blue claws. */
  rampion: { height: [0.3, 0.5], tints: { flowerBlue: 2, flowerViolet: 1 } },
  /** A far flower: a dab or two of paint. */
  cluster: {
    height: [0.3, 0.6],
    tints: { flowerWhite: 3, flowerYellow: 2, flowerRed: 1.5, flowerPink: 1.5, flowerViolet: 1.5, flowerOrange: 1 },
  },
} as const satisfies Record<string, { height: readonly [number, number]; tints: Partial<Record<PetalTint, number>> }>;

export type FlowerKind = keyof typeof FLOWER_SPECIES;

/** A petal color of `kind`, picked by its weights. */
export function pickTint(rng: Rng, kind: FlowerKind): PetalTint {
  const entries = Object.entries(FLOWER_SPECIES[kind].tints) as [PetalTint, number][];
  let r = rng() * entries.reduce((sum, [, w]) => sum + w, 0);
  for (const [tint, w] of entries) {
    r -= w;
    if (r <= 0) return tint;
  }
  return entries[0][0];
}

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
  /** Featured flower bed index, 1-based (see Stroke.feature). */
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

/** A stem from `from` (default the root) to `top`, gently curved, with a leaf or two. */
function stem(ctx: PlantContext, top: Vec3, leaves: number, from: Vec3 = [0, 0, 0], widthScale = 1) {
  const { rng, height } = ctx;
  const width = Math.max(0.012, height * 0.035) * widthScale;
  add(ctx, {
    start: from,
    vec: [top[0] - from[0], top[1] - from[1], top[2] - from[2]],
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

/**
 * Long narrow leaves from the root, arching out to both sides (plantain,
 * sage and the like). `length` and `width` are shares of the plant height.
 */
function basalLeaves(ctx: PlantContext, count: number, length: number, width: number, rise = 0.6) {
  const { rng, height: H } = ctx;
  for (let i = 0; i < count; i++) {
    const side = (i % 2 === 0 ? 1 : -1) * (0.4 + rng() * 0.6);
    const len = H * length * (0.75 + rng() * 0.4);
    add(ctx, {
      start: [0, 0, -0.003 - i * 0.0005],
      vec: [side * len, len * rise * (0.6 + rng() * 0.5), 0],
      width: H * width * (0.8 + rng() * 0.4),
      bend: -side * (0.15 + rng() * 0.2),
      wave: (rng() - 0.5) * 0.1,
      opacity: 0.8 + rng() * 0.2,
      brush: brush(rng, "filbert"),
      color: paint(rng() < 0.6 ? "grassMid" : "grassDeep"),
      dry: paint("grassLight"),
      dryness: 0.4,
      shade: stepShade(ctx.light - 0.3 + rng() * 0.4),
      sway: 0.5,
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
    tint: PetalTint;
    brush: BrushKind;
    /** Vertical squash of the head (1 = facing the camera, 0 = edge-on). */
    squash: number;
    /** Only petals within this angle range (radians), e.g. a cup from the side. */
    arc?: [number, number];
    glow: number;
    /** Sideways curve of each petal (a curled claw), as a fraction of its length. */
    curl?: number;
    /** Skip the close-up overpainting (small florets). */
    simple?: boolean;
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
      bend: options.curl ?? (rng() - 0.5) * 0.4,
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
  if (detail < 0.85 || options.simple) return;
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
 * breaks like real paint instead of sitting there as one flat coin. `single`
 * keeps it to one touch (tiny florets).
 */
function dab(
  ctx: PlantContext,
  at: Vec3,
  size: number,
  color: PlantColor,
  dry: PlantColor,
  shade: number,
  glow = 0,
  single = false,
) {
  const { rng } = ctx;
  for (let k = 0; k < (single ? 1 : 2); k++) {
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

/** A thin twig or pedicel from `from` to `to`. */
function twig(ctx: PlantContext, from: Vec3, to: Vec3, width: number, color: PlantColor = "grassMid") {
  const { rng } = ctx;
  add(ctx, {
    start: from,
    vec: [to[0] - from[0], to[1] - from[1], to[2] - from[2]],
    width,
    bend: (rng() - 0.5) * 0.3,
    brush: brush(rng, "round"),
    color: paint(color),
    dry: paint("grassDeep"),
    dryness: 0.4,
    shade: stepShade(ctx.light - 0.2),
  });
}

/**
 * One meadow flower of `kind`, its petals in `tint`; `glow` lights its
 * petals at night.
 */
export function paintFlower(ctx: PlantContext, kind: FlowerKind, tint: PetalTint, glow: number) {
  const { rng, height: H, detail } = ctx;
  const petal = tint;
  const lean = (rng() - 0.5) * 0.25 * H;
  const head: Vec3 = [lean, H, 0.02];
  const leaves = detail > 0.6 ? 1 + Math.floor(rng() * 2) : detail > 0.3 ? 1 : 0;

  // Far away a flower is a stem and a dab or two of color.
  if (detail < 0.2 || kind === "cluster") {
    if (detail > 0.1) stem(ctx, [head[0], head[1] * 0.9, 0], 0);
    const n = kind === "cluster" ? 2 + Math.floor(rng() * 3) : 1;
    for (let i = 0; i < n; i++) {
      const at: Vec3 = [head[0] + (rng() - 0.5) * H * 0.3, H * (0.75 + rng() * 0.3), 0.02 + i * 0.002];
      const tintI = i === 0 || kind !== "cluster" ? petal : pickTint(rng, "cluster");
      dab(ctx, at, H * (0.22 + rng() * 0.12), tintI, PETAL_DRY[tintI], ctx.light + (rng() - 0.3) * 0.5, glow);
    }
    return;
  }

  switch (kind) {
    case "gypsophila": {
      // A dome of fine, forking stems, and over it a veil of tiny florets:
      // first a thin glaze for the haze, then the florets one by one.
      const stems = detail > 0.5 ? 5 : 3;
      const tops: Vec3[] = [];
      for (let i = 0; i < stems; i++) {
        const t = (i / (stems - 1)) * 2 - 1;
        const top: Vec3 = [lean + t * H * 0.42 + (rng() - 0.5) * H * 0.1, H * (0.7 + (1 - t * t) * 0.25), 0.005 + i * 0.001];
        tops.push(top);
        twig(ctx, [0, 0, 0], top, Math.max(0.006, H * 0.014), "grassMid");
      }
      add(ctx, {
        start: [lean - H * 0.5, H * 0.78, 0.01],
        vec: [H * 1.0, H * 0.06, 0],
        width: H * 0.3,
        bend: 0.2,
        opacity: 0.12,
        brush: brush(rng, "filbert"),
        color: paint(petal),
        dry: paint("flowerWhite"),
        dryness: 0.3,
        shade: stepShade(ctx.light + 0.3),
        sway: 1,
        glow: glow * 0.5,
      });
      const florets = detail > 0.6 ? 46 : detail > 0.35 ? 24 : 12;
      for (let i = 0; i < florets; i++) {
        const t = rng() * 2 - 1;
        const from = tops[Math.floor(rng() * tops.length)];
        const at: Vec3 = [
          lean + t * H * 0.5,
          H * (0.62 + Math.sqrt(1 - t * t) * 0.36 * (0.55 + rng() * 0.45)),
          0.02 + i * 0.0008,
        ];
        if (detail > 0.6 && i % 4 === 0) twig(ctx, from, at, Math.max(0.004, H * 0.007), "grassLight");
        dab(ctx, at, H * (0.03 + rng() * 0.025), petal, "flowerWhite", ctx.light + 0.3 + (rng() - 0.5) * 0.6, glow, true);
      }
      break;
    }
    case "poppy": {
      // A thin, slightly crooked stem; four broad, crumpled petals around a
      // near-black eye, and often a nodding bud on a second stem.
      stem(ctx, [head[0], head[1] * 0.97, 0], detail > 0.5 ? 1 : 0, [0, 0, 0], 0.7);
      const r = H * 0.19;
      const squash = 0.45 + rng() * 0.4;
      petalRing(ctx, head, {
        count: 4,
        length: r,
        width: r * 1.15,
        tint: petal,
        brush: "dab",
        squash,
        glow,
      });
      dab(ctx, [head[0], head[1] + r * 0.05, head[2] + 0.03], r * 0.32, "flowerBrown", "coniferDark", ctx.light - 0.3);
      if (detail > 0.6) {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + rng();
          add(ctx, {
            start: [head[0], head[1], head[2] + 0.035],
            vec: [Math.cos(a) * r * 0.32, Math.sin(a) * r * 0.32 * squash, 0],
            width: r * 0.06,
            brush: brush(rng, "round"),
            color: paint("flowerBrown"),
            shade: 0.5,
            sway: 1,
          });
        }
      }
      if (rng() < 0.4) {
        // The bud hangs its head on a hooked stem.
        const side = rng() < 0.5 ? -1 : 1;
        const bud: Vec3 = [side * H * 0.22, H * (0.62 + rng() * 0.15), 0.01];
        add(ctx, {
          start: [0, 0, 0],
          vec: [bud[0], bud[1] + H * 0.08, 0],
          width: Math.max(0.01, H * 0.02),
          bend: side * 0.35,
          brush: brush(rng, "round"),
          color: paint("grassDeep"),
          dry: paint("grassMid"),
          shade: stepShade(ctx.light - 0.3),
        });
        dab(ctx, bud, H * 0.06, "grassMid", petal, ctx.light);
      }
      break;
    }
    case "daisy": {
      stem(ctx, [head[0], head[1] * 0.97, 0], leaves);
      const r = H * 0.15;
      petalRing(ctx, head, {
        count: detail > 0.5 ? 16 : 9,
        length: r,
        width: r * 0.3,
        tint: petal,
        brush: "round",
        squash: 0.5 + rng() * 0.4,
        glow,
      });
      dab(ctx, [head[0], head[1], head[2] + 0.03], r * 0.55, "flowerYellow", "flowerOrange", ctx.light + 0.5);
      break;
    }
    case "bellflower": {
      // A slim stem; in its upper half small bells on short stalks, open
      // to the side and up, and a few closed buds at the tip.
      stem(ctx, [head[0], head[1], 0], leaves, [0, 0, 0], 0.75);
      const bells = detail > 0.5 ? 6 + Math.floor(rng() * 3) : 4;
      for (let i = 0; i < bells; i++) {
        const t = 0.45 + (i / bells) * 0.48;
        const side = i % 2 === 0 ? 1 : -1;
        const on: Vec3 = [head[0] * t, H * t, 0.004];
        const at: Vec3 = [on[0] + side * H * (0.05 + rng() * 0.04), on[1] + H * 0.03, 0.01 + i * 0.002];
        twig(ctx, on, at, Math.max(0.004, H * 0.01));
        const size = H * 0.09 * (1 - t * 0.35);
        petalRing(ctx, at, {
          count: 3,
          length: size,
          width: size * 0.85,
          tint: petal,
          brush: "filbert",
          squash: 0.9,
          arc: side > 0 ? [-0.2, 1.4] : [Math.PI - 1.4, Math.PI + 0.2],
          glow,
          simple: true,
        });
      }
      for (let i = 0; i < 2; i++) {
        dab(ctx, [head[0] + (rng() - 0.5) * H * 0.05, H * (0.97 + i * 0.04), 0.03], H * 0.03, petal, "grassMid", ctx.light, glow, true);
      }
      break;
    }
    case "cosmos": {
      // On fine, feathery foliage; some heads are seen from the side as cups.
      stem(ctx, [head[0], head[1] * 0.97, 0], 0, [0, 0, 0], 0.8);
      if (detail > 0.5) {
        for (let i = 0; i < 6; i++) {
          const at = 0.2 + rng() * 0.5;
          const side = rng() < 0.5 ? -1 : 1;
          const len = H * (0.08 + rng() * 0.1);
          add(ctx, {
            start: [head[0] * at, H * at, -0.002],
            vec: [side * len, len * (0.4 + rng() * 0.6), 0],
            width: Math.max(0.004, H * 0.01),
            bend: side * 0.3,
            brush: brush(rng, "round"),
            color: paint("grassLight"),
            dry: paint("grassMid"),
            shade: stepShade(ctx.light - 0.1),
          });
        }
      }
      const r = H * 0.17;
      if (rng() < 0.25) {
        petalRing(ctx, [head[0], head[1] - r * 0.15, head[2]], {
          count: 5,
          length: r,
          width: r * 0.6,
          tint: petal,
          brush: "filbert",
          squash: 0.9,
          arc: [0.35, Math.PI - 0.35],
          glow,
        });
        dab(ctx, [head[0], head[1] - r * 0.1, head[2] + 0.03], r * 0.35, "flowerCenter", "flowerOrange", ctx.light);
      } else {
        petalRing(ctx, head, {
          count: 8,
          length: r,
          width: r * 0.62,
          tint: petal,
          brush: "filbert",
          squash: 0.55 + rng() * 0.35,
          glow,
        });
        dab(ctx, [head[0], head[1], head[2] + 0.03], r * 0.36, "flowerCenter", "flowerOrange", ctx.light + 0.5);
      }
      break;
    }
    case "calendula": {
      // Two rings of short rays, the inner ones a shade lighter, round a
      // brownish orange eye.
      stem(ctx, [head[0], head[1] * 0.97, 0], leaves + 1);
      const r = H * 0.2;
      const squash = 0.55 + rng() * 0.35;
      petalRing(ctx, head, { count: detail > 0.5 ? 15 : 9, length: r, width: r * 0.32, tint: petal, brush: "round", squash, glow });
      petalRing(ctx, [head[0], head[1], head[2] + 0.02], {
        count: 9,
        length: r * 0.62,
        width: r * 0.3,
        tint: petal,
        brush: "filbert",
        squash,
        glow,
        simple: true,
      });
      dab(ctx, [head[0], head[1], head[2] + 0.05], r * 0.34, "flowerOrange", "flowerBrown", ctx.light - 0.2);
      break;
    }
    case "marshMarigold": {
      // Low and lush: round, glossy leaves, and a few gold cups above them.
      const pads = detail > 0.5 ? 5 : 3;
      for (let i = 0; i < pads; i++) {
        const t = (i / (pads - 1)) * 2 - 1;
        const at: Vec3 = [t * H * 0.55, H * (0.18 + rng() * 0.22), -0.004 + i * 0.001];
        dab(ctx, at, H * (0.28 + rng() * 0.1), rng() < 0.6 ? "grassDeep" : "grassMid", "grassLight", ctx.light - 0.2 + rng() * 0.5);
      }
      const heads = 1 + Math.floor(rng() * 3);
      for (let i = 0; i < heads; i++) {
        const at: Vec3 = [(i - (heads - 1) / 2) * H * 0.45 + lean, H * (0.75 + rng() * 0.3), 0.02 + i * 0.01];
        twig(ctx, [at[0] * 0.3, H * 0.2, 0.001], at, Math.max(0.008, H * 0.03), "grassDeep");
        const r = H * 0.2;
        petalRing(ctx, at, { count: 5, length: r, width: r * 0.95, tint: petal, brush: "dab", squash: 0.6 + rng() * 0.3, glow });
        dab(ctx, [at[0], at[1], at[2] + 0.03], r * 0.3, "flowerYellow", "grassLight", ctx.light + 0.6, 0, true);
      }
      break;
    }
    case "buttercup": {
      // A sprig: two or three small cups on branching stems.
      stem(ctx, [head[0], head[1] * 0.8, 0], leaves);
      const heads = 2 + Math.floor(rng() * 2);
      for (let i = 0; i < heads; i++) {
        const top: Vec3 = [head[0] + (i - (heads - 1) / 2) * H * 0.22, H * (0.8 + rng() * 0.25), 0.02 + i * 0.01];
        twig(ctx, [head[0] * 0.8, H * 0.6, 0.005], top, H * 0.025);
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
    case "sage": {
      // Wrinkled leaves low down, then a spike of whorls with gaps between
      // them: small hooded flowers reaching out to both sides.
      if (detail > 0.3) basalLeaves(ctx, 3, 0.32, 0.07, 0.35);
      stem(ctx, [head[0], head[1], 0], 0, [0, 0, 0], 0.8);
      const whorls = detail > 0.5 ? 6 : 4;
      for (let i = 0; i < whorls; i++) {
        const t = i / (whorls - 1);
        const y = H * (0.5 + 0.48 * t);
        const size = H * 0.085 * (1 - t * 0.5);
        const x = head[0] * (y / H);
        for (const side of [-1, 1]) {
          add(ctx, {
            start: [x, y, 0.01 + i * 0.002],
            vec: [side * size, size * 0.55, 0],
            width: size * 0.55,
            bend: side * 0.35,
            brush: brush(rng, "filbert"),
            opacity: 0.85 + rng() * 0.15,
            color: paint(petal),
            dry: paint(PETAL_DRY[petal]),
            dryness: 0.45,
            shade: stepShade(ctx.light + t * 0.4 - 0.2 + side * 0.2),
            sway: 1,
            glow,
          });
        }
        if (detail > 0.5) dab(ctx, [x, y + size * 0.15, 0.02 + i * 0.002], size * 0.5, petal, "flowerBlue", ctx.light - 0.2, glow, true);
      }
      break;
    }
    case "clover": {
      // Low: three-part leaves, and a round head of short pink florets.
      const leafSets = detail > 0.5 ? 2 : 1;
      for (let i = 0; i < leafSets; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const at: Vec3 = [side * H * 0.35, H * (0.25 + rng() * 0.2), -0.004];
        twig(ctx, [0, 0, -0.005], at, Math.max(0.005, H * 0.03));
        for (let k = 0; k < 3; k++) {
          const a = Math.PI / 2 + (k - 1) * 1.2;
          dab(
            ctx,
            [at[0] + Math.cos(a) * H * 0.1, at[1] + Math.sin(a) * H * 0.07, -0.003 + k * 0.001],
            H * 0.13,
            "grassMid",
            "grassLight",
            ctx.light - 0.2 + rng() * 0.4,
            0,
            true,
          );
        }
      }
      stem(ctx, [head[0], head[1] * 0.9, 0], 0);
      const r = H * 0.13;
      dab(ctx, [head[0], head[1], 0.02], r * 1.3, PETAL_DRY[petal], petal, ctx.light - 0.3);
      const florets = detail > 0.5 ? 11 : 6;
      for (let i = 0; i < florets; i++) {
        const a = Math.PI * (0.05 + 0.9 * (i / (florets - 1))) + (rng() - 0.5) * 0.3;
        add(ctx, {
          start: [head[0] + Math.cos(a) * r * 0.2, head[1] + Math.sin(a) * r * 0.1, 0.03 + i * 0.001],
          vec: [Math.cos(a) * r, Math.sin(a) * r * 0.9, 0],
          width: r * 0.42,
          bend: (rng() - 0.5) * 0.3,
          brush: brush(rng, "round"),
          opacity: 0.85 + rng() * 0.15,
          color: paint(petal),
          dry: paint(PETAL_DRY[petal]),
          dryness: 0.5,
          shade: stepShade(ctx.light + Math.sin(a) * 0.5 - 0.1),
          sway: 1,
          glow,
        });
      }
      break;
    }
    case "plantain": {
      // A rosette of long, ribbed leaves, and leafless stalks above it, each
      // ending in a short dark head with a ring of pale stamens.
      if (detail > 0.2) basalLeaves(ctx, detail > 0.5 ? 6 : 3, 0.42, 0.06, 0.7);
      const stalks = 1 + Math.floor(rng() * 3);
      for (let i = 0; i < stalks; i++) {
        const top: Vec3 = [lean + (i - (stalks - 1) / 2) * H * 0.18, H * (0.85 + rng() * 0.2), 0.01 + i * 0.004];
        twig(ctx, [0, 0, 0], top, Math.max(0.006, H * 0.015));
        add(ctx, {
          start: [top[0], top[1], top[2] + 0.004],
          vec: [(rng() - 0.5) * H * 0.02, H * 0.1, 0],
          width: H * 0.045,
          brush: brush(rng, "round"),
          color: paint("flowerBrown"),
          dry: paint("grassMid"),
          dryness: 0.3,
          shade: stepShade(ctx.light),
          sway: 1,
        });
        const ring = detail > 0.5 ? 5 : 3;
        for (let k = 0; k < ring; k++) {
          const t = (k / (ring - 1)) * 2 - 1;
          dab(ctx, [top[0] + t * H * 0.04, top[1] + H * 0.03, top[2] + 0.008], H * 0.022, petal, "flowerYellow", ctx.light + 0.5, glow, true);
        }
      }
      break;
    }
    case "rampion": {
      // A ball of narrow, curled flowers: claws bending in toward the middle.
      stem(ctx, [head[0], head[1] * 0.95, 0], leaves, [0, 0, 0], 0.8);
      const r = H * 0.11;
      dab(ctx, [head[0], head[1], 0.02], r * 1.1, PETAL_DRY[petal], petal, ctx.light - 0.3, glow);
      petalRing(ctx, [head[0], head[1] - r * 0.2, head[2] + 0.01], {
        count: detail > 0.5 ? 11 : 7,
        length: r,
        width: r * 0.22,
        tint: petal,
        brush: "round",
        squash: 0.9,
        arc: [0.1, Math.PI - 0.1],
        curl: 0.35,
        glow,
        simple: true,
      });
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

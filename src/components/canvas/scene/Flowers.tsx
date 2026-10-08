"use client";

import { useEffect, useMemo } from "react";
import { qualityPresets } from "@/config/look";
import { useLookStore } from "@/store/look";
import { blueBandX, FIELD, overheadPoint, terrainHeight } from "../painterly/landscape";
import { FLOWER_KIND, paintFlower, PLANT_COLORS } from "../painterly/plants";
import { mulberry32, pickWeighted, valueNoise } from "../painterly/random";
import { StrokeBuffer } from "../painterly/strokes";
import { StrokeLayer } from "./StrokeLayer";

// Tint slots, matching PETAL_TINTS in painterly/plants.ts (2 = white).
const PINK = 0;
const PINK_DEEP = 1;
const WHITE = 2;
const YELLOW = 3;
const ORANGE = 4;
const BLUE = 5;
const PERIWINKLE = 6;

/** Per flower kind (FLOWER_KIND): relative frequency, height range (m), tint weights. */
const SPECIES = [
  { weight: 22, height: [0.4, 0.75], tints: [5, 2.5, 2.5, 0, 0, 0, 0] }, // cosmos
  { weight: 14, height: [0.35, 0.65], tints: [0, 0, 8, 1, 0, 0, 0] }, // daisy
  { weight: 12, height: [0.3, 0.55], tints: [0, 0, 1, 6, 2.5, 0, 0] }, // buttercup
  { weight: 5, height: [0.45, 0.8], tints: [1, 0, 0, 0, 0, 5, 3.5] }, // lupine
  { weight: 12, height: [0.35, 0.65], tints: [6, 2, 2, 0, 0, 0, 0] }, // wild rose
  { weight: 10, height: [0.3, 0.6], tints: [4, 1, 2.5, 2, 1, 0.5, 0.5] }, // dab cluster
  { weight: 10, height: [0.4, 0.75], tints: [5, 2, 2.5, 0, 0, 0, 0] }, // side-on cosmos
  { weight: 8, height: [0.35, 0.65], tints: [0, 0, 6, 3, 0, 0, 0] }, // yarrow
] as const;
const BLUE_SPECIES = [0, 0, 0, 8, 0, 3, 0, 0];
const FAR_SPECIES = [2, 1, 2, 1, 1, 10, 1, 3];

/**
 * Big flowers right by the lens, framing the view from both sides: part of
 * the meadow, so they move with it, and soft as they sit before the focus.
 * x and d (distance into the field) in metres.
 */
const NEAR_FLOWERS = [
  { x: -1.05, d: 1.3, height: 0.78, kind: FLOWER_KIND.cosmos, tint: PINK },
  { x: -0.7, d: 1.9, height: 0.85, kind: FLOWER_KIND.rose, tint: PINK_DEEP },
  { x: -1.4, d: 2.4, height: 0.95, kind: FLOWER_KIND.daisy, tint: WHITE },
  { x: -0.35, d: 1.15, height: 0.55, kind: FLOWER_KIND.sideCosmos, tint: PINK },
  { x: -1.75, d: 3.1, height: 0.95, kind: FLOWER_KIND.lupine, tint: PERIWINKLE },
  { x: 0.2, d: 1.05, height: 0.45, kind: FLOWER_KIND.buttercup, tint: YELLOW },
  { x: 0.6, d: 1.45, height: 0.72, kind: FLOWER_KIND.rose, tint: PINK },
  { x: 0.98, d: 1.85, height: 0.9, kind: FLOWER_KIND.cosmos, tint: WHITE },
  { x: 1.35, d: 2.6, height: 1.0, kind: FLOWER_KIND.cosmos, tint: PINK },
  { x: 1.8, d: 3.3, height: 0.95, kind: FLOWER_KIND.lupine, tint: BLUE },
] as const;

/** Share of flowers spread over the night top view rather than the day wedge. */
const OVERHEAD_SHARE = 0.35;

function paintFlowers(count: number) {
  const out = new StrokeBuffer();
  const rng = mulberry32(1234);
  for (const flower of NEAR_FLOWERS) {
    const z = -flower.d;
    paintFlower(
      {
        out,
        rng,
        root: [flower.x, terrainHeight(flower.x, z) - 0.04, z],
        height: flower.height,
        phase: rng() * Math.PI * 2,
        light: 1.1 + rng() * 0.4,
        variation: [(rng() - 0.5) * 0.1, 1, 0.95 + rng() * 0.1],
        detail: 1,
      },
      flower.kind,
      flower.tint,
      0.4,
    );
  }
  for (let i = 0; i < count; i++) {
    let x: number;
    let d: number;
    let grow: number;
    let detail: number;
    if (rng() < OVERHEAD_SHARE) {
      // Spread over the night top view, sized to read from up there.
      [x, d] = overheadPoint(rng);
      grow = 2.2;
      detail = 0.35;
    } else {
      // Most flowers in the midground, where the eye lands.
      const band = rng();
      d =
        band < 0.05
          ? FIELD.near + rng() * 3.5
          : band < 0.75
            ? 4.5 + Math.pow(rng(), 1.1) * 22
            : 24 + Math.pow(rng(), 1.5) * (FIELD.far - 24);
      x = (rng() * 2 - 1) * (d * 1.1 + 1.5);
      // Far flowers grow so they stay readable.
      grow = 1 + Math.max(0, d - 10) * 0.03;
      // Close flowers get every petal, far ones become dabs.
      detail = Math.min(1, Math.max(0, 1 - (d - 4) / 30));
    }
    const z = -d;

    // Species: blue drift along the band, dabs in the far field, else mixed.
    const inBlue = Math.abs(x - blueBandX(d)) < 0.3 + d * 0.035 && rng() < 0.6;
    const weights = inBlue
      ? BLUE_SPECIES
      : d > 30
        ? FAR_SPECIES
        : SPECIES.map((s) => s.weight);
    const kind = pickWeighted(rng, weights);
    const species = SPECIES[kind];

    // Tint: clustered drifts of the same color, like a real meadow.
    const drift = valueNoise(x * 0.12, z * 0.12, 7);
    const tints = species.tints.map((w, t) => {
      if (t === YELLOW || t === ORANGE) return w * (0.4 + drift * 1.6);
      if (t === PINK || t === PINK_DEEP) return w * (1.4 - drift);
      return w;
    });
    const tint = inBlue && kind !== 3 ? (rng() < 0.7 ? BLUE : PERIWINKLE) : pickWeighted(rng, tints);

    const [h0, h1] = species.height;
    const height = (h0 + rng() * (h1 - h0)) * grow;
    // Sunlit drifts and shaded hollows across the field.
    const sun = valueNoise(x * 0.09, z * 0.09, 3);
    // Night: some flowers glow, the pale and blue ones most.
    const pale = tint === WHITE || tint >= BLUE;
    const glow = rng() < 0.28 ? (pale ? 1 : 0.4) : 0;

    paintFlower(
      {
        out,
        rng,
        root: [x, terrainHeight(x, z) - 0.04, z],
        height,
        phase: rng() * Math.PI * 2,
        light: 0.7 + sun * 0.9 + (rng() - 0.5) * 0.3,
        variation: [(rng() - 0.5) * 0.22, 0.85 + rng() * 0.3, 0.88 + rng() * 0.24],
        detail,
      },
      kind,
      tint,
      glow,
    );
  }
  return out;
}

/**
 * The flower field, painted stroke by stroke (petals, centres, stems and
 * leaves), from the big flowers by the lens to dabs on the horizon: one
 * instanced draw for every stroke of every flower.
 */
export function Flowers() {
  const tier = useLookStore((s) => s.tier);
  const density = useLookStore((s) => s.flowerDensity);
  const count = Math.round(qualityPresets[tier].flowers * density);

  const geometry = useMemo(() => paintFlowers(count).createGeometry(), [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <StrokeLayer
      name="flowers"
      geometry={geometry}
      options={{
        colors: PLANT_COLORS,
        shadow: "fieldShadow",
        light: "flowerWhite",
        sway: 0.07,
        rootFade: 0.3,
        relief: 0.7,
        backlight: 1,
      }}
    />
  );
}

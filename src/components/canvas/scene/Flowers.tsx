"use client";

import { useEffect, useMemo } from "react";
import { qualityPresets } from "@/config/look";
import { useLookStore } from "@/store/look";
import { FIELD, inStream, overheadPoint, terrainHeight } from "../painterly/landscape";
import { FLOWER_SPECIES, type FlowerKind, paintFlower, pickTint, PLANT_COLORS } from "../painterly/plants";
import { mulberry32, pickWeighted, valueNoise } from "../painterly/random";
import { StrokeBuffer } from "../painterly/strokes";
import { StrokeLayer } from "./StrokeLayer";

/**
 * The wild meadow around the beds: all of the plan's flowers, sparse and
 * mixed, the wild ones most. Relative frequency per kind.
 */
const MEADOW: Partial<Record<FlowerKind, number>> = {
  clover: 12,
  daisy: 10,
  buttercup: 10,
  sage: 9,
  poppy: 8,
  plantain: 6,
  bellflower: 5,
  rampion: 4,
  calendula: 4,
  cosmos: 4,
  gypsophila: 3,
};
/** Far off, most flowers are dabs. */
const FAR_MEADOW: Partial<Record<FlowerKind, number>> = { ...MEADOW, cluster: 60 };

const kindsOf = (weights: Partial<Record<FlowerKind, number>>) => Object.keys(weights) as FlowerKind[];
const MEADOW_KINDS = kindsOf(MEADOW);
const FAR_KINDS = kindsOf(FAR_MEADOW);

/**
 * Share of wild flowers kept in the near meadow (where the beds are), so the
 * beds read as groups rather than drowning in the field, and far off, where
 * the meadow is mostly green with a few flecks of color. In between it
 * blends.
 */
const NEAR_KEEP = 0.2;
const FAR_KEEP = 0.25;

/** Share of flowers spread over the night top view rather than the day wedge. */
const OVERHEAD_SHARE = 0.35;

function paintFlowers(count: number) {
  const out = new StrokeBuffer();
  const rng = mulberry32(1234);
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
      grow = 1 + Math.max(0, d - 10) * 0.02;
      // Close flowers get every petal, far ones become dabs.
      detail = Math.min(1, Math.max(0, 1 - (d - 4) / 30));
    }
    // Thinner near the beds, and nothing in the stream. The beds' own
    // room is left in the shader (bedGaps), since they move on narrow screens.
    if (inStream(x, d)) continue;
    if (rng() > NEAR_KEEP + Math.min(d / 40, 1) * (FAR_KEEP - NEAR_KEEP)) continue;
    const z = -d;

    const kinds = d > 30 ? FAR_KINDS : MEADOW_KINDS;
    const weights = d > 30 ? FAR_MEADOW : MEADOW;
    const kind = kinds[pickWeighted(rng, kinds.map((k) => weights[k] ?? 0))];
    const tint = pickTint(rng, kind);

    const [h0, h1] = FLOWER_SPECIES[kind].height;
    const height = (h0 + rng() * (h1 - h0)) * grow;
    // Sunlit drifts and shaded hollows across the field.
    const sun = valueNoise(x * 0.09, z * 0.09, 3);
    // Night: some flowers glow, the pale and blue ones most.
    const pale = tint === "flowerWhite" || tint === "flowerBlue" || tint === "flowerPeriwinkle";
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
 * The wild flowers between and beyond the beds, painted stroke by stroke
 * (petals, centres, stems and leaves), down to dabs on the horizon: one
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
        bedGaps: true,
      }}
    />
  );
}

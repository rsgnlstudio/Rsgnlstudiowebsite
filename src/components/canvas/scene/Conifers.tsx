"use client";

import { useEffect, useMemo } from "react";
import { qualityPresets } from "@/config/look";
import { useLookStore } from "@/store/look";
import { scatterConifers } from "../painterly/conifers";
import { paintConifer, PLANT_COLORS } from "../painterly/plants";
import { mulberry32 } from "../painterly/random";
import { StrokeBuffer } from "../painterly/strokes";
import { StrokeLayer } from "./StrokeLayer";

function paintConifers(count: number) {
  const layout = scatterConifers(count);
  const out = new StrokeBuffer();
  const rng = mulberry32(777);
  for (let i = 0; i < layout.count; i++) {
    const far = layout.far[i] === 1;
    paintConifer(
      {
        out,
        rng,
        root: [layout.offset[i * 3], layout.offset[i * 3 + 1], layout.offset[i * 3 + 2]],
        height: layout.size[i * 2 + 1],
        phase: layout.phase[i],
        light: 1 + rng() * 0.3,
        variation: [layout.variation[i * 3], layout.variation[i * 3 + 1], layout.variation[i * 3 + 2]],
        detail: far ? 0 : 1,
      },
      layout.size[i * 2],
      far,
    );
  }
  return out;
}

/**
 * The conifers framing the meadow, each painted as a trunk smear and tiers
 * of near-black branch jabs with a few sunlit tips.
 */
export function Conifers() {
  const tier = useLookStore((s) => s.tier);
  const count = qualityPresets[tier].conifers;

  const geometry = useMemo(() => paintConifers(count).createGeometry(6), [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <StrokeLayer
      name="conifers"
      geometry={geometry}
      options={{
        colors: PLANT_COLORS,
        shadow: "mountainNear",
        light: "grassMid",
        sway: 0.012,
        topScale: 0.5,
        squeeze: true,
        minPx: 2.5,
        hazeScale: 0.35,
        rootFade: 2.5,
        relief: 0,
        backlight: 0,
      }}
    />
  );
}

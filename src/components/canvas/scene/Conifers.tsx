"use client";

import { useEffect, useMemo } from "react";
import { qualityPresets } from "@/config/look";
import { useLookStore } from "@/store/look";
import { scatterConifers } from "../painterly/conifers";
import { paintConifer, PLANT_COLORS } from "../painterly/plants";
import { mulberry32 } from "../painterly/random";
import { StrokeBuffer } from "../painterly/strokes";
import { StrokeLayer } from "./StrokeLayer";

function paintConifers(count: number, woods: number) {
  const layout = scatterConifers(count, woods);
  const out = new StrokeBuffer();
  const rng = mulberry32(777);
  for (let i = 0; i < layout.count; i++) {
    // The groves in the clearings are night-only (dust); by day the
    // clearings stay open, so the day doesn't change.
    if (layout.grove[i] >= 0) continue;
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
 * The conifers framing the meadow (and the woods of the night map, mostly
 * out of the day view), each painted as a trunk smear and tiers
 * of near-black branch jabs with a few sunlit tips.
 */
export function Conifers() {
  const tier = useLookStore((s) => s.tier);
  const { conifers, woods } = qualityPresets[tier];

  const geometry = useMemo(() => paintConifers(conifers, woods).createGeometry(6), [conifers, woods]);
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

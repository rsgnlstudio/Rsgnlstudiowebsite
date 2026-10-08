"use client";

import { useEffect, useMemo } from "react";
import { qualityPresets } from "@/config/look";
import { useLookStore } from "@/store/look";
import { FIELD, overheadPoint, terrainHeight } from "../painterly/landscape";
import { paintTuft, PLANT_COLORS } from "../painterly/plants";
import { mulberry32, valueNoise } from "../painterly/random";
import { StrokeBuffer } from "../painterly/strokes";
import { StrokeLayer } from "./StrokeLayer";

/** Share of tufts spread over the night top view rather than the day wedge. */
const OVERHEAD_SHARE = 0.35;

function paintGrass(count: number) {
  const out = new StrokeBuffer();
  const rng = mulberry32(98765);
  for (let i = 0; i < count; i++) {
    let x: number;
    let d: number;
    let grow: number;
    let detail: number;
    if (rng() < OVERHEAD_SHARE) {
      // Spread over the night top view, sized to read from up there.
      [x, d] = overheadPoint(rng);
      grow = 2;
      detail = 0.3;
    } else {
      const band = rng();
      d =
        band < 0.1
          ? FIELD.near + rng() * 3
          : band < 0.78
            ? 4 + Math.pow(rng(), 1.2) * 22
            : 26 + Math.pow(rng(), 1.4) * (FIELD.far - 26);
      x = (rng() * 2 - 1) * (d * 1.1 + 1.5);
      // Far tufts grow so they stay readable.
      grow = 1 + Math.max(0, d - 10) * 0.035;
      detail = Math.min(1, Math.max(0, 1 - (d - 3) / 25));
    }
    const z = -d;
    const height = (0.4 + rng() * 0.55) * grow;
    // Sunlit drifts and deep shadowed hollows.
    const sun = Math.min(1, Math.max(0, (valueNoise(x * 0.09, z * 0.09, 3) - 0.35) * 1.8) + rng() * 0.3);

    paintTuft(
      {
        out,
        rng,
        root: [x, terrainHeight(x, z) - 0.05, z],
        height,
        phase: rng() * Math.PI * 2,
        light: 0.6 + sun * 0.8,
        variation: [(rng() - 0.5) * 0.25, 0.85 + rng() * 0.3, 0.85 + rng() * 0.3],
        detail,
      },
      sun,
    );
  }
  return out;
}

/**
 * Grass between the flowers, blade by blade: tapering strokes, deep at the
 * root and running into lime at the tips where the brush runs dry.
 */
export function Grass() {
  const tier = useLookStore((s) => s.tier);
  const density = useLookStore((s) => s.flowerDensity);
  const count = Math.round(qualityPresets[tier].grass * density);

  const geometry = useMemo(() => paintGrass(count).createGeometry(8), [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <StrokeLayer
      name="grass"
      geometry={geometry}
      options={{
        colors: PLANT_COLORS,
        shadow: "fieldShadow",
        light: "groundWarm",
        sway: 0.09,
        rootFade: 0.35,
        relief: 0.25,
        backlight: 0.8,
      }}
    />
  );
}

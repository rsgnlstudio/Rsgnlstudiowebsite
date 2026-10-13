"use client";

import { CameraRig } from "./scene/CameraRig";
import { DustWorld } from "./scene/DustWorld";
import { Effects } from "./scene/Effects";
import { Lights } from "./scene/Lights";
import { Nightingale } from "./scene/Nightingale";
import { PaintedWorld } from "./scene/PaintedWorld";
import { Sky } from "./scene/Sky";
import { Stars } from "./scene/Stars";
import { Terrain } from "./scene/Terrain";
import { Vegetation } from "./scene/Vegetation";

/**
 * Two worlds that share one layout: the painted day meadow and the night
 * dust world. `night` morphs one into the other (see painterly/nightLight).
 * The nightingale flies in the day and turns into the night's light.
 */
export function Scene() {
  return (
    <>
      <CameraRig />
      <Sky />
      <Lights />
      <PaintedWorld>
        <Terrain />
        <Vegetation />
      </PaintedWorld>
      {/* Between the worlds: by day a bird, by night their light. Before
          DustWorld, so the light's place is set when CursorLight reads it. */}
      <Nightingale />
      <DustWorld />
      <Stars />
      <Effects />
    </>
  );
}

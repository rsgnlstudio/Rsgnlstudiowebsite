"use client";

import { CameraRig } from "./scene/CameraRig";
import { DustWorld } from "./scene/DustWorld";
import { Effects } from "./scene/Effects";
import { Lights } from "./scene/Lights";
import { PaintedWorld } from "./scene/PaintedWorld";
import { Sky } from "./scene/Sky";
import { Stars } from "./scene/Stars";
import { Terrain } from "./scene/Terrain";
import { Vegetation } from "./scene/Vegetation";

/**
 * Two worlds that share one layout: the painted day meadow and the night
 * dust world. `night` morphs one into the other (see painterly/nightLight).
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
      <DustWorld />
      <Stars />
      <Effects />
    </>
  );
}

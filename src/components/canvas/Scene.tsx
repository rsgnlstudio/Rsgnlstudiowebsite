"use client";

import { CameraRig } from "./scene/CameraRig";
import { Effects } from "./scene/Effects";
import { Lights } from "./scene/Lights";
import { Sky } from "./scene/Sky";
import { Stars } from "./scene/Stars";
import { Terrain } from "./scene/Terrain";
import { Vegetation } from "./scene/Vegetation";

export function Scene() {
  return (
    <>
      <CameraRig />
      <Sky />
      <Lights />
      <Terrain />
      <Vegetation />
      <Stars />
      <Effects />
    </>
  );
}

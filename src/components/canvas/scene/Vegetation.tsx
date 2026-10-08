"use client";

import { Conifers } from "./Conifers";
import { Flowers } from "./Flowers";
import { Foreground } from "./Foreground";
import { Grass } from "./Grass";

/**
 * All instanced painted vegetation, back to front: conifer silhouettes, the
 * grass and flower field, and the camera-locked out-of-focus foreground.
 */
export function Vegetation() {
  return (
    <group name="vegetation">
      <Conifers />
      <Grass />
      <Flowers />
      <Foreground />
    </group>
  );
}

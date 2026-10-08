"use client";

import { Conifers } from "./Conifers";
import { Flowers } from "./Flowers";
import { Grass } from "./Grass";
import { Pollen } from "./Pollen";

/**
 * All painted vegetation, back to front: the conifers, then the grass and
 * the flower field, which runs right up to the lens, and the pollen
 * drifting over it.
 */
export function Vegetation() {
  return (
    <group name="vegetation">
      <Conifers />
      <Grass />
      <Flowers />
      <Pollen />
    </group>
  );
}

"use client";

import { Conifers } from "./Conifers";
import { CursorWind } from "./CursorWind";
import { Flowers } from "./Flowers";
import { Grass } from "./Grass";
import { Pollen } from "./Pollen";

/**
 * All painted vegetation, back to front: the conifers, then the grass and
 * the flower field, which runs right up to the lens, and the pollen
 * drifting over it. CursorWind blows through all of it from the cursor.
 */
export function Vegetation() {
  return (
    <group name="vegetation">
      <CursorWind />
      <Conifers />
      <Grass />
      <Flowers />
      <Pollen />
    </group>
  );
}

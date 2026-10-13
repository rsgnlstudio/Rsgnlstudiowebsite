"use client";

import { Conifers } from "./Conifers";
import { CursorWind } from "./CursorWind";
import { FlowerBeds } from "./FlowerBeds";
import { Flowers } from "./Flowers";
import { Grass } from "./Grass";
import { Pollen } from "./Pollen";

/**
 * All painted vegetation, back to front: the conifers, then the grass and
 * the flower beds whose project beds react to hover (before the flower
 * field, so the field's nearer fringes blend over them), the wild flowers
 * between and beyond the beds, and the pollen drifting over it. CursorWind
 * blows through all of it from the cursor.
 */
export function Vegetation() {
  return (
    <group name="vegetation">
      <CursorWind />
      <Conifers />
      <Grass />
      <FlowerBeds />
      <Flowers />
      <Pollen />
    </group>
  );
}

"use client";

import { Conifers } from "./Conifers";
import { Fireflies } from "./Fireflies";
import { Flowers } from "./Flowers";
import { Foreground } from "./Foreground";
import { Grass } from "./Grass";

/**
 * All instanced vegetation, back to front: conifer silhouettes, the grass and
 * flower field, fireflies (night only), and the camera-locked out-of-focus
 * foreground.
 */
export function Vegetation() {
  return (
    <group name="vegetation">
      <Conifers />
      <Grass />
      <Flowers />
      <Fireflies />
      <Foreground />
    </group>
  );
}

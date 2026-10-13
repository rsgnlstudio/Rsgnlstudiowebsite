"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import { sharedUniforms } from "../painterly/palette";
import { CursorLight } from "./CursorLight";
import { Dust } from "./Dust";
import { Fireflies } from "./Fireflies";
import { NightMap } from "./NightMap";

/**
 * The night world: the meadow as glowing dust, fireflies, the light that
 * follows the cursor, and the night map drawn over it all (the consulting
 * site: paths, the city's lights, the mountains). It condenses as the painted
 * world morphs into the night and stops rendering by day.
 */
export function DustWorld() {
  const group = useRef<Group>(null);
  useFrame(() => {
    if (group.current) group.current.visible = sharedUniforms.uMorph.value > 0;
  });
  return (
    <group ref={group} name="dust-world">
      <Dust />
      <Fireflies />
      <CursorLight />
      <NightMap />
    </group>
  );
}

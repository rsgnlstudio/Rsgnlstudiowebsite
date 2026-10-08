"use client";

import { useFrame } from "@react-three/fiber";
import { type ReactNode, useRef } from "react";
import type { Group } from "three";
import { sharedUniforms } from "../painterly/palette";

/**
 * The painted day world. Every painted material morphs into the night with
 * `uMorph` (morphPaint in painterly/nightLight.ts): re-lit by the night light,
 * then sunk into the void. Once it is all void (night), the group stops
 * rendering.
 */
export function PaintedWorld({ children }: { children: ReactNode }) {
  const group = useRef<Group>(null);
  useFrame(() => {
    if (group.current) group.current.visible = sharedUniforms.uMorph.value < 1;
  });
  return (
    <group ref={group} name="painted-world">
      {children}
    </group>
  );
}

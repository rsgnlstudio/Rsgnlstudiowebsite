"use client";

import { useFrame } from "@react-three/fiber";
import { type ReactNode, useRef } from "react";
import type { Group } from "three";
import { DISSOLVE_DONE, sharedUniforms } from "../painterly/palette";

/**
 * The painted day world. Every painted material dissolves into dust with
 * `uDissolve`; once it has fully gone (night), the group stops rendering.
 */
export function PaintedWorld({ children }: { children: ReactNode }) {
  const group = useRef<Group>(null);
  useFrame(() => {
    if (group.current) group.current.visible = sharedUniforms.uDissolve.value < DISSOLVE_DONE;
  });
  return (
    <group ref={group} name="painted-world">
      {children}
    </group>
  );
}

"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { MathUtils, Vector2 } from "three";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useWindowPointer } from "@/hooks/useWindowPointer";
import { useLookStore } from "@/store/look";
import { useSceneStore } from "@/store/scene";
import { gustUniforms } from "../painterly/gust";

/** Cursor speed (NDC units per second) that blows full gusts. */
const FULL_SPEED = 1.6;

const last = new Vector2();

/**
 * The wind of the day world: the cursor is its origin. It blows outward from
 * the cursor, always a little and hard while the cursor moves, so the meadow
 * parts around it. Off on touch screens, with reduced motion, and as the
 * camera leaves for the night top view. Writes gustUniforms every frame;
 * reads the stores with getState().
 */
export function CursorWind() {
  const reducedMotion = usePrefersReducedMotion();
  const reduced = useRef(reducedMotion);
  useEffect(() => {
    reduced.current = reducedMotion;
  }, [reducedMotion]);

  const pointer = useWindowPointer();
  const cursor = useRef(new Vector2());
  const presence = useRef(0);
  const speed = useRef(0);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const day = 1 - MathUtils.smoothstep(useSceneStore.getState().night, 0.02, 0.2);
    const on = pointer.current.active && !reduced.current && day > 0;
    // When the cursor leaves, the wind dies down where it was.
    presence.current = MathUtils.damp(presence.current, on ? 1 : 0, on ? 5 : 2, dt);

    // Follow closely, so the gust stays with the cursor.
    last.copy(cursor.current);
    if (on) cursor.current.lerp(pointer.current.position, 1 - Math.exp(-dt * 16));
    const moved = last.distanceTo(cursor.current) / Math.max(dt, 1e-4);
    const target = MathUtils.clamp(moved / FULL_SPEED, 0, 1);
    // Rises fast with a flick, eases off slowly like a gust.
    speed.current = MathUtils.damp(speed.current, target, target > speed.current ? 10 : 1.5, dt);

    gustUniforms.uGustCursor.value.copy(cursor.current);
    gustUniforms.uGustAspect.value = state.size.width / Math.max(state.size.height, 1);
    gustUniforms.uGustStrength.value =
      presence.current * day * (0.25 + 0.45 * speed.current) * useLookStore.getState().cursorWind;
  });

  return null;
}

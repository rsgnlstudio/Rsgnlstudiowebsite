"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useLookStore } from "@/store/look";
import { useSceneStore } from "@/store/scene";
import { sharedUniforms, updateLight } from "../painterly/palette";

/**
 * The scene is painted, not lit: every material is unlit and takes its colors
 * from the shared palette uniforms. This component is the lighting pass. Each
 * frame it applies `night`: mixes the palette day -> dusk -> night, moves the
 * sun and moon and sets the night glow. It also advances time and wind.
 */
export function Lights() {
  const reducedMotion = usePrefersReducedMotion();
  const reduced = useRef(reducedMotion);
  useEffect(() => {
    reduced.current = reducedMotion;
  }, [reducedMotion]);

  // Runs before the other scene parts so they see this frame's light.
  useFrame((_, delta) => {
    updateLight(useSceneStore.getState().night);
    sharedUniforms.uTime.value += Math.min(delta, 0.1);
    // Reduced motion: hold the vegetation still.
    sharedUniforms.uWind.value = reduced.current ? 0 : useLookStore.getState().wind;
  }, -1);

  return null;
}

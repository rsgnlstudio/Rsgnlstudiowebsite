"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { MathUtils } from "three";
import { INTRO_BUILD_FROM } from "@/config/scene";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useLookStore } from "@/store/look";
import { useSceneStore } from "@/store/scene";
import { sharedUniforms, updateLight } from "../painterly/palette";

/**
 * The scene is painted, not lit: every material is unlit and takes its colors
 * from the shared palette uniforms. This component is the lighting pass. Each
 * frame it applies `night`: mixes the palette day -> dusk -> night, moves the
 * sun and moon and sets the night glow. It also advances time and wind, and
 * carries the intro's progress to the shaders (`uBuild`, painterly/build.ts).
 */
export function Lights() {
  const reducedMotion = usePrefersReducedMotion();
  const reduced = useRef(reducedMotion);
  useEffect(() => {
    reduced.current = reducedMotion;
  }, [reducedMotion]);

  // Runs before the other scene parts so they see this frame's light.
  useFrame((_, delta) => {
    const { night, intro } = useSceneStore.getState();
    updateLight(night);
    // From the frame behind the entry screen, setting off gently.
    sharedUniforms.uBuild.value = MathUtils.lerp(INTRO_BUILD_FROM, 1, MathUtils.smootherstep(intro, 0, 1));
    sharedUniforms.uTime.value += Math.min(delta, 0.1);
    // Reduced motion: hold the vegetation still.
    sharedUniforms.uWind.value = reduced.current ? 0 : useLookStore.getState().wind;
  }, -1);

  return null;
}

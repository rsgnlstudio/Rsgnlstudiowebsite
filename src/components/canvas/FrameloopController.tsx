"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { useSceneStore } from "@/store/scene";

/**
 * Pauses rendering while sceneMode is "hidden". Subscribes outside React so
 * mode changes don't re-render the scene tree.
 */
export function FrameloopController() {
  const setFrameloop = useThree((s) => s.setFrameloop);

  useEffect(() => {
    const apply = (mode: string) =>
      setFrameloop(mode === "hidden" ? "never" : "always");
    apply(useSceneStore.getState().sceneMode);
    return useSceneStore.subscribe((state, prev) => {
      if (state.sceneMode !== prev.sceneMode) apply(state.sceneMode);
    });
  }, [setFrameloop]);

  return null;
}

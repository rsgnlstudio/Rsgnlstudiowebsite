"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { type SceneState, useSceneStore } from "@/store/scene";
import { brushAtlasReady } from "./painterly/brushes";

/**
 * Frames rendered for the still behind the entry screen: the wet canvas
 * (WetCanvasPass) mixes in the previous frame, so it takes a couple to settle.
 */
const STILL_FRAMES = 3;

/**
 * Decides when the canvas renders. Subscribes outside React so mode changes
 * don't re-render the scene tree.
 *
 * - Nothing renders until the brush atlas is simulated and the scene's
 *   shaders are compiled (compileAsync, in parallel where the browser
 *   supports it), so the first frame doesn't stall on them.
 * - "hidden" pauses rendering.
 * - Behind the entry screen the world is a still (the opening frame of the
 *   intro): it renders a few frames on demand (and on resize), not 60 a second.
 * - Once the visitor has entered, it renders every frame.
 *
 * Mounted after the scene (inside its Suspense boundary), so compileAsync
 * finds every material.
 */
export function FrameloopController() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const setFrameloop = useThree((s) => s.setFrameloop);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    let warm = false;
    let disposed = false;
    const apply = ({ sceneMode, entered }: Pick<SceneState, "sceneMode" | "entered">) => {
      if (!warm || sceneMode === "hidden") setFrameloop("never");
      else if (!entered) {
        setFrameloop("demand");
        invalidate(STILL_FRAMES);
      } else setFrameloop("always");
    };
    void Promise.all([brushAtlasReady(), gl.compileAsync(scene, camera)]).then(() => {
      if (disposed) return;
      warm = true;
      apply(useSceneStore.getState());
    });
    apply(useSceneStore.getState());
    const unsubscribe = useSceneStore.subscribe((state, prev) => {
      if (state.sceneMode !== prev.sceneMode || state.entered !== prev.entered) apply(state);
    });
    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [gl, scene, camera, setFrameloop, invalidate]);

  return null;
}

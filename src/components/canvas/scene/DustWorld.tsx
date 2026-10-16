"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { Group } from "three";
import { requestIdle } from "@/lib/idle";
import { type SceneState, useSceneStore } from "@/store/scene";
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
 *
 * A visitor who stays in the day never needs it, so it isn't built with the
 * scene: it mounts in idle time once the intro is over, or at once when the
 * night is chosen. Its shaders compile in the background (compileAsync)
 * before it shows, so the first night doesn't stall on them.
 */
export function DustWorld() {
  const group = useRef<Group>(null);
  const compiled = useRef(false);
  const [mounted, setMounted] = useState(false);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    if (mounted) return;
    let cancelIdle: (() => void) | null = null;
    const check = ({ timeOfDay, intro }: Pick<SceneState, "timeOfDay" | "intro">) => {
      if (timeOfDay === "night") {
        cancelIdle?.();
        setMounted(true);
      } else if (intro >= 1 && !cancelIdle) {
        cancelIdle = requestIdle(() => setMounted(true), 2000);
      }
    };
    check(useSceneStore.getState());
    const unsubscribe = useSceneStore.subscribe(check);
    return () => {
      unsubscribe();
      cancelIdle?.();
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted || !group.current) return;
    let disposed = false;
    void gl.compileAsync(group.current, camera, scene).then(() => {
      if (!disposed) compiled.current = true;
    });
    return () => {
      disposed = true;
    };
  }, [mounted, gl, scene, camera]);

  useFrame(() => {
    if (group.current) group.current.visible = compiled.current && sharedUniforms.uMorph.value > 0;
  });

  return (
    <group ref={group} name="dust-world">
      {mounted && (
        <>
          <Dust />
          <Fireflies />
          <CursorLight />
          <NightMap />
        </>
      )}
    </group>
  );
}

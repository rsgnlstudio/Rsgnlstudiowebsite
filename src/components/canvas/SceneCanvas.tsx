"use client";

import { Canvas } from "@react-three/fiber";
import { lazy, Suspense, useEffect, useRef } from "react";
import { homeSections } from "@/config/sections";
import { useSceneStore } from "@/store/scene";
import { FrameloopController } from "./FrameloopController";
import { Scene } from "./Scene";

// Statically false in production, so leva and r3f-perf are tree-shaken out.
const DevTools =
  process.env.NODE_ENV === "development"
    ? lazy(() => import("./dev/DevTools"))
    : null;

const initialCamera = homeSections[0].camera;

/**
 * The persistent full-viewport canvas. Client-only: loaded via
 * SceneCanvasLoader with ssr: false.
 */
export default function SceneCanvas() {
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Hide the canvas while sceneMode is "hidden", without re-rendering.
  useEffect(() => {
    const apply = (mode: string) => {
      if (wrapperRef.current) {
        wrapperRef.current.style.visibility =
          mode === "hidden" ? "hidden" : "visible";
      }
    };
    apply(useSceneStore.getState().sceneMode);
    return useSceneStore.subscribe((state, prev) => {
      if (state.sceneMode !== prev.sceneMode) apply(state.sceneMode);
    });
  }, []);

  return (
    <div
      ref={wrapperRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
    >
      <Canvas
        dpr={[1, 1.5]}
        gl={{
          antialias: false, // EffectComposer handles multisampling
          powerPreference: "high-performance",
          stencil: false,
        }}
        camera={{
          position: [...initialCamera.position],
          fov: initialCamera.fov,
          near: 0.1,
          far: 1000,
        }}
      >
        <FrameloopController />
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
        {DevTools && (
          <Suspense fallback={null}>
            <DevTools />
          </Suspense>
        )}
      </Canvas>
    </div>
  );
}

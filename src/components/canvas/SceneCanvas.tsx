"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import { qualityPresets } from "@/config/look";
import { homeSections } from "@/config/sections";
import { useLookStore } from "@/store/look";
import { useSceneStore } from "@/store/scene";
import { FrameloopController } from "./FrameloopController";
import { Scene } from "./Scene";

const initialCamera = homeSections[0].camera;

/**
 * The persistent full-viewport canvas. Client-only: loaded via
 * SceneCanvasLoader with ssr: false.
 */
export default function SceneCanvas() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tier = useLookStore((s) => s.tier);

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
          dpr={qualityPresets[tier].dpr}
          flat // unlit, painted colors: no tone mapping
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
        </Canvas>
    </div>
  );
}

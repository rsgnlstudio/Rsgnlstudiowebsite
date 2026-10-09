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
 * SceneCanvasLoader with ssr: false. While a project overlay is open it slides
 * aside with the panel (left on desktop, up on mobile).
 */
export default function SceneCanvas() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tier = useLookStore((s) => s.tier);

  // Hide the canvas while sceneMode is "hidden", and push it aside while a
  // project overlay is open, without re-rendering.
  useEffect(() => {
    const apply = (mode: string) => {
      if (wrapperRef.current) {
        wrapperRef.current.style.visibility =
          mode === "hidden" ? "hidden" : "visible";
      }
    };
    const push = (open: boolean) => {
      if (wrapperRef.current) wrapperRef.current.toggleAttribute("data-pushed", open);
    };
    const state = useSceneStore.getState();
    apply(state.sceneMode);
    push(state.openFlower !== null);
    return useSceneStore.subscribe((state, prev) => {
      if (state.sceneMode !== prev.sceneMode) apply(state.sceneMode);
      if (state.openFlower !== prev.openFlower) push(state.openFlower !== null);
    });
  }, []);

  return (
    <div
        ref={wrapperRef}
        aria-hidden
        // Pushed aside by the project overlay, in step with its slide: by half
        // the panel, so the stage stays centred in the space left free.
        className="pointer-events-none fixed inset-0 z-0 transition-transform duration-(--overlay-duration) ease-overlay data-pushed:-translate-y-[46%] md:data-pushed:translate-y-0 md:data-pushed:-translate-x-1/3"
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

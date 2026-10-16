"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import { qualityPresets } from "@/config/look";
import { homeSections } from "@/config/sections";
import { useLookStore } from "@/store/look";
import { type SceneState, useSceneStore } from "@/store/scene";
import { FrameloopController } from "./FrameloopController";
import { Scene } from "./Scene";

const initialCamera = homeSections[0].camera;

/**
 * The persistent full-viewport canvas. Client-only: loaded via
 * SceneCanvasLoader with ssr: false. It fades in from the page's black once
 * the first frame has rendered (the scene starts out as the night's void,
 * behind the entry screen). While the day overlay or the night panel is
 * open it slides aside with the panel (left on desktop, up on mobile).
 */
export default function SceneCanvas() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);
  const tier = useLookStore((s) => s.tier);

  // Hide the canvas while sceneMode is "hidden", and push it aside while the
  // day overlay or the night panel is open, without re-rendering.
  useEffect(() => {
    const apply = (mode: string) => {
      if (wrapperRef.current) {
        wrapperRef.current.style.visibility =
          mode === "hidden" ? "hidden" : "visible";
      }
    };
    const push = ({ openBed, panel }: Pick<SceneState, "openBed" | "panel">) => {
      const el = wrapperRef.current;
      if (!el) return;
      const by = openBed ? "day" : panel ? "night" : null;
      if (by) el.dataset.pushed = by;
      else delete el.dataset.pushed;
    };
    const ready = (sceneReady: boolean) => {
      if (fadeRef.current && sceneReady) fadeRef.current.toggleAttribute("data-ready", true);
    };
    const state = useSceneStore.getState();
    apply(state.sceneMode);
    push(state);
    ready(state.sceneReady);
    return useSceneStore.subscribe((state, prev) => {
      if (state.sceneMode !== prev.sceneMode) apply(state.sceneMode);
      if (state.openBed !== prev.openBed || state.panel !== prev.panel) push(state);
      if (state.sceneReady !== prev.sceneReady) ready(state.sceneReady);
    });
  }, []);

  return (
    <div
      ref={wrapperRef}
      aria-hidden
      // Pushed aside by the day overlay or the night panel, in step with its
      // slide: by half the panel (on desktop two thirds of the width by day,
      // half by night; on mobile 92% of the height by day, two thirds by
      // night), so the stage stays centred in the space left free.
      className="pointer-events-none fixed inset-0 z-0 transition-transform duration-(--overlay-duration) ease-overlay data-[pushed=day]:-translate-y-[46%] data-[pushed=night]:-translate-y-1/3 md:data-pushed:translate-y-0 md:data-[pushed=day]:-translate-x-1/3 md:data-[pushed=night]:-translate-x-1/4"
    >
      <div
        ref={fadeRef}
        className="absolute inset-0 opacity-0 transition-opacity duration-1500 ease-smooth data-ready:opacity-100"
      >
        <Canvas
          frameloop="never" // FrameloopController starts it once the scene is compiled
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
          <Suspense fallback={null}>
            <Scene />
            <FrameloopController />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}

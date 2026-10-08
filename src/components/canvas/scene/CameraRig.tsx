"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { MathUtils, type PerspectiveCamera, Vector2, Vector3 } from "three";
import { sectionsByMode } from "@/config/scene";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useSceneStore } from "@/store/scene";
import { viewUniforms } from "../painterly/view";

/** Seconds for a full day -> night transition (reduced motion: shorter). */
const NIGHT_TRANSITION = 7;
const NIGHT_TRANSITION_REDUCED = 1.5;

/** Aspect ratio the keyframe FOVs are authored for (a 16:10 laptop). */
const REFERENCE_ASPECT = 1.6;

/**
 * Vertical FOV for the current aspect. Narrow screens widen the vertical FOV
 * so they keep part of the horizontal view; wide screens narrow it a little
 * so the meadow doesn't flatten out.
 */
function fovForAspect(fov: number, aspect: number) {
  const hTan = Math.tan(MathUtils.degToRad(fov / 2)) * REFERENCE_ASPECT;
  const keepWidth = MathUtils.radToDeg(2 * Math.atan(hTan / aspect));
  const k = aspect < REFERENCE_ASPECT ? 0.3 : 0.25;
  return MathUtils.clamp(MathUtils.lerp(fov, keepWidth, k), 28, 72);
}

const position = new Vector3();
const lookAt = new Vector3();
const offset = new Vector3();
const pointer = new Vector2();

/**
 * Places the camera on the scene mode's keyframe, fits the FOV to the aspect
 * ratio and adds a slight idle drift plus mouse parallax (both off when
 * reduced motion is preferred). Reads the store in useFrame; never subscribes.
 *
 * It also moves `night` toward the active section's target at a steady pace,
 * so leaving a day section plays the full sunset (skipped while the dev
 * `nightOverride` is set).
 *
 * Still to come: interpolating between section keyframes on scroll.
 */
export function CameraRig() {
  const reducedMotion = usePrefersReducedMotion();
  const reduced = useRef(reducedMotion);
  useEffect(() => {
    reduced.current = reducedMotion;
  }, [reducedMotion]);

  // The canvas ignores pointer events, so listen on the window.
  const target = useRef(new Vector2());
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      target.current.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1,
      );
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((state, delta) => {
    const camera = state.camera as PerspectiveCamera;
    const store = useSceneStore.getState();
    const sections = sectionsByMode[store.sceneMode];
    const keyframe = sections[0]?.camera;
    if (!keyframe) return;

    if (store.nightOverride === null) {
      const target =
        sections.find((section) => section.id === store.activeSection)?.night ?? sections[0].night;
      const duration = reduced.current ? NIGHT_TRANSITION_REDUCED : NIGHT_TRANSITION;
      const step = MathUtils.clamp(target - store.night, -delta / duration, delta / duration);
      if (step !== 0) store.setNight(store.night + step);
    }

    position.set(...keyframe.position);
    lookAt.set(...keyframe.lookAt);
    // Portrait: tilt down so the taller frame holds more meadow, less sky.
    const narrow = MathUtils.clamp(1 - camera.aspect, 0, 1);
    lookAt.y -= narrow * 9;

    if (reduced.current) {
      pointer.set(0, 0);
      offset.set(0, 0, 0);
    } else {
      pointer.lerp(target.current, 1 - Math.exp(-delta * 1.5));
      const t = state.clock.elapsedTime;
      offset.set(
        Math.sin(t * 0.13) * 0.03 + pointer.x * 0.18,
        Math.sin(t * 0.17 + 1.3) * 0.015 + pointer.y * 0.06,
        Math.sin(t * 0.09 + 0.4) * 0.02,
      );
    }
    camera.position.copy(position).add(offset);
    camera.lookAt(lookAt);

    const fov = fovForAspect(keyframe.fov, camera.aspect);
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    // The camera-locked foreground counter-moves like a world-fixed object.
    viewUniforms.uTanHalfFov.value = Math.tan(MathUtils.degToRad(fov / 2));
    viewUniforms.uAspect.value = camera.aspect;
    viewUniforms.uParallax.value.set(-offset.x, -offset.y);
    viewUniforms.uTreeSqueeze.value = MathUtils.clamp(
      0.4 + 0.6 * (camera.aspect / REFERENCE_ASPECT),
      0.4,
      1,
    );
  });

  return null;
}

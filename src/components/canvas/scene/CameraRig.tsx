"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import {
  MathUtils,
  Matrix4,
  type PerspectiveCamera,
  Quaternion,
  Vector2,
  Vector3,
} from "three";
import type { CameraKeyframe } from "@/config/sections";
import {
  DAY_NIGHT_DURATION,
  DAY_NIGHT_DURATION_REDUCED,
  nightCamera,
  nightFor,
  sectionsByMode,
} from "@/config/scene";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useSceneStore } from "@/store/scene";
import { viewUniforms } from "../painterly/view";

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

/** Symmetric ease for the day <-> night progress, and its inverse. */
const ease = (p: number) => 0.5 - 0.5 * Math.cos(Math.PI * p);
const unease = (n: number) => Math.acos(1 - 2 * MathUtils.clamp(n, 0, 1)) / Math.PI;

const UP = new Vector3(0, 1, 0);
const matrix = new Matrix4();
const eye = new Vector3();
const target = new Vector3();
const up = new Vector3();

/** Orientation of a keyframe; `tilt` lowers the look-at point. */
function orientation(out: Quaternion, keyframe: CameraKeyframe, tilt = 0) {
  eye.set(...keyframe.position);
  target.set(...keyframe.lookAt);
  target.y -= tilt;
  if (keyframe.up) up.set(...keyframe.up);
  else up.copy(UP);
  return out.setFromRotationMatrix(matrix.lookAt(eye, target, up));
}

const dayPosition = new Vector3();
const nightPosition = new Vector3();
const dayQuaternion = new Quaternion();
const nightQuaternion = new Quaternion();
const offset = new Vector3();
const drift = new Vector3();
const pointer = new Vector2();

/**
 * Moves `night` toward the store's timeOfDay over DAY_NIGHT_DURATION, eased,
 * and blends the camera with it: from the mode's first keyframe in the
 * meadow (day) up to `nightCamera`, high above and looking straight down
 * (night). Clicking mid-transition turns it around from where it is. While
 * the dev `nightOverride` is set, the camera follows the override instead.
 *
 * Also fits the FOV to the aspect ratio and adds a slight idle drift plus
 * mouse parallax (both off when reduced motion is preferred). Reads the store
 * in useFrame; never subscribes.
 */
export function CameraRig() {
  const reducedMotion = usePrefersReducedMotion();
  const reduced = useRef(reducedMotion);
  useEffect(() => {
    reduced.current = reducedMotion;
  }, [reducedMotion]);

  // The canvas ignores pointer events, so listen on the window.
  const pointerTarget = useRef(new Vector2());
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pointerTarget.current.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1,
      );
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  // Linear day -> night progress; `night` is its eased value.
  const progress = useRef(unease(useSceneStore.getState().night));

  useFrame((state, delta) => {
    const camera = state.camera as PerspectiveCamera;
    const store = useSceneStore.getState();
    const keyframe = sectionsByMode[store.sceneMode][0]?.camera;
    if (!keyframe) return;

    if (store.nightOverride === null) {
      const goal = nightFor[store.timeOfDay];
      const duration = reduced.current ? DAY_NIGHT_DURATION_REDUCED : DAY_NIGHT_DURATION;
      const step = MathUtils.clamp(goal - progress.current, -delta / duration, delta / duration);
      progress.current += step;
      const night = ease(progress.current);
      if (night !== store.night) store.setNight(night);
    } else {
      progress.current = unease(store.night);
    }
    const t = MathUtils.clamp(store.night, 0, 1);

    // Portrait: tilt down so the taller frame holds more meadow, less sky.
    const narrow = MathUtils.clamp(1 - camera.aspect, 0, 1);
    orientation(dayQuaternion, keyframe, narrow * 9);
    orientation(nightQuaternion, nightCamera);
    dayPosition.set(...keyframe.position);
    nightPosition.set(...nightCamera.position);

    // Flight and rotation share the one eased value, so they move as one.
    camera.quaternion.slerpQuaternions(dayQuaternion, nightQuaternion, t);
    camera.position.lerpVectors(dayPosition, nightPosition, t);

    if (reduced.current) {
      pointer.set(0, 0);
      offset.set(0, 0, 0);
    } else {
      pointer.lerp(pointerTarget.current, 1 - Math.exp(-delta * 1.5));
      const time = state.clock.elapsedTime;
      offset.set(
        Math.sin(time * 0.13) * 0.03 + pointer.x * 0.18,
        Math.sin(time * 0.17 + 1.3) * 0.015 + pointer.y * 0.06,
        Math.sin(time * 0.09 + 0.4) * 0.02,
      );
    }
    // Drift in view space, scaled up with altitude so it stays visible.
    camera.position.add(
      drift.copy(offset).multiplyScalar(1 + t * 10).applyQuaternion(camera.quaternion),
    );

    const fov = MathUtils.lerp(
      fovForAspect(keyframe.fov, camera.aspect),
      fovForAspect(nightCamera.fov, camera.aspect),
      t,
    );
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    // The camera-locked foreground counter-moves like a world-fixed object.
    viewUniforms.uTanHalfFov.value = Math.tan(MathUtils.degToRad(fov / 2));
    viewUniforms.uAspect.value = camera.aspect;
    viewUniforms.uParallax.value.set(-offset.x, -offset.y);
    viewUniforms.uTreeSqueeze.value = MathUtils.lerp(
      MathUtils.clamp(0.4 + 0.6 * (camera.aspect / REFERENCE_ASPECT), 0.4, 1),
      1,
      t,
    );
    viewUniforms.uTopView.value = t;
  });

  return null;
}

import { Vector2 } from "three";

/**
 * Camera projection terms for camera-locked layers (the foreground), written
 * by CameraRig every frame. uParallax is the camera's drift offset in view
 * space, so the locked layer can counter-move like a world-fixed object.
 * uTreeSqueeze pulls the tree lines toward the centre on narrow screens.
 */
export const viewUniforms = {
  uTanHalfFov: { value: Math.tan((45 * Math.PI) / 360) },
  uAspect: { value: 1 },
  uParallax: { value: new Vector2() },
  uTreeSqueeze: { value: 1 },
};

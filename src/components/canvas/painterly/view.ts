import { Vector2 } from "three";

/**
 * Camera projection terms for camera-locked layers (the foreground), written
 * by CameraRig every frame. uParallax is the camera's drift offset in view
 * space, so the locked layer can counter-move like a world-fixed object.
 * uTreeSqueeze pulls the tree lines toward the centre on narrow screens.
 * uTopView is how far the camera has moved into the night top view (0 = on
 * the ground, 1 = straight down from above): sprites turn to face it and the
 * foreground slides out of frame.
 */
export const viewUniforms = {
  uTanHalfFov: { value: Math.tan((45 * Math.PI) / 360) },
  uAspect: { value: 1 },
  uParallax: { value: new Vector2() },
  uTreeSqueeze: { value: 1 },
  uTopView: { value: 0 },
};

import { MathUtils, type PerspectiveCamera, Vector3 } from "three";
import { rayGroundDistance } from "./landscape";

/**
 * Camera terms, written by CameraRig every frame. uTreeSqueeze pulls the
 * tree lines toward the centre on narrow screens. uTopView is how far the
 * camera has moved into the night top view (0 = on the ground, 1 = straight
 * down from above): plants turn to face it. uPxPerUnit is the size in pixels
 * of one world unit at a distance of one unit (strokes use it to keep a
 * minimum width on screen).
 */
export const viewUniforms = {
  uTreeSqueeze: { value: 1 },
  uTopView: { value: 0 },
  uPxPerUnit: { value: 1000 },
};

const forward = new Vector3();

/**
 * Where the depth of field focuses: on the ground this far below the centre
 * of the frame (in half-frame heights), i.e. the near meadow a few metres
 * out. Everything beyond melts into soft paint, the flowers by the lens blur
 * the other way. The nightingale circles at this distance, so it stays sharp.
 */
const FOCUS_BELOW_CENTRE = 0.4;

/** Distance to the ground at the focus point of the frame. */
export function focusDistance(camera: PerspectiveCamera) {
  const tan = Math.tan(MathUtils.degToRad(camera.fov / 2));
  // From the quaternion: CameraRig set it this frame, matrixWorld lags.
  forward.set(0, -FOCUS_BELOW_CENTRE * tan, -1).normalize().applyQuaternion(camera.quaternion);
  return rayGroundDistance(camera.position, forward);
}

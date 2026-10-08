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

/**
 * Single source of truth for scroll sections and their camera keyframes.
 * Both the scroll logic (DOM) and the scene (canvas) read from this file.
 */

export type Vec3 = readonly [x: number, y: number, z: number];

export interface CameraKeyframe {
  position: Vec3;
  lookAt: Vec3;
  /** Camera up vector; defaults to +y. Needed when looking straight down. */
  up?: Vec3;
  fov: number;
}

export interface SectionConfig {
  /** DOM id of the <section>; also the value written to `activeSection`. */
  id: string;
  camera: CameraKeyframe;
}

// "intro" is the composed first viewport: low in the meadow, looking across
// the field to the mountains. FOVs are authored for a 16:10 screen; CameraRig
// adapts them to other aspect ratios. The other keyframes are placeholders.
export const homeSections = [
  {
    id: "intro",
    camera: { position: [0, 1.05, 0], lookAt: [0, 0.6, -40], fov: 50 },
  },
  {
    id: "middle",
    camera: { position: [4, 3, 8], lookAt: [0, 1, 0], fov: 45 },
  },
  {
    id: "outro",
    camera: { position: [0, 8, 20], lookAt: [0, 0, 0], fov: 55 },
  },
] as const satisfies readonly SectionConfig[];

export type HomeSectionId = (typeof homeSections)[number]["id"];

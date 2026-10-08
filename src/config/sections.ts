/**
 * Single source of truth for scroll sections and their scene state.
 * Both the scroll logic (DOM) and the scene (canvas) read from this file.
 */

export type Vec3 = readonly [x: number, y: number, z: number];

export interface CameraKeyframe {
  position: Vec3;
  lookAt: Vec3;
  fov: number;
}

export interface SectionConfig {
  /** DOM id of the <section>; also the value written to `activeSection`. */
  id: string;
  camera: CameraKeyframe;
  /** Target night value for this section: 0 = day, 1 = night. */
  night: number;
}

// Placeholder values; tune once the scene exists.
export const homeSections = [
  {
    id: "intro",
    camera: { position: [0, 2, 10], lookAt: [0, 1, 0], fov: 45 },
    night: 0,
  },
  {
    id: "middle",
    camera: { position: [4, 3, 8], lookAt: [0, 1, 0], fov: 45 },
    night: 0,
  },
  {
    id: "outro",
    camera: { position: [0, 8, 20], lookAt: [0, 0, 0], fov: 55 },
    night: 1,
  },
] as const satisfies readonly SectionConfig[];

export type HomeSectionId = (typeof homeSections)[number]["id"];

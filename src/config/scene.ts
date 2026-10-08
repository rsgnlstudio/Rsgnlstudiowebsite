import { type CameraKeyframe, homeSections, type SectionConfig } from "./sections";

/**
 * Scene modes a page can request. Add a mode here (and its sections below)
 * when a new route needs its own scene state.
 */
export const SCENE_MODES = ["home", "hidden"] as const;
export type SceneMode = (typeof SCENE_MODES)[number];

/** Mode the canvas falls back to when no page has claimed it. */
export const DEFAULT_SCENE_MODE: SceneMode = "hidden";

/** Sections (camera keyframes) per scene mode. */
export const sectionsByMode: Record<SceneMode, readonly SectionConfig[]> = {
  home: homeSections,
  hidden: [],
};

/** Day or night, picked by the user in the Day/Night switch. */
export const TIMES_OF_DAY = ["day", "night"] as const;
export type TimeOfDay = (typeof TIMES_OF_DAY)[number];

/** `night` target per time of day. */
export const nightFor: Record<TimeOfDay, number> = { day: 0, night: 1 };

/** Seconds for a full day <-> night transition (sunset plus camera move). */
export const DAY_NIGHT_DURATION = 4;
/** The same with reduced motion. */
export const DAY_NIGHT_DURATION_REDUCED = 1.2;

/**
 * Night camera: high above the meadow, looking straight down, with the far
 * side of the field (toward the mountains) at the top of the frame. The day
 * camera is the scene mode's first section keyframe; CameraRig blends the
 * two by `night`.
 */
export const nightCamera: CameraKeyframe = {
  position: [0, 110, -42],
  lookAt: [0, 0, -42],
  up: [0, 0, -1],
  fov: 50,
};

/**
 * `night` range over which the painted day world dissolves into the night
 * dust world (and reassembles on the way back). It starts as the camera
 * lifts off and ends just before it reaches the top view, so the whole
 * flight is one slow crumble.
 */
export const DISSOLVE_RANGE = [0.12, 0.86] as const;

/** Height above the ground of the light that follows the cursor at night. */
export const CURSOR_LIGHT_HEIGHT = 7;

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
export const DAY_NIGHT_DURATION = 5.5;
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
 * `night` range over which the painted day world morphs into the night dust
 * world (and back): everywhere at once, the paint takes on the night light
 * and sinks into the dark while the dust condenses under the same light. It
 * starts as the camera lifts off and ends just before it reaches the top
 * view, so the whole flight is one slow change of light.
 */
export const MORPH_RANGE = [0.12, 0.86] as const;

/**
 * Seconds the intro takes: on entering the site the world is painted in out
 * of the dark (sky first, then the land from far to near, plants growing up)
 * while the camera zooms in the whole time (moving in and narrowing its FOV).
 */
export const INTRO_DURATION = 6.5;
/** The same with reduced motion (no camera move). */
export const INTRO_DURATION_REDUCED = 1.2;
/**
 * How far the world is already built (`uBuild`) behind the entry screen: the
 * sky, the mountains and the far trees are painted, the meadow is still dark.
 * The intro carries on from there.
 */
export const INTRO_BUILD_FROM = 0.3;
/** `intro` progress at which the UI starts to appear. */
export const INTRO_UI_AT = 0.82;
/**
 * Where the intro camera starts, relative to the day keyframe, in view space
 * (metres): pulled back and up, moving in to the keyframe over the build-up.
 */
export const INTRO_CAMERA_OFFSET = [0, 1.3, 6] as const;
/** Degrees the intro camera's FOV starts wider than the keyframe's. */
export const INTRO_FOV_OFFSET = 9;

/** Height above the ground of the light that follows the cursor at night. */
export const CURSOR_LIGHT_HEIGHT = 7;

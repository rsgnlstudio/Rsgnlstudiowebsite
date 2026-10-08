import { homeSections, type SectionConfig } from "./sections";

/**
 * Scene modes a page can request. Add a mode here (and its sections below)
 * when a new route needs its own scene state.
 */
export const SCENE_MODES = ["home", "hidden"] as const;
export type SceneMode = (typeof SCENE_MODES)[number];

/** Mode the canvas falls back to when no page has claimed it. */
export const DEFAULT_SCENE_MODE: SceneMode = "hidden";

/** Sections (camera keyframes + night targets) per scene mode. */
export const sectionsByMode: Record<SceneMode, readonly SectionConfig[]> = {
  home: homeSections,
  hidden: [],
};

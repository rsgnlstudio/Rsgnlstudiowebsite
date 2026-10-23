import { create } from "zustand";
import type { ProjectBedId } from "@/config/flowers";
import { type ChallengeId, type NightPanel, PLACES } from "@/config/nightMap";
import { DEFAULT_SCENE_MODE, type SceneMode, type TimeOfDay } from "@/config/scene";

/**
 * The only bridge between DOM and canvas.
 *
 * - React components may subscribe to slow-changing values (e.g. sceneMode).
 * - Per-frame code (useFrame) must read via `useSceneStore.getState()` and
 *   never subscribe, so scrolling never triggers React re-renders.
 */
export interface SceneState {
  /** id of the section currently in view, from src/config/sections.ts. */
  activeSection: string | null;
  /** 0..1 progress through the active section. */
  sectionProgress: number;
  /** 0..1 progress through the whole page. */
  scrollProgress: number;
  /** Day or night, as picked in the Day/Night switch. `night` follows it. */
  timeOfDay: TimeOfDay;
  /** 0 = day, 1 = night. Animated toward timeOfDay by CameraRig. */
  night: number;
  /** The scene has rendered its first frame (set by CameraRig). */
  sceneReady: boolean;
  /** The visitor has passed the entry screen; the intro starts then. */
  entered: boolean;
  /**
   * Intro build-up after entering the site, 0..1 (linear progress). Advanced
   * by CameraRig; the UI appears once it passes INTRO_UI_AT.
   */
  intro: number;
  /** Set by the current page; "hidden" pauses rendering. */
  sceneMode: SceneMode;
  /** Project flower bed under the cursor (day only), from src/config/flowers.ts. */
  hoveredBed: ProjectBedId | null;
  /** Project flower bed whose overlay is open (click or tap). */
  openBed: ProjectBedId | null;
  /**
   * The night intro (the lines shown while the camera flies up): it plays
   * the first time the night is chosen. The map takes clicks once it is done.
   */
  nightIntro: "pending" | "playing" | "done";
  /** What the night panel shows (src/config/nightMap.ts), or null when closed. */
  panel: NightPanel | null;
  /** The path whose clearing was chosen; it stays lit after the panel closes. */
  activePath: ChallengeId | null;
  /** Fractional step along the active path the panel is scrolled to (0 = its clearing). */
  pathStation: number;
  /** Index into PLACES of the place under the cursor or focused (night map). */
  hoveredPlace: number | null;
  /**
   * Screen position of every place this frame (x, y in viewport CSS pixels,
   * then 1 when on screen), written in place by the canvas (NightMap) every frame.
   * The DOM reads it with getState() in its own frame loop; never subscribe.
   */
  placeScreen: Float32Array;
  /** How many testimonials exist (fireflies beyond it stay dark). Written by ContentProvider. */
  testimonialCount: number;
  /** The BAFA subsidy runs (the lantern shows). Written by ContentProvider. */
  bafaActive: boolean;
  /** Project beds that open an outside page in a new tab instead of the overlay (`href`). Written by ContentProvider. */
  bedLinks: Partial<Record<ProjectBedId, string>>;

  setActiveSection: (id: string | null) => void;
  setSectionProgress: (progress: number) => void;
  setScrollProgress: (progress: number) => void;
  setTimeOfDay: (timeOfDay: TimeOfDay) => void;
  setNight: (night: number) => void;
  setSceneReady: (ready: boolean) => void;
  setEntered: (entered: boolean) => void;
  setIntro: (intro: number) => void;
  setSceneMode: (mode: SceneMode) => void;
  setHoveredBed: (id: ProjectBedId | null) => void;
  setOpenBed: (id: ProjectBedId | null) => void;
  setNightIntro: (state: SceneState["nightIntro"]) => void;
  /** Opens the night panel; a path's panel also lights its path, from its clearing. */
  setPanel: (panel: NightPanel | null) => void;
  setContentFlags: (flags: Pick<SceneState, "testimonialCount" | "bafaActive" | "bedLinks">) => void;
  setPathStation: (station: number) => void;
  setHoveredPlace: (index: number | null) => void;
  /** Clears scroll-derived state, e.g. when a page unmounts. */
  resetScroll: () => void;
}

/** True while the day overlay or the night panel is open. */
export const overlayOpen = (s: Pick<SceneState, "openBed" | "panel">) => s.openBed !== null || s.panel !== null;

export const useSceneStore = create<SceneState>()((set) => ({
  activeSection: null,
  sectionProgress: 0,
  scrollProgress: 0,
  timeOfDay: "day",
  night: 0,
  sceneReady: false,
  entered: false,
  intro: 0,
  sceneMode: DEFAULT_SCENE_MODE,
  hoveredBed: null,
  openBed: null,
  nightIntro: "pending",
  panel: null,
  activePath: null,
  pathStation: 0,
  hoveredPlace: null,
  placeScreen: new Float32Array(PLACES.length * 3),
  testimonialCount: 0,
  bafaActive: false,
  bedLinks: {},

  setActiveSection: (activeSection) => set({ activeSection }),
  setSectionProgress: (sectionProgress) => set({ sectionProgress }),
  setScrollProgress: (scrollProgress) => set({ scrollProgress }),
  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
  setNight: (night) => set({ night }),
  setSceneReady: (sceneReady) => set({ sceneReady }),
  setEntered: (entered) => set({ entered }),
  setIntro: (intro) => set({ intro }),
  setSceneMode: (sceneMode) => set({ sceneMode }),
  setHoveredBed: (hoveredBed) => set({ hoveredBed }),
  setOpenBed: (openBed) => set({ openBed }),
  setNightIntro: (nightIntro) => set({ nightIntro }),
  setPanel: (panel) =>
    set(panel?.kind === "path" ? { panel, activePath: panel.id, pathStation: 0 } : { panel }),
  setContentFlags: (flags) => set(flags),
  setPathStation: (pathStation) => set({ pathStation }),
  setHoveredPlace: (hoveredPlace) => set({ hoveredPlace }),
  resetScroll: () =>
    set({ activeSection: null, sectionProgress: 0, scrollProgress: 0 }),
}));

/** Opens a night panel (or another one); the map follows. */
export const openPanel = (panel: NightPanel) => useSceneStore.getState().setPanel(panel);

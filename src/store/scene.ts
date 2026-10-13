import { create } from "zustand";
import type { ProjectBedId } from "@/config/flowers";
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
  /** Clears scroll-derived state, e.g. when a page unmounts. */
  resetScroll: () => void;
}

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
  resetScroll: () =>
    set({ activeSection: null, sectionProgress: 0, scrollProgress: 0 }),
}));

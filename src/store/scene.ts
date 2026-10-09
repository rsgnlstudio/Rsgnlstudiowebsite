import { create } from "zustand";
import type { FeaturedFlowerId } from "@/config/flowers";
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
  /** Set by the current page; "hidden" pauses rendering. */
  sceneMode: SceneMode;
  /** Featured flower under the cursor (day only), from src/config/flowers.ts. */
  hoveredFlower: FeaturedFlowerId | null;
  /** Featured flower whose project overlay is open (click or tap). */
  openFlower: FeaturedFlowerId | null;

  setActiveSection: (id: string | null) => void;
  setSectionProgress: (progress: number) => void;
  setScrollProgress: (progress: number) => void;
  setTimeOfDay: (timeOfDay: TimeOfDay) => void;
  setNight: (night: number) => void;
  setSceneMode: (mode: SceneMode) => void;
  setHoveredFlower: (id: FeaturedFlowerId | null) => void;
  setOpenFlower: (id: FeaturedFlowerId | null) => void;
  /** Clears scroll-derived state, e.g. when a page unmounts. */
  resetScroll: () => void;
}

export const useSceneStore = create<SceneState>()((set) => ({
  activeSection: null,
  sectionProgress: 0,
  scrollProgress: 0,
  timeOfDay: "day",
  night: 0,
  sceneMode: DEFAULT_SCENE_MODE,
  hoveredFlower: null,
  openFlower: null,

  setActiveSection: (activeSection) => set({ activeSection }),
  setSectionProgress: (sectionProgress) => set({ sectionProgress }),
  setScrollProgress: (scrollProgress) => set({ scrollProgress }),
  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
  setNight: (night) => set({ night }),
  setSceneMode: (sceneMode) => set({ sceneMode }),
  setHoveredFlower: (hoveredFlower) => set({ hoveredFlower }),
  setOpenFlower: (openFlower) => set({ openFlower }),
  resetScroll: () =>
    set({ activeSection: null, sectionProgress: 0, scrollProgress: 0 }),
}));

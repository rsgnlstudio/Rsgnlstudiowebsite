import { create } from "zustand";

/**
 * Whether the ambient sound is on. On by default: the entry screen's "Enter"
 * starts it (that click is the gesture browsers need before audio), and it
 * swells in with the intro; "Enter without sound" turns it off. Turn it on
 * and off through `setSoundEnabled` in `src/lib/ambient.ts`, which also
 * drives the audio engine.
 */
export interface SoundState {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export const useSoundStore = create<SoundState>()((set) => ({
  enabled: true,
  setEnabled: (enabled) => set({ enabled }),
}));

import { create } from "zustand";

/**
 * Whether the ambient sound is on. Off by default: browsers only allow audio
 * after a user gesture, so it starts from the sound toggle. Turn it on and
 * off through `setSoundEnabled` in `src/lib/ambient.ts`, which also drives
 * the audio engine.
 */
export interface SoundState {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export const useSoundStore = create<SoundState>()((set) => ({
  enabled: false,
  setEnabled: (enabled) => set({ enabled }),
}));

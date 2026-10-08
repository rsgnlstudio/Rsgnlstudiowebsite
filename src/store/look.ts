import { create } from "zustand";
import { defaultLook, type LookSettings, type QualityTier } from "@/config/look";
import { type Palette, type PaletteSet, palettes } from "@/config/palette";
import { detectQualityTier } from "@/lib/quality";

/**
 * Runtime look settings for the canvas: effect parameters, densities and the
 * three palette sets. Canvas-internal (the DOM never reads it). Defaults come
 * from src/config/look.ts and src/config/palette.ts; leva edits this copy in
 * development.
 *
 * Per-frame code reads it with `useLookStore.getState()`. Components that
 * rebuild geometry (e.g. on flowerDensity) may subscribe with a selector.
 */
export interface LookState extends LookSettings {
  tier: QualityTier;
  palettes: Record<PaletteSet, Palette>;
  set: (partial: Partial<LookSettings>) => void;
  setPaletteColor: (set: PaletteSet, key: keyof Palette, hex: string) => void;
}

export const useLookStore = create<LookState>()((set) => ({
  ...defaultLook,
  // Only the client-only canvas imports this store, but guard anyway.
  tier: typeof window === "undefined" ? "high" : detectQualityTier(),
  palettes: { day: { ...palettes.day }, dusk: { ...palettes.dusk }, night: { ...palettes.night } },
  set: (partial) => set(partial),
  setPaletteColor: (which, key, hex) =>
    set((state) => ({
      palettes: { ...state.palettes, [which]: { ...state.palettes[which], [key]: hex } },
    })),
}));

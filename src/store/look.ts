import { create } from "zustand";
import { defaultLook, type LookSettings, type QualityTier } from "@/config/look";
import { type Palette, type PaletteSet, palettes } from "@/config/palette";
import { detectQualityTier } from "@/lib/quality";

/**
 * Runtime look settings for the canvas: effect parameters, densities and the
 * three palette sets. Canvas-internal (the DOM never reads it). Defaults come
 * from src/config/look.ts and src/config/palette.ts.
 *
 * Per-frame code reads it with `useLookStore.getState()`. Components that
 * rebuild geometry (e.g. on flowerDensity) may subscribe with a selector.
 */
export interface LookState extends LookSettings {
  tier: QualityTier;
  palettes: Record<PaletteSet, Palette>;
}

const defaultPalettes = (): Record<PaletteSet, Palette> => ({
  day: { ...palettes.day },
  dusk: { ...palettes.dusk },
  night: { ...palettes.night },
});

export const useLookStore = create<LookState>()(() => ({
  ...defaultLook,
  // Only the client-only canvas imports this store, but guard anyway.
  tier: typeof window === "undefined" ? "high" : detectQualityTier(),
  palettes: defaultPalettes(),
}));

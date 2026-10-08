"use client";

import { button, folder, useControls } from "leva";
import { Perf } from "r3f-perf";
import { defaultLook } from "@/config/look";
import { PALETTE_KEYS, type Palette, type PaletteSet, palettes } from "@/config/palette";
import { useLookStore } from "@/store/look";
import { useSceneStore } from "@/store/scene";

const paletteControls = (which: PaletteSet, palette: Palette) =>
  Object.fromEntries(
    PALETTE_KEYS.map((key) => [
      `${which}.${key}`,
      {
        label: key,
        value: palette[key],
        onChange: (hex: string) => useLookStore.getState().setPaletteColor(which, key, hex),
      },
    ]),
  );

const lookControl = (
  key:
    | "focusDistance"
    | "focusRange"
    | "blurStrength"
    | "grain"
    | "vignette"
    | "flowerDensity"
    | "wind"
    | "strokeScale"
    | "glow",
  min: number,
  max: number,
  step: number,
  label: string = key,
) => ({
  label,
  value: defaultLook[key],
  min,
  max,
  step,
  onChange: (value: number) => useLookStore.getState().set({ [key]: value }),
});

/**
 * Development-only tooling, rendered inside the Canvas. Never import this
 * file statically; SceneCanvas lazy-loads it in development only.
 */
export default function DevTools() {
  useControls("Scene", {
    overrideNight: {
      label: "override",
      value: false,
      onChange: (enabled: boolean, _path, { get }) => {
        const { setNightOverride, setNight } = useSceneStore.getState();
        if (!enabled) return setNightOverride(null);
        const night = get("Scene.night") as number;
        setNightOverride(night);
        setNight(night);
      },
    },
    night: {
      value: 0,
      min: 0,
      max: 1,
      step: 0.01,
      onChange: (value: number) => {
        const { nightOverride, setNightOverride, setNight } =
          useSceneStore.getState();
        if (nightOverride === null) return;
        setNightOverride(value);
        setNight(value);
      },
    },
    "log store": button(() => console.log(useSceneStore.getState())),
  });

  useControls("Look", {
    focusDistance: lookControl("focusDistance", 1, 60, 0.1, "focus distance"),
    focusRange: lookControl("focusRange", 1, 120, 0.5, "focus range"),
    blurStrength: lookControl("blurStrength", 0, 10, 0.1, "blur strength"),
    grain: lookControl("grain", 0, 1, 0.01),
    vignette: lookControl("vignette", 0, 1, 0.01),
    flowerDensity: lookControl("flowerDensity", 0.1, 2, 0.05, "flower density"),
    wind: lookControl("wind", 0, 3, 0.05),
    glow: lookControl("glow", 0, 3, 0.05),
    brushStrokes: {
      label: "brushstrokes",
      value: defaultLook.brushStrokes,
      onChange: (brushStrokes: boolean) => useLookStore.getState().set({ brushStrokes }),
    },
    strokeScale: lookControl("strokeScale", 0.4, 2.5, 0.05, "stroke size"),
  });

  useControls(
    "Palette",
    {
      day: folder(paletteControls("day", palettes.day), { collapsed: true }),
      dusk: folder(paletteControls("dusk", palettes.dusk), { collapsed: true }),
      night: folder(paletteControls("night", palettes.night), { collapsed: true }),
    },
    { collapsed: true },
  );

  return <Perf position="bottom-right" />;
}

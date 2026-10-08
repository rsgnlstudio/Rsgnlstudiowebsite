"use client";

import { button, folder, Leva, useControls } from "leva";
import { useEffect, useState } from "react";
import { defaultLook, type LookSettings } from "@/config/look";
import { PALETTE_KEYS, type Palette, type PaletteSet, palettes } from "@/config/palette";
import { useLookStore } from "@/store/look";
import { useSceneStore } from "@/store/scene";

const PALETTE_SETS = ["day", "dusk", "night"] as const satisfies readonly PaletteSet[];

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

/** Every palette control at its default, keyed like paletteControls. */
const defaultPaletteValues = () =>
  Object.fromEntries(
    PALETTE_SETS.flatMap((which) =>
      PALETTE_KEYS.map((key) => [`${which}.${key}`, palettes[which][key]]),
    ),
  );

const lookControl = (
  key: keyof LookSettings,
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

/** Keyboard keys that show and hide the panel. */
const SHOW_KEY = "2";
const HIDE_KEY = "1";

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/**
 * Development-only leva panel, rendered next to the canvas (not inside it).
 * Hidden by default: press 2 to show it, 1 to hide it. "reset" restores the
 * defaults from src/config/look.ts and src/config/palette.ts. Never import
 * this file statically; SceneCanvas lazy-loads it in development only.
 */
export default function DevTools() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      if (event.key === SHOW_KEY) setVisible(true);
      else if (event.key === HIDE_KEY) setVisible(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const [, setScene] = useControls("Scene", () => ({
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
        const { nightOverride, setNightOverride, setNight } = useSceneStore.getState();
        if (nightOverride === null) return;
        setNightOverride(value);
        setNight(value);
      },
    },
    "log store": button(() => console.log(useSceneStore.getState())),
  }));

  const [, setLook] = useControls("Look", () => ({
    focusRange: lookControl("focusRange", 1, 200, 0.5, "focus range"),
    blurStrength: lookControl("blurStrength", 0, 10, 0.1, "blur strength"),
    grain: lookControl("grain", 0, 1, 0.01),
    vignette: lookControl("vignette", 0, 1, 0.01),
    flowerDensity: lookControl("flowerDensity", 0.1, 2, 0.05, "flower density"),
    wind: lookControl("wind", 0, 3, 0.05),
    glow: lookControl("glow", 0, 3, 0.05),
    fringe: lookControl("fringe", 0, 1, 0.01),
    night: folder({
      lightIntensity: lookControl("lightIntensity", 0, 8, 0.05, "light intensity"),
      lightRadius: lookControl("lightRadius", 5, 80, 0.5, "light radius"),
      dustSize: lookControl("dustSize", 0.3, 4, 0.05, "dust size"),
      dustBokeh: lookControl("dustBokeh", 0, 3, 0.05, "dust bokeh"),
      dustKick: lookControl("dustKick", 0, 3, 0.05, "dust kick"),
    }),
  }));

  const [, setPalette] = useControls(
    "Palette",
    () => ({
      day: folder(paletteControls("day", palettes.day), { collapsed: true }),
      dusk: folder(paletteControls("dusk", palettes.dusk), { collapsed: true }),
      night: folder(paletteControls("night", palettes.night), { collapsed: true }),
    }),
    { collapsed: true },
  );

  // Setting the controls fires their onChange, which writes the stores.
  useControls(
    () => ({
      reset: button(() => {
        setScene({ overrideNight: false, night: 0 });
        setLook({ ...defaultLook });
        setPalette(defaultPaletteValues());
        useLookStore.getState().reset();
      }),
    }),
    [setScene, setLook, setPalette],
  );

  return <Leva hidden={!visible} />;
}

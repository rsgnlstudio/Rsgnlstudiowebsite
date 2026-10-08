"use client";

import { button, useControls } from "leva";
import { Perf } from "r3f-perf";
import { useSceneStore } from "@/store/scene";

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

  return <Perf position="bottom-right" />;
}

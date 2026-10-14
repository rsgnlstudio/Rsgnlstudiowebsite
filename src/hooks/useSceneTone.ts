"use client";

import type { CSSProperties } from "react";
import { DAY_NIGHT_DURATION, DAY_NIGHT_DURATION_REDUCED } from "@/config/scene";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useSceneStore } from "@/store/scene";

/**
 * The colors of the chrome over the scene, crossing over with the
 * Day/Night switch: `glass` for the frosted pill and round buttons, `menu`
 * for the mobile menu's sheet, and `style`, the crossover's duration
 * (shorter with reduced motion), for the element that transitions them.
 */
export function useSceneTone() {
  const night = useSceneStore((s) => s.timeOfDay === "night");
  const reducedMotion = usePrefersReducedMotion();
  const duration = reducedMotion ? DAY_NIGHT_DURATION_REDUCED : DAY_NIGHT_DURATION;
  return {
    night,
    duration,
    glass: night ? "bg-on-day/30 text-on-night" : "bg-on-night/30 text-on-day",
    menu: night ? "bg-panel-night/90 text-on-night" : "bg-on-night/90 text-on-day",
    style: { transitionDuration: `${duration}s` } satisfies CSSProperties,
  };
}

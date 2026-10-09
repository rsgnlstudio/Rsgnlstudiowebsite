"use client";

import {
  DAY_NIGHT_DURATION,
  DAY_NIGHT_DURATION_REDUCED,
  TIMES_OF_DAY,
  type TimeOfDay,
} from "@/config/scene";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useReveal } from "@/hooks/useReveal";
import { useSceneStore } from "@/store/scene";

const LABELS: Record<TimeOfDay, string> = { day: "Day", night: "Night" };

/**
 * Pill switch at the top centre that turns the scene from day to night and
 * back. It only writes `timeOfDay` to the store; CameraRig animates the
 * sunset and the camera. The active item is underlined; the text color and
 * the frosted fill cross over with the scene. It appears after the intro.
 */
export function DayNightSwitch() {
  const timeOfDay = useSceneStore((s) => s.timeOfDay);
  const setTimeOfDay = useSceneStore((s) => s.setTimeOfDay);
  const reducedMotion = usePrefersReducedMotion();
  const duration = reducedMotion ? DAY_NIGHT_DURATION_REDUCED : DAY_NIGHT_DURATION;
  const reveal = useReveal<HTMLDivElement>();

  return (
    <nav aria-label="Time of day" className="fixed top-6 left-1/2 z-20 -translate-x-1/2">
      <div
        ref={reveal}
        className={`invisible relative grid grid-cols-2 rounded-full border border-current/10 p-1 opacity-0 backdrop-blur-md transition-colors ease-smooth ${
          timeOfDay === "night" ? "bg-on-day/30 text-on-night" : "bg-on-night/30 text-on-day"
        }`}
        style={{ transitionDuration: `${duration}s` }}
      >
        {TIMES_OF_DAY.map((time) => (
          <button
            key={time}
            type="button"
            aria-pressed={time === timeOfDay}
            onClick={() => setTimeOfDay(time)}
            className="relative cursor-pointer rounded-full px-6 py-1.5 text-body opacity-55 transition-opacity duration-700 ease-smooth decoration-1 underline-offset-4 hover:opacity-80 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-current aria-pressed:underline aria-pressed:opacity-100"
          >
            {LABELS[time]}
          </button>
        ))}
      </div>
    </nav>
  );
}

"use client";

import {
  DAY_NIGHT_DURATION,
  DAY_NIGHT_DURATION_REDUCED,
  TIMES_OF_DAY,
  type TimeOfDay,
} from "@/config/scene";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useSceneStore } from "@/store/scene";

const LABELS: Record<TimeOfDay, string> = { day: "Day", night: "Night" };

/**
 * Pill switch at the top centre that turns the scene from day to night and
 * back. It only writes `timeOfDay` to the store; CameraRig animates the
 * sunset and the camera. The text color crosses over with the scene.
 */
export function DayNightSwitch() {
  const timeOfDay = useSceneStore((s) => s.timeOfDay);
  const setTimeOfDay = useSceneStore((s) => s.setTimeOfDay);
  const reducedMotion = usePrefersReducedMotion();
  const duration = reducedMotion ? DAY_NIGHT_DURATION_REDUCED : DAY_NIGHT_DURATION;
  const active = TIMES_OF_DAY.indexOf(timeOfDay);

  return (
    <nav aria-label="Time of day" className="fixed top-6 left-1/2 z-20 -translate-x-1/2">
      <div
        className={`relative grid grid-cols-2 rounded-full border border-current p-1 transition-colors ease-in-out ${
          timeOfDay === "night" ? "text-on-night" : "text-on-day"
        }`}
        style={{ transitionDuration: `${duration}s` }}
      >
        {/* Outline marking the active item; slides between the two. */}
        <span
          aria-hidden
          className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full border border-current transition-transform duration-500 ease-in-out motion-reduce:duration-0"
          style={{ transform: `translateX(${active * 100}%)` }}
        />
        {TIMES_OF_DAY.map((time) => (
          <button
            key={time}
            type="button"
            aria-pressed={time === timeOfDay}
            onClick={() => setTimeOfDay(time)}
            className="relative cursor-pointer rounded-full px-6 py-1.5 text-body opacity-55 transition-opacity duration-500 hover:opacity-80 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-current aria-pressed:opacity-100"
          >
            {LABELS[time]}
          </button>
        ))}
      </div>
    </nav>
  );
}

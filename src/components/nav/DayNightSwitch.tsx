"use client";

import { type LucideIcon, Moon, Sun } from "lucide-react";
import { TIMES_OF_DAY, type TimeOfDay } from "@/config/scene";
import { useSceneStore } from "@/store/scene";

const ITEMS: Record<TimeOfDay, { label: string; Icon: LucideIcon }> = {
  day: { label: "Kunst", Icon: Sun },
  night: { label: "Consulting", Icon: Moon },
};

/**
 * The Day/Night pair at the start of the top navigation (`TopNav`), labelled
 * "Kunst" (sun) and "Consulting" (moon), which turns the scene from day to night
 * and back. It only writes `timeOfDay` to
 * the store; CameraRig animates the sunset and the camera. The active item
 * label is underlined.
 */
export function DayNightSwitch() {
  const timeOfDay = useSceneStore((s) => s.timeOfDay);
  const setTimeOfDay = useSceneStore((s) => s.setTimeOfDay);

  return (
    <div role="group" aria-label="Tageszeit" className="flex">
      {TIMES_OF_DAY.map((time) => {
        const { label, Icon } = ITEMS[time];
        return (
          <button
            key={time}
            type="button"
            aria-pressed={time === timeOfDay}
            onClick={() => setTimeOfDay(time)}
            className="relative flex cursor-pointer items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-nav opacity-55 transition-opacity duration-700 ease-smooth decoration-1 underline-offset-4 hover:opacity-80 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-current aria-pressed:underline aria-pressed:opacity-100 md:px-6"
          >
            <Icon aria-hidden className="hidden size-4 sm:block" strokeWidth={1.5} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

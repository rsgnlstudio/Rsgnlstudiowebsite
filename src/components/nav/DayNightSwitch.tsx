"use client";

import { type LucideIcon, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/Button";
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
          <Button
            key={time}
            variant="ghost"
            aria-pressed={time === timeOfDay}
            onClick={() => setTimeOfDay(time)}
            className="decoration-1 underline-offset-4 aria-pressed:underline"
          >
            <Icon aria-hidden className="hidden size-4 sm:block" strokeWidth={1.5} />
            {label}
          </Button>
        );
      })}
    </div>
  );
}

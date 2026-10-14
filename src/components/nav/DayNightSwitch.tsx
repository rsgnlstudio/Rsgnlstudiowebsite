"use client";

import { type LucideIcon, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { TIMES_OF_DAY, type TimeOfDay } from "@/config/scene";
import { useContent } from "@/content/ContentProvider";
import { useSceneStore } from "@/store/scene";

const ITEMS: Record<TimeOfDay, LucideIcon> = { day: Sun, night: Moon };

/**
 * The Day/Night pair at the start of the top navigation (`TopNav`), labelled
 * "Kunst" (sun) and "Consulting" (moon), which turns the scene from day to night
 * and back. It only writes `timeOfDay` to
 * the store; CameraRig animates the sunset and the camera. The active item
 * label is underlined.
 */
export function DayNightSwitch() {
  const { studio } = useContent();
  const timeOfDay = useSceneStore((s) => s.timeOfDay);
  const setTimeOfDay = useSceneStore((s) => s.setTimeOfDay);

  return (
    <div role="group" aria-label={studio.timeOfDay.label} className="flex">
      {TIMES_OF_DAY.map((time) => {
        return (
          <Button
            key={time}
            variant="ghost"
            aria-pressed={time === timeOfDay}
            onClick={() => setTimeOfDay(time)}
            className="decoration-1 underline-offset-4 aria-pressed:underline"
          >
            <Icon icon={ITEMS[time]} size="sm" className="hidden sm:block" />
            {studio.timeOfDay[time]}
          </Button>
        );
      })}
    </div>
  );
}

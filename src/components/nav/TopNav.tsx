"use client";

import { ContactButton } from "@/components/nav/ContactButton";
import { DayNightSwitch } from "@/components/nav/DayNightSwitch";
import { ImprintLink } from "@/components/nav/ImprintLink";
import { DAY_NIGHT_DURATION, DAY_NIGHT_DURATION_REDUCED } from "@/config/scene";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useReveal } from "@/hooks/useReveal";
import { useSceneStore } from "@/store/scene";

/**
 * The top navigation: one frosted pill at the top centre holding the
 * Day/Night switch, the imprint and the contact call to action. The text
 * color and the frosted fill cross over with the scene. It appears after
 * the intro.
 */
export function TopNav() {
  const timeOfDay = useSceneStore((s) => s.timeOfDay);
  const reducedMotion = usePrefersReducedMotion();
  const duration = reducedMotion ? DAY_NIGHT_DURATION_REDUCED : DAY_NIGHT_DURATION;
  const reveal = useReveal<HTMLDivElement>();

  return (
    <nav aria-label="Main" className="fixed top-6 left-1/2 z-20 -translate-x-1/2">
      <div
        ref={reveal}
        className={`invisible flex items-center rounded-full border border-current/10 p-1 whitespace-nowrap opacity-0 backdrop-blur-md transition-colors ease-smooth ${
          timeOfDay === "night" ? "bg-on-day/30 text-on-night" : "bg-on-night/30 text-on-day"
        }`}
        style={{ transitionDuration: `${duration}s` }}
      >
        <DayNightSwitch />
        <span aria-hidden className="mx-1 h-4 w-px bg-current opacity-20" />
        <ImprintLink />
        <ContactButton />
      </div>
    </nav>
  );
}

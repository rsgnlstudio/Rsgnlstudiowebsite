"use client";

import { DayNightSwitch } from "@/components/nav/DayNightSwitch";
import { NavItems } from "@/components/nav/NavItems";
import { DAY_NIGHT_DURATION, DAY_NIGHT_DURATION_REDUCED } from "@/config/scene";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useOverlayFade } from "@/hooks/useOverlayFade";
import { useReveal } from "@/hooks/useReveal";
import { useSceneStore } from "@/store/scene";

/**
 * The top navigation: one frosted pill at the top centre holding the
 * Day/Night switch ("Kunst" and "Consulting"), alone by day, followed by night
 * by the consulting site's items (services, process, about) and its glowing
 * call to action, "Erstgespräch vereinbaren"; the pill grows and shrinks
 * around them on a switch (`NavItems`). The wordmark (`SiteBrand`) and the
 * footer (`SiteFooter`, with imprint and contact) live in the root layout. The text color and the frosted
 * fill cross over with the scene. It appears after the intro, and fades out
 * while an overlay is open. Below `md` the burger menu (`MobileMenu`) takes
 * its place.
 */
export function TopNav() {
  const timeOfDay = useSceneStore((s) => s.timeOfDay);
  const reducedMotion = usePrefersReducedMotion();
  const duration = reducedMotion ? DAY_NIGHT_DURATION_REDUCED : DAY_NIGHT_DURATION;
  const reveal = useReveal<HTMLDivElement>(0, useOverlayFade().hidden);

  return (
    <nav aria-label="Hauptnavigation" className="fixed top-8 left-1/2 z-20 hidden -translate-x-1/2 md:block">
      <div
        ref={reveal}
        className={`invisible flex items-center rounded-full border border-current/10 p-1.5 whitespace-nowrap opacity-0 backdrop-blur-md transition-colors ease-smooth ${
          timeOfDay === "night" ? "bg-on-day/30 text-on-night" : "bg-on-night/30 text-on-day"
        }`}
        style={{ transitionDuration: `${duration}s` }}
      >
        <DayNightSwitch />
        <NavItems />
      </div>
    </nav>
  );
}

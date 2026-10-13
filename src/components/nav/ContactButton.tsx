"use client";

import { ArrowUpRight } from "lucide-react";
import { DAY_NIGHT_DURATION, DAY_NIGHT_DURATION_REDUCED } from "@/config/scene";
import { CONTACT_EMAIL } from "@/config/site";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useSceneStore } from "@/store/scene";

/**
 * The primary call to action at the end of the top navigation (`TopNav`): a
 * solid pill that opens a mail to the studio. Filled with the nav's text
 * color (dark by day, light by night), so it stands out from the frosted
 * glass around it and crosses over with the scene.
 */
export function ContactButton() {
  const timeOfDay = useSceneStore((s) => s.timeOfDay);
  const reducedMotion = usePrefersReducedMotion();
  const duration = reducedMotion ? DAY_NIGHT_DURATION_REDUCED : DAY_NIGHT_DURATION;

  return (
    <a
      href={`mailto:${CONTACT_EMAIL}`}
      className={`group flex items-center gap-1.5 rounded-full py-1.5 pr-2.5 pl-3 text-body transition-colors ease-smooth focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-current sm:pr-3 sm:pl-4 md:pr-4 md:pl-5 ${
        timeOfDay === "night" ? "bg-on-night text-on-day" : "bg-on-day text-on-night"
      }`}
      style={{ transitionDuration: `${duration}s` }}
    >
      Contact
      <ArrowUpRight
        aria-hidden
        className="size-[1.125rem] transition-transform duration-700 ease-smooth group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        strokeWidth={1.5}
      />
    </a>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DAY_NIGHT_DURATION, DAY_NIGHT_DURATION_REDUCED } from "@/config/scene";
import { PAGE_OUT, SITE_NAME } from "@/config/site";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useSceneStore } from "@/store/scene";

/**
 * The wordmark at the top left, level with the top navigation (below `md`
 * under it, across from the sound toggle, as the night's pill fills the
 * row): "rsgnl" on every page, by day and by night (a stand-in for the
 * logo). Mounted in the root layout, and it sits out the page slide
 * (`site-brand` in globals.css), so it never moves. Only its color crosses
 * over with the scene; on a page without the scene it is dark at once and
 * scrolls away with the page. On a sub-page it leads back home.
 */
export function SiteBrand() {
  const onMap = useSceneStore((s) => s.sceneMode !== "hidden");
  const onNight = useSceneStore((s) => s.timeOfDay === "night") && onMap;
  const reducedMotion = usePrefersReducedMotion();
  const duration = reducedMotion ? DAY_NIGHT_DURATION_REDUCED : DAY_NIGHT_DURATION;
  const home = usePathname() === "/";

  const className = `${onMap ? "fixed" : "absolute"} top-20 left-6 z-20 flex h-11.5 items-center font-display text-body italic [view-transition-name:site-brand] transition-colors ease-smooth md:top-6 ${
    onNight ? "text-on-night" : "text-on-day"
  }`;
  const style = { transitionDuration: onMap ? `${duration}s` : "0s" };

  if (home) {
    return (
      <p className={`pointer-events-none ${className}`} style={style}>
        {SITE_NAME}
      </p>
    );
  }
  return (
    <Link
      href="/"
      transitionTypes={[PAGE_OUT]}
      className={`${className} focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-current`}
      style={style}
    >
      {SITE_NAME}
    </Link>
  );
}

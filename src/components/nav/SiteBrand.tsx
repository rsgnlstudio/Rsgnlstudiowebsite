"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DAY_NIGHT_DURATION, DAY_NIGHT_DURATION_REDUCED } from "@/config/scene";
import { PAGE_OUT, SITE_NAME } from "@/config/site";
import { useOverlayFade } from "@/hooks/useOverlayFade";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useSceneStore } from "@/store/scene";

/**
 * The wordmark at the top left, level with the top navigation (below `md`
 * across from the burger menu): "rsgnl" on every page, by day and by night (a stand-in for the
 * logo). Mounted in the root layout, and it sits out the page slide
 * (`site-brand` in globals.css), so it never moves. Only its color crosses
 * over with the scene; on a page without the scene it is dark at once and
 * scrolls away with the page. On a sub-page it leads back home. It fades
 * out while an overlay is open.
 */
export function SiteBrand() {
  const onMap = useSceneStore((s) => s.sceneMode !== "hidden");
  const onNight = useSceneStore((s) => s.timeOfDay === "night") && onMap;
  const reducedMotion = usePrefersReducedMotion();
  const duration = reducedMotion ? DAY_NIGHT_DURATION_REDUCED : DAY_NIGHT_DURATION;
  const home = usePathname() === "/";
  const fade = useOverlayFade();
  // The fade on the text, as the element itself transitions its color.
  const name = <span className={fade.className}>{SITE_NAME}</span>;

  const className = `${onMap ? "fixed" : "absolute"} top-6 left-6 z-20 flex h-11.5 items-center md:top-8 md:left-8 md:h-14.5 font-display text-lead italic [view-transition-name:site-brand] transition-colors ease-smooth ${
    onNight ? "text-on-night" : "text-on-day"
  }`;
  const style = { transitionDuration: onMap ? `${duration}s` : "0s" };

  if (home) {
    return (
      <p className={`pointer-events-none ${className}`} style={style}>
        {name}
      </p>
    );
  }
  return (
    <Link
      href="/"
      transitionTypes={[PAGE_OUT]}
      className={`${className} focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-current`}
      style={style}
      inert={fade.hidden}
    >
      {name}
    </Link>
  );
}

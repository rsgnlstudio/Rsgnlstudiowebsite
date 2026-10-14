"use client";

import { useEffect, useState } from "react";
import { DAY_HINT } from "@/content/studio";
import { useIntroRevealed } from "@/hooks/useIntroRevealed";
import { useOverlayFade } from "@/hooks/useOverlayFade";
import { useSceneStore } from "@/store/scene";

/** Seconds after the UI appears before the hint does. */
const DELAY_SECONDS = 1.2;

/**
 * The day's counterpart to the night's hint (`NightIntro`): a line at the
 * bottom centre saying the flower beds are the menu (hover, click; on touch
 * screens tap). It appears a little after the UI and stays, stepping aside
 * only by night and while an overlay is open.
 */
export function DayHint() {
  const revealed = useIntroRevealed();
  const isDay = useSceneStore((s) => s.timeOfDay === "day");
  const overlay = useOverlayFade().hidden;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!revealed) return;
    const timer = window.setTimeout(() => setReady(true), DELAY_SECONDS * 1000);
    return () => window.clearTimeout(timer);
  }, [revealed]);

  const shown = ready && isDay && !overlay;

  return (
    <p
      aria-hidden={!shown}
      className={`pointer-events-none fixed bottom-24 left-1/2 z-20 w-max max-w-[calc(100vw-2*var(--spacing-gutter))] -translate-x-1/2 text-center font-display text-body text-foreground italic transition-[opacity,translate] duration-1500 ease-reveal md:bottom-edge ${
        shown ? "translate-y-0 opacity-80" : "translate-y-2 opacity-0"
      }`}
    >
      <span className="pointer-coarse:hidden">{DAY_HINT.mouse}</span>
      <span className="hidden pointer-coarse:inline">{DAY_HINT.touch}</span>
    </p>
  );
}

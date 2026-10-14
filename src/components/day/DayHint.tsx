"use client";

import { useEffect, useState } from "react";
import { BottomHint } from "@/components/ui/BottomHint";
import { useContent } from "@/content/ContentProvider";
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
  const { studio } = useContent();
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
    <BottomHint shown={shown} className="text-foreground">
      <span className="pointer-coarse:hidden">{studio.dayHint.mouse}</span>
      <span className="hidden pointer-coarse:inline">{studio.dayHint.touch}</span>
    </BottomHint>
  );
}

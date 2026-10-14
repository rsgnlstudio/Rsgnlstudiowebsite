"use client";

import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { BottomHint } from "@/components/ui/BottomHint";
import { useContent } from "@/content/ContentProvider";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { gsap } from "@/lib/gsap";
import { overlayOpen, useSceneStore } from "@/store/scene";

/** `night` at which the intro lines start, as the flight comes in to land. */
const START_AT = 0.85;
/** Seconds between two lines, and how long all of them stay before they go. */
const STAGGER = 0.95;
const HOLD = 2.4;

/**
 * The night's intro, the first time the night is chosen: as the camera
 * flies up into the top view, the visitor's situation appears line by line
 * ("Aus deiner Idee wurde ein Unternehmen. ..."), then the turn to the bird
 * with the view from above. It can be skipped; with reduced motion all lines
 * show at once. When it is done (`nightIntro`), the map takes clicks and a
 * hint at the bottom asks the visitor to pick a clearing; it stays.
 */
export function NightIntro() {
  const { intro } = useContent().consulting;
  const timeOfDay = useSceneStore((s) => s.timeOfDay);
  const nightIntro = useSceneStore((s) => s.nightIntro);
  const reducedMotion = usePrefersReducedMotion();
  const linesRef = useRef<HTMLDivElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  // The hint stays while the map is open, stepping aside for a place's
  // preview (on touch screens its card stands where the hint is) and a panel.
  const hint = useSceneStore(
    (s) => s.nightIntro === "done" && s.timeOfDay === "night" && s.night > 0.98 && s.hoveredPlace === null && !overlayOpen(s),
  );

  const finish = useCallback(() => {
    timeline.current?.kill();
    timeline.current = null;
    if (linesRef.current) gsap.to(linesRef.current, { autoAlpha: 0, duration: 0.6, ease: "sine.inOut" });
    useSceneStore.getState().setNightIntro("done");
  }, []);

  // Start once the night has been chosen and the flight is coming in.
  useEffect(() => {
    if (timeOfDay !== "night" || nightIntro !== "pending") return;
    const check = (night: number) => night >= START_AT && useSceneStore.getState().setNightIntro("playing");
    if (check(useSceneStore.getState().night)) return;
    return useSceneStore.subscribe((s) => {
      if (s.nightIntro === "pending") check(s.night);
    });
  }, [timeOfDay, nightIntro]);

  // Play the lines.
  useEffect(() => {
    const el = linesRef.current;
    if (!el || nightIntro !== "playing") return;
    const lines = el.querySelectorAll("[data-line]");
    const tl = gsap.timeline({ onComplete: finish });
    tl.set(el, { autoAlpha: 1 });
    if (reducedMotion) {
      tl.fromTo(lines, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 });
      tl.to(el, { autoAlpha: 0, duration: 0.6 }, "+=5");
    } else {
      tl.fromTo(
        lines,
        { autoAlpha: 0, y: 12 },
        { autoAlpha: 1, y: 0, duration: 1.4, ease: "expo.out", stagger: STAGGER },
      );
      tl.to(el, { autoAlpha: 0, y: -10, duration: 1, ease: "sine.inOut" }, `+=${HOLD}`);
    }
    timeline.current = tl;
    return () => {
      tl.kill();
    };
  }, [nightIntro, reducedMotion, finish]);

  // Back to the day mid-way: the intro has been seen.
  useEffect(() => {
    if (timeOfDay === "day" && nightIntro === "playing") finish();
  }, [timeOfDay, nightIntro, finish]);

  const playing = nightIntro === "playing";

  return (
    <div>
      <div
        ref={linesRef}
        className="pointer-events-none invisible fixed top-1/2 left-edge z-20 max-w-[min(40rem,calc(100vw-2*var(--spacing-edge)))] -translate-y-1/2 text-on-night opacity-0"
      >
        {intro.lines.map((line) => (
          <p key={line} data-line className="text-body opacity-0 md:text-lead">
            {line}
          </p>
        ))}
        <p data-line className="mt-6 font-display text-lead italic opacity-0 md:text-heading">
          {intro.transition}
        </p>
      </div>
      {playing && (
        <Button variant="outline" onClick={finish} className="fixed bottom-edge left-1/2 z-20 -translate-x-1/2 text-on-night">
          {intro.skip}
        </Button>
      )}
      <BottomHint shown={hint} className="text-on-night">
        {intro.hint}
      </BottomHint>
    </div>
  );
}

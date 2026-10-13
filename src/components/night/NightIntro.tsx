"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { INTRO } from "@/content/consulting";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { gsap } from "@/lib/gsap";
import { useSceneStore } from "@/store/scene";

/** `night` at which the intro lines start, as the flight comes in to land. */
const START_AT = 0.85;
/** Seconds between two lines, and how long all of them stay before they go. */
const STAGGER = 0.95;
const HOLD = 2.4;
/** Seconds the hint stays at most once the map is open (it also goes on the first hover). */
const HINT_SECONDS = 14;

/**
 * The night's intro, the first time the night is chosen: as the camera
 * flies up into the top view, the visitor's situation appears line by line
 * ("Aus deiner Idee wurde ein Unternehmen. ..."), then the turn to the bird
 * with the view from above. It can be skipped; with reduced motion all lines
 * show at once. When it is done (`nightIntro`), the map takes clicks and a
 * hint asks the visitor to pick a clearing.
 */
export function NightIntro() {
  const timeOfDay = useSceneStore((s) => s.timeOfDay);
  const nightIntro = useSceneStore((s) => s.nightIntro);
  const reducedMotion = usePrefersReducedMotion();
  const linesRef = useRef<HTMLDivElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const [hint, setHint] = useState(false);

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

  // The hint, once the map is open: until a place is hovered or opened, or a while has passed.
  useEffect(() => {
    if (nightIntro !== "done" || timeOfDay !== "night") return;
    const show = window.setTimeout(() => {
      const { hoveredPlace, panel } = useSceneStore.getState();
      if (hoveredPlace === null && panel === null) setHint(true);
    }, 600);
    const hide = window.setTimeout(() => setHint(false), (HINT_SECONDS + 0.6) * 1000);
    const unsubscribe = useSceneStore.subscribe((s) => {
      if (s.hoveredPlace !== null || s.panel !== null) setHint(false);
    });
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
      unsubscribe();
      setHint(false);
    };
  }, [nightIntro, timeOfDay]);

  const playing = nightIntro === "playing";

  return (
    <div>
      <div
        ref={linesRef}
        className="pointer-events-none invisible fixed top-1/2 left-edge z-20 max-w-[min(40rem,calc(100vw-2*var(--spacing-edge)))] -translate-y-1/2 text-on-night opacity-0"
      >
        {INTRO.lines.map((line) => (
          <p key={line} data-line className="text-body opacity-0 md:text-heading md:leading-snug">
            {line}
          </p>
        ))}
        <p data-line className="mt-6 font-display text-heading italic opacity-0 md:text-display">
          {INTRO.transition}
        </p>
      </div>
      {playing && (
        <button
          type="button"
          onClick={finish}
          className="fixed bottom-edge left-1/2 z-20 -translate-x-1/2 cursor-pointer rounded-full border border-current/25 px-5 py-2 text-caption tracking-widest text-on-night uppercase opacity-70 backdrop-blur-md transition-opacity duration-700 ease-smooth hover:opacity-100 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          {INTRO.skip}
        </button>
      )}
      <p
        aria-hidden={!hint}
        className={`pointer-events-none fixed bottom-24 left-1/2 z-20 w-max md:bottom-edge max-w-[calc(100vw-2*var(--spacing-gutter))] -translate-x-1/2 text-center text-body text-on-night italic transition-[opacity,translate] duration-1500 ease-reveal ${
          hint ? "translate-y-0 opacity-80" : "translate-y-2 opacity-0"
        }`}
      >
        {INTRO.hint}
      </p>
    </div>
  );
}

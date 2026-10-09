"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useIntroRevealed } from "@/hooks/useIntroRevealed";
import { gsap } from "@/lib/gsap";

/**
 * Lets a UI element appear once the intro build-up is far enough along: it
 * fades in, rising a little, with a long soft landing. Render the element
 * hidden (`invisible opacity-0`) and attach the returned ref. `delay`
 * (seconds) staggers elements. It plays once; when Next shows the page again
 * the element is simply there.
 */
export function useReveal<T extends HTMLElement>(delay = 0) {
  const ref = useRef<T>(null);
  const played = useRef(false);
  const revealed = useIntroRevealed();
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || !revealed) return;
    if (played.current) {
      gsap.set(el, { autoAlpha: 1, y: 0 });
      return;
    }
    const tween = gsap.fromTo(
      el,
      { autoAlpha: 0, y: reducedMotion ? 0 : 14 },
      {
        autoAlpha: 1,
        y: 0,
        delay,
        duration: reducedMotion ? 0.6 : 1.8,
        ease: "expo.out",
        onComplete: () => {
          played.current = true;
        },
      },
    );
    return () => {
      // Hidden mid-way (Next's <Activity>): finish, so showing it again doesn't replay.
      tween.progress(1).kill();
      played.current = true;
    };
  }, [revealed, reducedMotion, delay]);

  return ref;
}

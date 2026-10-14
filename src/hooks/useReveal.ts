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
 * the element is simply there. While `hidden` (e.g. an overlay is open, see
 * `useOverlayFade`) a revealed element fades out, and back in after. The fade
 * runs on the element itself, so a backdrop blur on it keeps working.
 */
export function useReveal<T extends HTMLElement>(delay = 0, hidden = false) {
  const ref = useRef<T>(null);
  const played = useRef(false);
  const hiddenRef = useRef(hidden);
  // The reveal while it plays, so an overlay opening mid-way can take over.
  const intro = useRef<gsap.core.Tween | null>(null);
  const revealed = useIntroRevealed();
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || !revealed) return;
    if (played.current) {
      gsap.set(el, { autoAlpha: hiddenRef.current ? 0 : 1, y: 0 });
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
          intro.current = null;
        },
      },
    );
    intro.current = tween;
    return () => {
      // Hidden mid-way (Next's <Activity>): finish, so showing it again doesn't replay.
      if (intro.current === tween) tween.progress(1).kill();
      intro.current = null;
      played.current = true;
    };
  }, [revealed, reducedMotion, delay]);

  useEffect(() => {
    hiddenRef.current = hidden;
    const el = ref.current;
    // Before the reveal there is nothing to hide; an overlay opening while it
    // plays takes over from it (`overwrite` stops it where it is).
    if (!el || (!played.current && !(hidden && intro.current))) return;
    intro.current = null;
    played.current = true;
    const tween = gsap.to(el, {
      autoAlpha: hidden ? 0 : 1,
      y: 0,
      duration: hidden ? 0.7 : 1,
      delay: hidden ? 0 : 0.3,
      ease: "power2.inOut",
      overwrite: true,
    });
    return () => {
      tween.kill();
    };
  }, [hidden]);

  return ref;
}

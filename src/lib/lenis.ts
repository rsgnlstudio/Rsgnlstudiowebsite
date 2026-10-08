import Lenis from "lenis";
import { gsap, ScrollTrigger } from "./gsap";

/**
 * Creates a Lenis instance driven by GSAP's ticker and synced with
 * ScrollTrigger. Returns a destroy function that undoes everything.
 */
export function createSmoothScroll(): { lenis: Lenis; destroy: () => void } {
  const lenis = new Lenis({ autoRaf: false });

  lenis.on("scroll", ScrollTrigger.update);

  const tick = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  return {
    lenis,
    destroy: () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33); // GSAP default
      lenis.destroy();
    },
  };
}

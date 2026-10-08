"use client";

import { useEffect } from "react";
import type { SectionConfig } from "@/config/sections";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { createSmoothScroll } from "@/lib/lenis";
import { useSceneStore } from "@/store/scene";

/**
 * Sets up Lenis smooth scrolling and one ScrollTrigger per section, writing
 * activeSection / sectionProgress / scrollProgress to the store.
 *
 * Call it from a page (not the layout). Everything is torn down on unmount,
 * and also when Next hides the page via <Activity> during navigation.
 */
export function useSectionScroll(sections: readonly SectionConfig[]) {
  useEffect(() => {
    const { setActiveSection, setSectionProgress, setScrollProgress } =
      useSceneStore.getState();
    const smoothScroll = createSmoothScroll();
    const sectionTriggers: { id: string; trigger: ScrollTrigger }[] = [];

    // Resolves the active section from the trigger ranges with inclusive
    // bounds. ScrollTrigger's own isActive is false exactly at start/end,
    // which would leave no active section at the very top or bottom.
    const sync = () => {
      if (sectionTriggers.length === 0) return;
      const scroll = window.scrollY;
      const current =
        sectionTriggers.find(
          ({ trigger }) => scroll >= trigger.start && scroll <= trigger.end,
        ) ??
        (scroll < sectionTriggers[0].trigger.start
          ? sectionTriggers[0]
          : sectionTriggers[sectionTriggers.length - 1]);
      const { start, end } = current.trigger;
      setActiveSection(current.id);
      setSectionProgress(
        end > start ? gsap.utils.clamp(0, 1, (scroll - start) / (end - start)) : 0,
      );
    };

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => {
          setScrollProgress(self.progress);
          sync();
        },
      });

      sections.forEach((section, index) => {
        const element = document.getElementById(section.id);
        if (!element) {
          console.warn(`useSectionScroll: no element with id "${section.id}"`);
          return;
        }

        sectionTriggers.push({
          id: section.id,
          trigger: ScrollTrigger.create({
            trigger: element,
            // Sections hand over at viewport center; the first and last are
            // pinned to the page edges so their progress spans the full 0..1.
            start: index === 0 ? "top top" : "top center",
            end:
              index === sections.length - 1 ? "bottom bottom" : "bottom center",
          }),
        });
      });
    });

    ScrollTrigger.addEventListener("refresh", sync);
    ScrollTrigger.refresh();
    sync();

    return () => {
      ScrollTrigger.removeEventListener("refresh", sync);
      ctx.revert(); // kills every ScrollTrigger created above
      smoothScroll.destroy();
      useSceneStore.getState().resetScroll();
    };
  }, [sections]);
}

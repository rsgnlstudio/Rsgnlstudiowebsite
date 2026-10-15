"use client";

import { useEffect, useRef } from "react";
import { PROJECT_BEDS } from "@/config/flowers";
import { useContent } from "@/content/ContentProvider";
import { byId } from "@/content/selectors";
import { useSceneStore } from "@/store/scene";

/** Gap between the cursor and the label, in pixels. */
const OFFSET = 20;

/**
 * The title of the flower bed under the cursor (`hoveredBed`, set by the
 * canvas), set as bare text next to it, no card. Every bed's title is rendered and
 * the hovered one fades in, so the text stays put while it fades out. The
 * label follows the pointer without re-renders and flips to the cursor's
 * left near the right edge. Mouse only, like the hover itself.
 */
export function FlowerHoverLabel() {
  const { projects } = useContent();
  const hovered = useSceneStore((s) => s.hoveredBed);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const flip = event.clientX + OFFSET + el.offsetWidth > window.innerWidth - OFFSET;
      const x = flip ? event.clientX - OFFSET - el.offsetWidth : event.clientX + OFFSET;
      el.style.transform = `translate3d(${x}px, ${event.clientY + OFFSET}px, 0)`;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div ref={ref} aria-hidden className="pointer-events-none fixed top-0 left-0 z-30 grid">
      {PROJECT_BEDS.map((bed) => {
        const project = byId(projects, bed.id);
        return (
          <p
            key={bed.id}
            className={`col-start-1 row-start-1 w-max max-w-96 self-start font-display text-2xl text-foreground italic text-shadow-md text-shadow-on-day/40 transition-[opacity,translate] duration-700 ease-reveal ${
              bed.id === hovered ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
            }`}
          >
            {project.title}
          </p>
        );
      })}
    </div>
  );
}

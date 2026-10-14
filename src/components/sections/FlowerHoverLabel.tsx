"use client";

import { useEffect, useRef } from "react";
import { PROJECT_BEDS } from "@/config/flowers";
import { useSceneStore } from "@/store/scene";

/** Gap between the cursor and the label, in pixels. */
const OFFSET = 20;

/**
 * A small label next to the cursor naming the flower bed under it
 * (`hoveredBed`, set by the canvas). Every bed's label is rendered and
 * the hovered one fades in, so the text stays put while it fades out. The
 * label follows the pointer without re-renders and flips to the cursor's
 * left near the right edge. Mouse only, like the hover itself.
 */
export function FlowerHoverLabel() {
  const hovered = useSceneStore((s) => s.hoveredBed);
  const timeOfDay = useSceneStore((s) => s.timeOfDay);
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
      {PROJECT_BEDS.map((bed) => (
        <div
          key={bed.id}
          className={`col-start-1 row-start-1 w-max max-w-72 self-start rounded-2xl border border-current/10 px-5 py-4 backdrop-blur-md transition-[opacity,translate] duration-700 ease-reveal ${
            timeOfDay === "night" ? "bg-on-day/75 text-on-night" : "bg-on-night/75 text-on-day"
          } ${bed.id === hovered ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}
        >
          <p className="text-body italic">{bed.title}</p>
          <p className="mt-1 text-caption opacity-70">{bed.teaser}</p>
        </div>
      ))}
    </div>
  );
}

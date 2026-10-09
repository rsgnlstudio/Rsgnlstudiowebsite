"use client";

import { useEffect, useRef } from "react";
import { FEATURED_FLOWERS } from "@/config/flowers";
import { useSceneStore } from "@/store/scene";

/** Gap between the cursor and the label, in pixels. */
const OFFSET = 20;

/**
 * A small label next to the cursor naming the featured flower under it
 * (`hoveredFlower`, set by the canvas). Every flower's label is rendered and
 * the hovered one fades in, so the text stays put while it fades out. The
 * label follows the pointer without re-renders and flips to the cursor's
 * left near the right edge. Mouse only, like the hover itself.
 */
export function FlowerHoverLabel() {
  const hovered = useSceneStore((s) => s.hoveredFlower);
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
      {FEATURED_FLOWERS.map((flower) => (
        <div
          key={flower.id}
          className={`col-start-1 row-start-1 w-max max-w-64 rounded-2xl border border-current/10 px-4 py-3 backdrop-blur-md transition-[opacity,translate] duration-300 ease-out ${
            timeOfDay === "night" ? "bg-on-day/75 text-on-night" : "bg-on-night/75 text-on-day"
          } ${flower.id === hovered ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}
        >
          <p className="text-body italic">{flower.title}</p>
          <p className="text-caption opacity-70">{flower.teaser}</p>
        </div>
      ))}
    </div>
  );
}

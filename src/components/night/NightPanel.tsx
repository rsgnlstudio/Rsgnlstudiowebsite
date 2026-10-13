"use client";

import { useEffect, useRef, useState } from "react";
import { UI } from "@/content/consulting";
import { useSceneStore } from "@/store/scene";
import { SlidePanel } from "@/components/sections/SlidePanel";
import { PanelContent } from "./PanelContent";

/** Where the panel reads, as a share of its height from the top: the step crossing it is the current one. */
const READING_LINE = 0.4;

/**
 * The night's side panel (`panel` in the store): half the screen on the
 * right, dark like the world, the map staying visible on the left. Every
 * place on the map, the navigation and the related links open it; the map
 * follows what it shows (CameraRig, Nightingale). For a path it tells the
 * path as one story and writes how far it has been scrolled through its
 * steps (`pathStation`), so the light and the camera move along the path.
 */
export function NightPanel() {
  const panel = useSceneStore((s) => s.panel);
  const panelRef = useRef<HTMLDivElement>(null);

  // Keep the last content while the panel slides out.
  const [shown, setShown] = useState(panel);
  if (panel && panel !== shown) setShown(panel);

  // A new panel starts at its top.
  useEffect(() => {
    if (panel) panelRef.current?.scrollTo({ top: 0 });
  }, [panel]);

  // Follow the scroll through a path's steps.
  useEffect(() => {
    const el = panelRef.current;
    if (!el || panel?.kind !== "path") return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const steps = Array.from(el.querySelectorAll<HTMLElement>("[data-step]"));
      if (steps.length === 0) return;
      const line = el.scrollTop + el.clientHeight * READING_LINE;
      const tops = steps.map((s) => s.offsetTop);
      // Past the last step's top, or scrolled to the very end: the goal.
      const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
      let station = steps.length - 1;
      if (!atEnd) {
        for (let i = 0; i < tops.length - 1; i++) {
          if (line < tops[i + 1]) {
            station = i + Math.max(0, Math.min(1, (line - tops[i]) / (tops[i + 1] - tops[i])));
            break;
          }
        }
      }
      useSceneStore.getState().setPathStation(station);
    };
    const onScroll = () => {
      frame ||= requestAnimationFrame(measure);
    };
    measure();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [panel]);

  return (
    <SlidePanel
      open={panel !== null}
      onClose={() => useSceneStore.getState().setPanel(null)}
      labelledBy="night-panel-title"
      tone="night"
      panelRef={panelRef}
      closeLabel={UI.close}
    >
      {shown && (
        <article className="px-gutter pt-24 pb-section md:px-edge">
          <PanelContent panel={shown} />
          {shown.kind === "path" && <div aria-hidden className="h-[40vh]" />}
        </article>
      )}
    </SlidePanel>
  );
}

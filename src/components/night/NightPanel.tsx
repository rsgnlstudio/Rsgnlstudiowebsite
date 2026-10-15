"use client";

import { useEffect, useRef, useState } from "react";
import { SlidePanel } from "@/components/overlay/SlidePanel";
import { useContent } from "@/content/ContentProvider";
import { useSceneStore } from "@/store/scene";
import { PANEL_TITLE_ID } from "./panels/PanelEnd";
import { PanelContent } from "./panels/PanelContent";

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
  const { ui } = useContent();
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
      const tops = steps.map((s) => s.offsetTop);
      // The last steps may never reach the reading line, even scrolled to
      // the end: the line moves down the panel as it scrolls, so it reaches
      // the last step's top just at the end.
      const maxScroll = Math.max(el.scrollHeight - el.clientHeight, 1);
      const short = Math.max(0, tops[tops.length - 1] - (maxScroll + el.clientHeight * READING_LINE));
      const line = el.scrollTop + el.clientHeight * READING_LINE + short * Math.min(el.scrollTop / maxScroll, 1);
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
      labelledBy={PANEL_TITLE_ID}
      tone="night"
      panelRef={panelRef}
      closeLabel={ui.close}
    >
      {shown && (
        <article className="px-gutter pt-24 pb-section md:px-edge">
          {/* Lines of about 60 characters, like a printed page (60ch runs longer in DM Sans). */}
          <div className="max-w-120">
            <PanelContent panel={shown} />
          </div>
        </article>
      )}
    </SlidePanel>
  );
}

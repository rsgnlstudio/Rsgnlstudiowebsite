"use client";

import { useState } from "react";
import { PROJECT_BEDS } from "@/config/flowers";
import { useSceneStore } from "@/store/scene";
import { SlidePanel } from "./SlidePanel";

/**
 * The section a flower bed opens (`openBed`, set by the canvas on a click or
 * tap), in the day's slide panel (`SlidePanel`): over two thirds of the
 * screen on desktop, a sheet on mobile. Keeps the last project rendered
 * while the panel slides out.
 */
export function ProjectOverlay() {
  const openBed = useSceneStore((s) => s.openBed);

  // Keep the last project while the panel slides out.
  const [shown, setShown] = useState(openBed);
  if (openBed && openBed !== shown) setShown(openBed);
  const project = PROJECT_BEDS.find((bed) => bed.id === shown);

  return (
    <SlidePanel
      open={openBed !== null}
      onClose={() => useSceneStore.getState().setOpenBed(null)}
      labelledBy="project-title"
      tone="day"
    >
      {project && (
        <article className="px-gutter pt-24 pb-section md:px-edge">
          <h2 id="project-title" className="font-display text-heading italic md:text-display">
            {project.title}
          </h2>
          <p className="mt-4 max-w-prose text-body opacity-70">{project.teaser}</p>
          {/* Placeholder until the real project content exists. */}
          <div className="mt-12 grid gap-gutter">
            <div className="aspect-video bg-current/5" />
            <div className="grid gap-gutter md:grid-cols-2">
              <div className="aspect-4/5 bg-current/5" />
              <div className="aspect-4/5 bg-current/5" />
            </div>
          </div>
        </article>
      )}
    </SlidePanel>
  );
}

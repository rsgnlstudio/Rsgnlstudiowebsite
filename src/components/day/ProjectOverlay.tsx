"use client";

import { useState } from "react";
import { SlidePanel } from "@/components/overlay/SlidePanel";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { Heading } from "@/components/ui/Typography";
import { useContent } from "@/content/ContentProvider";
import type { ProjectMedia } from "@/content/schema";
import { useSceneStore } from "@/store/scene";

const ASPECT: Record<ProjectMedia["aspect"], string> = {
  landscape: "aspect-video md:col-span-2",
  portrait: "aspect-4/5",
};

/** Image widths for the slots: the panel is two thirds of the screen on desktop, full width on mobile. */
const SIZES: Record<ProjectMedia["aspect"], string> = {
  landscape: "(min-width: 768px) 67vw, 100vw",
  portrait: "(min-width: 768px) 33vw, 100vw",
};

/**
 * The project a flower bed opens (`openBed`, set by the canvas on a click or
 * tap), in the day's slide panel (`SlidePanel`): over two thirds of the
 * screen on desktop, a sheet on mobile. Its copy is the `project` document
 * with the bed's id. Keeps the last project rendered while the panel slides out.
 */
export function ProjectOverlay() {
  const { projects, ui } = useContent();
  const openBed = useSceneStore((s) => s.openBed);

  const [shown, setShown] = useState(openBed);
  if (openBed && openBed !== shown) setShown(openBed);
  const project = projects.find((p) => p.id === shown);

  return (
    <SlidePanel
      open={openBed !== null}
      onClose={() => useSceneStore.getState().setOpenBed(null)}
      labelledBy="project-title"
      tone="day"
      closeLabel={ui.close}
    >
      {project && (
        <article className="px-gutter pt-24 pb-section md:px-edge">
          <Heading id="project-title" size="title" italic>
            {project.title}
          </Heading>
          <p className="mt-4 max-w-prose text-lg opacity-70">{project.teaser}</p>
          <div className="mt-12 grid gap-gutter md:grid-cols-2">
            {project.media.map((m, i) => (
              <ImageSlot key={i} image={m.image} sizes={SIZES[m.aspect]} className={ASPECT[m.aspect]} />
            ))}
          </div>
        </article>
      )}
    </SlidePanel>
  );
}

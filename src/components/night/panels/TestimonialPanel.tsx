"use client";

import { Eyebrow } from "@/components/ui/Typography";
import { useContent } from "@/content/ContentProvider";
import { PANEL_TITLE_ID, PanelEnd } from "./PanelEnd";

export function TestimonialPanel({ index }: { index: number }) {
  const c = useContent();
  const t = c.consulting.testimonials[index];
  if (!t) return null;
  return (
    <>
      <Eyebrow>{c.ui.categories.testimonial}</Eyebrow>
      <figure className="mt-3">
        <blockquote id={PANEL_TITLE_ID} className="max-w-prose font-display text-heading">
          „{t.quote}“
        </blockquote>
        <figcaption className="mt-6 text-body">
          {t.name}
          <span className="block italic opacity-60">
            {t.role}, {t.company}
          </span>
        </figcaption>
      </figure>
      <PanelEnd related={[{ to: { kind: "about" }, label: c.consulting.about.name }]} />
    </>
  );
}

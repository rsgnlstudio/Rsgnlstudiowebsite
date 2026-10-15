"use client";

import { Block, Intro } from "@/components/ui/Typography";
import { useContent } from "@/content/ContentProvider";
import { PanelEnd, PanelTitle } from "./PanelEnd";

export function AboutPanel() {
  const c = useContent();
  const { ui } = c;
  const { about, testimonials } = c.consulting;
  return (
    <>
      <PanelTitle label={ui.categories.about}>{about.name}</PanelTitle>
      <Intro detail={about.role} />
      {/* Placeholder until the photo exists (the face should be easy to see). */}
      <div aria-hidden className="mt-10 aspect-4/5 w-full max-w-xs rounded-2xl bg-current/5" />
      <p className="mt-10 max-w-prose text-base">{about.intro}</p>
      <Block title={ui.blocks.approach}>
        {about.approach} <span className="opacity-70">{about.approachTags}</span>
      </Block>
      <Block title={ui.blocks.stations}>
        <ol className="grid gap-4 border-l border-current/15 pl-5">
          {about.stations.map((s) => (
            <li key={s.years}>
              <span className="text-sm tabular-nums opacity-60">{s.years}</span>
              <span className="block">{s.text}</span>
            </li>
          ))}
        </ol>
      </Block>
      <Block title={ui.blocks.education} text={about.education} />
      <Block title={ui.blocks.more} text={about.more} />
      <PanelEnd
        related={[
          { to: { kind: "process" }, label: c.consulting.process.title },
          ...(testimonials.length ? [{ to: { kind: "testimonial" as const, index: 0 }, label: ui.categories.testimonial }] : []),
        ]}
      />
    </>
  );
}

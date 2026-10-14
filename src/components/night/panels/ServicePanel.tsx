"use client";

import { Disclosure } from "@/components/ui/Disclosure";
import { Block, Eyebrow, Heading, Highlight, Intro } from "@/components/ui/Typography";
import { PATHS, ROADS, type ServiceId } from "@/config/nightMap";
import { useContent } from "@/content/ContentProvider";
import { byId } from "@/content/selectors";
import { PANEL_TITLE_ID, PanelEnd } from "./PanelEnd";

/** The paths that run through a service. */
const pathsThrough = (id: ServiceId) =>
  PATHS.filter((p) => (p.services as readonly ServiceId[] | null)?.includes(id));

export function ServicePanel({ id }: { id: ServiceId }) {
  const c = useContent();
  const { ui } = c;
  const s = byId(c.consulting.services, id);
  const roads = ROADS.filter((r) => (r.services as readonly string[]).includes(id));
  return (
    <>
      <Eyebrow>{ui.categories.service}</Eyebrow>
      <Heading id={PANEL_TITLE_ID} size="title" className="mt-3 max-w-[22ch]">
        {s.title}
      </Heading>
      <Intro text={s.preview.line} detail={s.preview.detail} />
      <Block title={ui.blocks.about} text={s.about} />
      {s.extra?.map((block) =>
        block.kind === "research" ? (
          <Disclosure key={block.title} variant="more" className="mt-10 max-w-prose" summary={block.title}>
            <ul className="mt-3 grid gap-3 text-body">
              {block.points.map((p) => (
                <li key={p.title}>
                  <strong className="font-normal italic">{p.title}</strong> <span className="opacity-85">{p.text}</span>
                </li>
              ))}
            </ul>
            {block.source && (
              <p className="mt-3 text-caption opacity-55">
                {ui.path.sources}: {block.source}
              </p>
            )}
          </Disclosure>
        ) : (
          <Block key={block.title} title={block.title} text={block.text} />
        ),
      )}
      {s.forWhom && <Block title={ui.blocks.forWhom} text={s.forWhom} />}
      {s.benefit && <Block title={ui.blocks.benefit} text={s.benefit} />}
      {s.highlight && <Highlight title={s.highlight.title}>{s.highlight.text}</Highlight>}
      <Block title={s.bookTitle ?? ui.blocks.book} text={s.book} />
      {s.methods && <Block title={ui.blocks.methods} text={s.methods} />}
      <Block title={ui.path.roads}>
        <ul className="grid gap-3">
          {roads.map((r) => {
            const road = byId(c.consulting.roads, r.id);
            return (
              <li key={r.id}>
                <strong className="font-normal">{road.link}</strong> <span className="opacity-70">{road.why}</span>
              </li>
            );
          })}
        </ul>
      </Block>
      <PanelEnd
        related={pathsThrough(id)
          .slice(0, 2)
          .map((p) => ({ to: { kind: "path" as const, id: p.id }, label: byId(c.consulting.challenges, p.id).line }))}
      />
    </>
  );
}

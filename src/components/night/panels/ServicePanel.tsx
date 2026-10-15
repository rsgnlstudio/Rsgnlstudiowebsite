"use client";

import { Disclosure } from "@/components/ui/Disclosure";
import { Block, Highlight, Intro } from "@/components/ui/Typography";
import { PATHS, ROADS, type ServiceId } from "@/config/nightMap";
import { useContent } from "@/content/ContentProvider";
import { byId } from "@/content/selectors";
import { PanelEnd, PanelTitle } from "./PanelEnd";

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
      <PanelTitle label={ui.categories.service}>{s.title}</PanelTitle>
      <Intro text={s.preview.line} detail={s.preview.detail} />
      <Block title={ui.blocks.about} text={s.about} />
      {s.extra?.map((block) =>
        block.kind === "research" ? (
          <Disclosure key={block.title} variant="more" className="mt-10 max-w-prose" summary={block.title}>
            <ul className="mt-3 grid gap-3 text-base">
              {block.points.map((p) => (
                <li key={p.title}>
                  <strong className="font-medium">{p.title}</strong> <span className="opacity-70">{p.text}</span>
                </li>
              ))}
            </ul>
            {block.source && (
              <p className="mt-3 text-sm opacity-55">
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

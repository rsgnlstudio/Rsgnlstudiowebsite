"use client";

import { Eyebrow, Heading, Highlight, Intro } from "@/components/ui/Typography";
import { useContent } from "@/content/ContentProvider";
import { byId } from "@/content/selectors";
import { useSceneStore } from "@/store/scene";
import { PANEL_TITLE_ID, PanelEnd } from "./PanelEnd";

export function ResultsPanel() {
  const c = useContent();
  const { ui } = c;
  const { results } = c.consulting;
  const activePath = useSceneStore((s) => s.activePath);
  const result = activePath ? byId(c.consulting.challenges, activePath).result : null;
  return (
    <>
      <Eyebrow>{ui.categories.results}</Eyebrow>
      <Heading id={PANEL_TITLE_ID} size="title" className="mt-3 max-w-[22ch]">
        {results.title}
      </Heading>
      <Intro text={results.intro} detail={results.emphasis} />
      {result && (
        <Highlight title={result.line}>
          <span className="italic opacity-80">{result.detail}</span>
        </Highlight>
      )}
      <ul className="mt-10 grid max-w-prose gap-3 text-body">
        {results.points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <PanelEnd related={[{ to: { kind: "process" }, label: c.consulting.process.title }]} />
    </>
  );
}

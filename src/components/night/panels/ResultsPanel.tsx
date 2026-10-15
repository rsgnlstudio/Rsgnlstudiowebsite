"use client";

import { Highlight, Intro } from "@/components/ui/Typography";
import { useContent } from "@/content/ContentProvider";
import { byId } from "@/content/selectors";
import { useSceneStore } from "@/store/scene";
import { PanelEnd, PanelTitle } from "./PanelEnd";

export function ResultsPanel() {
  const c = useContent();
  const { ui } = c;
  const { results } = c.consulting;
  const activePath = useSceneStore((s) => s.activePath);
  const result = activePath ? byId(c.consulting.challenges, activePath).result : null;
  return (
    <>
      <PanelTitle label={ui.categories.results}>{results.title}</PanelTitle>
      <Intro text={results.intro} detail={results.emphasis} />
      {result && (
        <Highlight title={result.line}>
          <span className="opacity-70">{result.detail}</span>
        </Highlight>
      )}
      <ul className="mt-10 grid max-w-prose gap-3 text-base">
        {results.points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <PanelEnd related={[{ to: { kind: "process" }, label: c.consulting.process.title }]} />
    </>
  );
}

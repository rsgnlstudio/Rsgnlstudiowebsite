"use client";

import { Block, Highlight, Intro } from "@/components/ui/Typography";
import { useBafaActive, useContent } from "@/content/ContentProvider";
import { PanelEnd, PanelLink, PanelTitle } from "./PanelEnd";

export function ProcessPanel() {
  const c = useContent();
  const bafaActive = useBafaActive();
  const { ui } = c;
  const { process } = c.consulting;
  return (
    <>
      <PanelTitle label={ui.categories.process}>{process.title}</PanelTitle>
      <Intro text={process.intro} />
      <Block title={ui.blocks.steps}>
        <ol className="grid gap-5">
          {process.steps.map((step, i) => (
            <li key={step.detail} className="flex gap-4">
              <span className="w-4 shrink-0 tabular-nums opacity-55">{i + 1}</span>
              <span>
                {step.line}
                <span className="block opacity-70">{step.detail}</span>
              </span>
            </li>
          ))}
        </ol>
      </Block>
      <Block title={ui.blocks.formats}>
        <ul className="grid gap-5">
          {process.formats.map((f) => (
            <li key={f.title}>
              <span className={`font-medium ${f.highlight ? "text-city-light" : ""}`}>{f.title}</span>
              <span className="block opacity-85">{f.text}</span>
              {f.note && <span className="block opacity-70">{f.note}</span>}
            </li>
          ))}
        </ul>
      </Block>
      <Block title={ui.blocks.costs} text={process.costs} />
      {bafaActive && (
        <Highlight title={c.consulting.bafa.title}>
          <PanelLink to={{ kind: "bafa" }}>{ui.path.bafaLink}</PanelLink>
        </Highlight>
      )}
      <PanelEnd related={[{ to: { kind: "faq" }, label: ui.categories.faq }]} />
    </>
  );
}

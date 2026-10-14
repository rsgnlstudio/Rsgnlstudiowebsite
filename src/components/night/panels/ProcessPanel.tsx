"use client";

import { Block, Eyebrow, Heading, Highlight, Intro } from "@/components/ui/Typography";
import { useBafaActive, useContent } from "@/content/ContentProvider";
import { PANEL_TITLE_ID, PanelEnd, PanelLink } from "./PanelEnd";

export function ProcessPanel() {
  const c = useContent();
  const bafaActive = useBafaActive();
  const { ui } = c;
  const { process } = c.consulting;
  return (
    <>
      <Eyebrow>{ui.categories.process}</Eyebrow>
      <Heading id={PANEL_TITLE_ID} size="title" className="mt-3 max-w-[22ch]">
        {process.title}
      </Heading>
      <Intro text={process.intro} />
      <Block title={ui.blocks.steps}>
        <ol className="grid gap-5">
          {process.steps.map((step, i) => (
            <li key={step.detail} className="flex gap-4">
              <span className="w-4 shrink-0 font-display tabular-nums opacity-55">{i + 1}</span>
              <span>
                {step.line}
                <span className="block italic opacity-55">{step.detail}</span>
              </span>
            </li>
          ))}
        </ol>
      </Block>
      <Block title={ui.blocks.formats}>
        <ul className="grid gap-5">
          {process.formats.map((f) => (
            <li key={f.title}>
              <span className={`font-display italic ${f.highlight ? "text-city-light" : ""}`}>{f.title}</span>
              <span className="block opacity-85">{f.text}</span>
              {f.note && <span className="block italic opacity-60">{f.note}</span>}
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

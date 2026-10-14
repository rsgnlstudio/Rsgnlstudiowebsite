"use client";

import { Eyebrow, Heading, Intro } from "@/components/ui/Typography";
import { useContent } from "@/content/ContentProvider";
import { PANEL_TITLE_ID, PanelEnd } from "./PanelEnd";

export function BafaPanel() {
  const c = useContent();
  const { bafa } = c.consulting;
  return (
    <>
      <Eyebrow>{c.ui.categories.bafa}</Eyebrow>
      <Heading id={PANEL_TITLE_ID} size="title" className="mt-3 max-w-[22ch]">
        {bafa.title}
      </Heading>
      <Intro text={bafa.text} />
      <PanelEnd related={[{ to: { kind: "process" }, label: c.consulting.process.title }]} />
    </>
  );
}

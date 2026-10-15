"use client";

import { Intro } from "@/components/ui/Typography";
import { useContent } from "@/content/ContentProvider";
import { PanelEnd, PanelTitle } from "./PanelEnd";

export function BafaPanel() {
  const c = useContent();
  const { bafa } = c.consulting;
  return (
    <>
      <PanelTitle label={c.ui.categories.bafa}>{bafa.title}</PanelTitle>
      <Intro text={bafa.text} />
      <PanelEnd related={[{ to: { kind: "process" }, label: c.consulting.process.title }]} />
    </>
  );
}

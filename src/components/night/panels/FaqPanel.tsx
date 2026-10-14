"use client";

import { Disclosure } from "@/components/ui/Disclosure";
import { Eyebrow, Heading } from "@/components/ui/Typography";
import { useBafaActive, useContent } from "@/content/ContentProvider";
import { PANEL_TITLE_ID, PanelEnd } from "./PanelEnd";

export function FaqPanel() {
  const c = useContent();
  const bafaActive = useBafaActive();
  const { ui } = c;
  return (
    <>
      <Eyebrow>{ui.categories.faq}</Eyebrow>
      <Heading id={PANEL_TITLE_ID} size="title" className="mt-3 max-w-[22ch]">
        {ui.categories.faq}
      </Heading>
      <div className="mt-10 grid max-w-prose gap-2">
        {c.consulting.faq.map((item) => (
          <Disclosure key={item.question} variant="faq" summary={item.question}>
            <p className="pr-12 pb-2 text-body opacity-80">
              {item.answer}
              {item.bafa && bafaActive && ` ${c.consulting.bafa.faqNote}`}
            </p>
          </Disclosure>
        ))}
      </div>
      <PanelEnd related={[{ to: { kind: "process" }, label: c.consulting.process.title }]} />
    </>
  );
}

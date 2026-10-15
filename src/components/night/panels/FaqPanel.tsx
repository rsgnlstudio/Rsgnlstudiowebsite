"use client";

import { Disclosure } from "@/components/ui/Disclosure";
import { useBafaActive, useContent } from "@/content/ContentProvider";
import { PanelEnd, PanelTitle } from "./PanelEnd";

export function FaqPanel() {
  const c = useContent();
  const bafaActive = useBafaActive();
  const { ui } = c;
  return (
    <>
      <PanelTitle label={ui.categories.faq}>{ui.categories.faq}</PanelTitle>
      <div className="mt-10 grid max-w-prose gap-2">
        {c.consulting.faq.map((item) => (
          <Disclosure key={item.question} variant="faq" summary={item.question}>
            <p className="pr-12 pb-2 text-base">
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

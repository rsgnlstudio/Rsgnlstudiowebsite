"use client";

import { Eyebrow, Heading, Intro } from "@/components/ui/Typography";
import { CITY_LIGHTS } from "@/config/nightMap";
import { useContent } from "@/content/ContentProvider";
import { byId } from "@/content/selectors";
import { PANEL_TITLE_ID, PanelEnd, PanelLink } from "./PanelEnd";

export function ServicesPanel() {
  const c = useContent();
  const { ui } = c;
  return (
    <>
      <Eyebrow>{ui.categories.services}</Eyebrow>
      <Heading id={PANEL_TITLE_ID} size="title" className="mt-3 max-w-[22ch]">
        {ui.categories.services}
      </Heading>
      <Intro text={c.consulting.servicesIntro} />
      <ul className="mt-10 grid max-w-prose gap-8">
        {CITY_LIGHTS.map((light) => {
          const s = byId(c.consulting.services, light.id);
          return (
            <li key={light.id}>
              <PanelLink to={{ kind: "service", id: light.id }}>
                <span className="font-display text-heading no-underline">{s.title}</span>
              </PanelLink>
              <p className="mt-1 text-body opacity-85">{s.preview.line}</p>
              <p className="text-body italic opacity-55">{s.preview.detail}</p>
            </li>
          );
        })}
      </ul>
      <PanelEnd related={[{ to: { kind: "process" }, label: c.consulting.process.title }]} />
    </>
  );
}

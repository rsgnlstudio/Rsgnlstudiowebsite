"use client";

import { Intro } from "@/components/ui/Typography";
import { CITY_LIGHTS } from "@/config/nightMap";
import { useContent } from "@/content/ContentProvider";
import { byId } from "@/content/selectors";
import { PanelEnd, PanelLink, PanelTitle } from "./PanelEnd";

export function ServicesPanel() {
  const c = useContent();
  const { ui } = c;
  return (
    <>
      <PanelTitle label={ui.categories.services}>{ui.categories.services}</PanelTitle>
      <Intro text={c.consulting.servicesIntro} />
      <ul className="mt-10 grid max-w-prose gap-8">
        {CITY_LIGHTS.map((light) => {
          const s = byId(c.consulting.services, light.id);
          return (
            <li key={light.id}>
              <PanelLink variant="hover" to={{ kind: "service", id: light.id }}>
                <span className="font-display text-xl">{s.title}</span>
              </PanelLink>
              <p className="mt-1 text-base opacity-85">{s.preview.line}</p>
              <p className="text-base opacity-70">{s.preview.detail}</p>
            </li>
          );
        })}
      </ul>
      <PanelEnd related={[{ to: { kind: "process" }, label: c.consulting.process.title }]} />
    </>
  );
}

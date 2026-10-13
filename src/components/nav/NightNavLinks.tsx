"use client";

import { CalendarDays } from "lucide-react";
import type { NightPanel } from "@/config/nightMap";
import { UI } from "@/content/consulting";
import { useSceneStore } from "@/store/scene";

const LINKS: { label: string; panel: NightPanel }[] = [
  { label: UI.nav.services, panel: { kind: "services" } },
  { label: UI.nav.process, panel: { kind: "process" } },
  { label: UI.nav.about, panel: { kind: "about" } },
];

const open = (panel: NightPanel) => useSceneStore.getState().setPanel(panel);

/**
 * The night's items in the top navigation (`TopNav`), for the consulting
 * site: services, process and about each open the panel at that place, so
 * every content is reachable without exploring the map (from lg up; below,
 * the map, the footer and the call to action lead there).
 */
export function NightNavLinks() {
  return (
    <div lang="de" className="hidden lg:flex">
      {LINKS.map((link) => (
        <button
          key={link.label}
          type="button"
          onClick={() => open(link.panel)}
          className="cursor-pointer rounded-full px-3 py-1.5 text-body opacity-55 transition-opacity duration-700 ease-smooth hover:opacity-80 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          {link.label}
        </button>
      ))}
    </div>
  );
}

/**
 * The night's main action at the end of the top navigation: "Erstgespräch
 * vereinbaren", the only item that glows, like the lights of the city. It
 * opens the contact panel.
 */
export function NightCta() {
  return (
    <button
      type="button"
      lang="de"
      onClick={() => open({ kind: "contact" })}
      className="flex cursor-pointer items-center gap-1.5 rounded-full bg-city-light py-1.5 pr-3 pl-3 text-body text-on-day shadow-[0_0_28px_-4px_var(--color-city-light)] transition-opacity duration-700 ease-smooth hover:opacity-85 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-city-light sm:pr-4 sm:pl-4 md:pr-5 md:pl-5"
    >
      <CalendarDays aria-hidden className="hidden size-[1.125rem] sm:block" strokeWidth={1.5} />
      <span className="sm:hidden">{UI.nav.contactShort}</span>
      <span className="hidden sm:inline">{UI.nav.contact}</span>
    </button>
  );
}

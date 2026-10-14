"use client";

import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { NightPanel } from "@/config/nightMap";
import { UI } from "@/content/consulting";
import { useSceneStore } from "@/store/scene";

/** The consulting site's sections, also in the mobile menu (`MobileMenu`). */
export const NIGHT_LINKS: { label: string; panel: NightPanel }[] = [
  { label: UI.nav.services, panel: { kind: "services" } },
  { label: UI.nav.process, panel: { kind: "process" } },
  { label: UI.nav.about, panel: { kind: "about" } },
];

const open = (panel: NightPanel) => useSceneStore.getState().setPanel(panel);

/**
 * The night's items in the top navigation (`TopNav`), for the consulting
 * site: services, process and about each open the panel at that place, so
 * every content is reachable without exploring the map (from lg up; below,
 * the footer, or below md the mobile menu, lead there).
 */
export function NightNavLinks() {
  return (
    <div className="hidden lg:flex">
      {NIGHT_LINKS.map((link) => (
        <Button key={link.label} variant="ghost" size="sm" onClick={() => open(link.panel)}>
          {link.label}
        </Button>
      ))}
    </div>
  );
}

/**
 * The night's main action at the end of the top navigation: "Erstgespräch
 * vereinbaren", the only item that glows, like the lights of the city. It
 * opens the contact panel. `block` fills the width (in the mobile menu).
 */
export function NightCta({ block }: { block?: boolean }) {
  return (
    <Button variant="primary" block={block} onClick={() => open({ kind: "contact" })}>
      <CalendarDays aria-hidden className="hidden size-[1.125rem] sm:block" strokeWidth={1.5} />
      <span className="sm:hidden">{UI.nav.contactShort}</span>
      <span className="hidden sm:inline">{UI.nav.contact}</span>
    </Button>
  );
}

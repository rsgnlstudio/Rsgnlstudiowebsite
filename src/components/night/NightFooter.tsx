"use client";

import Link from "next/link";
import type { NightPanel } from "@/config/nightMap";
import { IMPRINT_HREF, PAGE_IN } from "@/config/site";
import { UI } from "@/content/consulting";
import { useSceneStore } from "@/store/scene";
import { openPanel } from "./PanelParts";

const link =
  "pointer-events-auto cursor-pointer opacity-60 transition-opacity duration-700 ease-smooth hover:opacity-100 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-current";

/** Below lg the top navigation has no room for these; they live here instead. */
const SECTIONS: { label: string; panel: NightPanel }[] = [
  { label: UI.nav.services, panel: { kind: "services" } },
  { label: UI.nav.process, panel: { kind: "process" } },
  { label: UI.nav.about, panel: { kind: "about" } },
];

/**
 * Small links at the bottom of the night map, always within reach: the
 * questions, contact and the imprint (and, on smaller screens, the sections
 * the top navigation shows from lg up).
 */
export function NightFooter() {
  const shown = useSceneStore((s) => s.timeOfDay === "night" && s.nightIntro === "done" && s.night > 0.9);
  return (
    <nav
      aria-label={UI.footer.label}
      lang="de"
      inert={!shown}
      className={`pointer-events-none fixed inset-x-6 bottom-6 z-20 flex flex-wrap justify-center gap-x-5 gap-y-2 text-caption tracking-wide text-on-night transition-opacity duration-1500 ease-smooth md:justify-end ${
        shown ? "opacity-100" : "opacity-0"
      }`}
    >
      {SECTIONS.map((s) => (
        <button key={s.label} type="button" className={`${link} lg:hidden`} onClick={() => openPanel(s.panel)}>
          {s.label}
        </button>
      ))}
      <button type="button" className={link} onClick={() => openPanel({ kind: "faq" })}>
        {UI.footer.faq}
      </button>
      <button type="button" className={link} onClick={() => openPanel({ kind: "contact" })}>
        {UI.footer.contact}
      </button>
      <Link href={IMPRINT_HREF} transitionTypes={[PAGE_IN]} className={link}>
        {UI.footer.imprint}
      </Link>
    </nav>
  );
}

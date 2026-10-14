"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { openPanel } from "@/components/night/PanelParts";
import type { NightPanel } from "@/config/nightMap";
import { IMPRINT_HREF, PAGE_IN } from "@/config/navigation";
import { UI } from "@/content/consulting";
import { useContent } from "@/content/ContentProvider";
import { useIntroRevealed } from "@/hooks/useIntroRevealed";
import { useOverlayFade } from "@/hooks/useOverlayFade";
import { useSceneStore } from "@/store/scene";

const link =
  "pointer-events-auto cursor-pointer opacity-60 transition-opacity duration-700 ease-smooth hover:opacity-100 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-current";

const set = "flex flex-wrap gap-x-5 gap-y-2 text-nav-caption tracking-wide transition-opacity ease-smooth";
const overScene = "pointer-events-none fixed inset-x-6 bottom-6 z-20";

/** From md to lg the top navigation has no room for these; they live here instead (below md in the burger menu). */
const SECTIONS: { label: string; panel: NightPanel }[] = [
  { label: UI.nav.services, panel: { kind: "services" } },
  { label: UI.nav.process, panel: { kind: "process" } },
  { label: UI.nav.about, panel: { kind: "about" } },
];

/**
 * Small links at the bottom right of every page, mounted in the root layout:
 * fixed over the scene, at the end of the page on pages without it.
 * By day (and on pages without the scene) the studio's imprint and contact
 * (a `mailto:`); on the night map the consulting site's questions, contact
 * and imprint (and, from md to lg, the sections the top navigation shows
 * from lg up). The two sets cross over with the scene, and both fade
 * out while an overlay is open.
 */
export function SiteFooter() {
  const { site } = useContent();
  const revealed = useIntroRevealed();
  const onMap = useSceneStore((s) => s.sceneMode !== "hidden");
  const isDay = useSceneStore((s) => s.timeOfDay === "day");
  const nightReady = useSceneStore((s) => s.timeOfDay === "night" && s.nightIntro === "done" && s.night > 0.9);
  const onImprint = usePathname() === IMPRINT_HREF;
  const overlay = useOverlayFade().hidden;
  // Without the scene (a sub-page) it is always day here.
  const day = (onMap ? isDay && revealed : true) && !overlay;
  const night = onMap && nightReady && !overlay;

  return (
    <>
      <nav
        aria-label={UI.footer.label}
        inert={!day}
        className={`${set} justify-end ${onMap ? `${overScene} text-foreground` : "bg-on-night px-6 pb-6 text-on-day"} ${
          day ? "opacity-100 duration-1500" : "opacity-0 duration-700"
        }`}
      >
        <Link
          href={IMPRINT_HREF}
          aria-current={onImprint ? "page" : undefined}
          transitionTypes={onImprint ? undefined : [PAGE_IN]}
          className={link}
        >
          {UI.footer.imprint}
        </Link>
        <a href={`mailto:${site.contactEmail}`} className={link}>
          {UI.footer.contact}
        </a>
      </nav>
      <nav
        aria-label={UI.footer.label}
        inert={!night}
        className={`${set} ${overScene} justify-center text-on-night duration-1500 md:justify-end ${
          night ? "opacity-100" : "opacity-0"
        }`}
      >
        {SECTIONS.map((s) => (
          <button key={s.label} type="button" className={`${link} hidden md:block lg:hidden`} onClick={() => openPanel(s.panel)}>
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
    </>
  );
}

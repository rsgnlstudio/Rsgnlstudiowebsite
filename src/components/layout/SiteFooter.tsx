"use client";

import { usePathname } from "next/navigation";
import { TextButton, TextLink } from "@/components/ui/TextLink";
import { IMPRINT_HREF, NIGHT_SECTIONS, PAGE_IN } from "@/config/navigation";
import { useContent } from "@/content/ContentProvider";
import { useIntroRevealed } from "@/hooks/useIntroRevealed";
import { useOverlayFade } from "@/hooks/useOverlayFade";
import { openPanel, useSceneStore } from "@/store/scene";

const set = "flex flex-wrap gap-x-5 gap-y-2 text-sm tracking-wide transition-opacity ease-smooth";
const overScene = "pointer-events-none fixed inset-x-6 bottom-6 z-20";

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
  const { site, ui } = useContent();
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
        aria-label={ui.footer.label}
        inert={!day}
        className={`${set} justify-end ${onMap ? `${overScene} text-foreground` : "bg-on-night px-6 pb-6 text-on-day"} ${
          day ? "opacity-100 duration-1500" : "opacity-0 duration-700"
        }`}
      >
        <TextLink
          variant="quiet"
          href={IMPRINT_HREF}
          aria-current={onImprint ? "page" : undefined}
          transitionTypes={onImprint ? undefined : [PAGE_IN]}
          className="pointer-events-auto"
        >
          {ui.footer.imprint}
        </TextLink>
        <TextLink variant="quiet" href={`mailto:${site.contactEmail}`} className="pointer-events-auto">
          {ui.footer.contact}
        </TextLink>
      </nav>
      <nav
        aria-label={ui.footer.label}
        inert={!night}
        className={`${set} ${overScene} justify-center text-on-night duration-1500 md:justify-end ${
          night ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* From md to lg the top navigation has no room for these; they live here instead (below md in the burger menu). */}
        {NIGHT_SECTIONS.map((s) => (
          <TextButton key={s.key} variant="quiet" className="pointer-events-auto hidden md:block lg:hidden" onClick={() => openPanel(s.panel)}>
            {ui.nav[s.key]}
          </TextButton>
        ))}
        <TextButton variant="quiet" className="pointer-events-auto" onClick={() => openPanel({ kind: "faq" })}>
          {ui.footer.faq}
        </TextButton>
        <TextButton variant="quiet" className="pointer-events-auto" onClick={() => openPanel({ kind: "contact" })}>
          {ui.footer.contact}
        </TextButton>
        <TextLink variant="quiet" href={IMPRINT_HREF} transitionTypes={[PAGE_IN]} className="pointer-events-auto">
          {ui.footer.imprint}
        </TextLink>
      </nav>
    </>
  );
}

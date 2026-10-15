"use client";

import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { NIGHT_SECTIONS } from "@/config/navigation";
import { useContent } from "@/content/ContentProvider";
import { openPanel } from "@/store/scene";

/**
 * The night's items in the top navigation (`TopNav`), for the consulting
 * site: services, process and about each open the panel at that place, so
 * every content is reachable without exploring the map (from lg up; below,
 * the footer, or below md the mobile menu, lead there).
 */
export function NightNavLinks() {
  const { ui } = useContent();
  return (
    // Room before the call to action, so it doesn't crowd the last link.
    <div className="mr-3 hidden lg:flex">
      {NIGHT_SECTIONS.map((s) => (
        <Button key={s.key} variant="ghost" size="sm" onClick={() => openPanel(s.panel)}>
          {ui.nav[s.key]}
        </Button>
      ))}
    </div>
  );
}

/**
 * The night's main action at the end of the top navigation: "Erstgespräch
 * vereinbaren", the only filled item, in the color of the city lights. It
 * opens the contact panel. `block` fills the width (in the mobile menu).
 */
export function NightCta({ block }: { block?: boolean }) {
  const { ui } = useContent();
  return (
    <Button variant="primary" block={block} onClick={() => openPanel({ kind: "contact" })}>
      <Icon icon={CalendarDays} className="hidden sm:block" />
      <span className="sm:hidden">{ui.nav.contactShort}</span>
      <span className="hidden sm:inline">{ui.nav.contact}</span>
    </Button>
  );
}

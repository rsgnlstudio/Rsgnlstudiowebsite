"use client";

import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { TextButton } from "@/components/ui/TextLink";
import { Eyebrow } from "@/components/ui/Typography";
import type { NightPanel } from "@/config/nightMap";
import { useContent } from "@/content/ContentProvider";
import { bookingHref } from "@/content/selectors";
import { openPanel } from "@/store/scene";

/** id of the element that names the night panel (its heading). */
export const PANEL_TITLE_ID = "night-panel-title";

/** A link to another panel, e.g. from a service to its challenge. */
export function PanelLink({ to, children }: { to: NightPanel; children: ReactNode }) {
  return (
    <TextButton onClick={() => openPanel(to)} className="group inline-flex items-center gap-2 text-left text-body">
      {children}
      <Icon icon={ArrowRight} size="sm" className="shrink-0 transition-transform duration-700 ease-smooth group-hover:translate-x-0.5" />
    </TextButton>
  );
}

/** "Termin vereinbaren": opens the contact panel; inside it (`book`), it books directly. */
export function Cta({ book, challenge }: { book?: boolean; challenge?: string }) {
  const { contact } = useContent().consulting;
  if (book) {
    return (
      <ButtonLink variant="primary" href={bookingHref(contact, challenge)}>
        <span>{contact.cta}</span>
        <Icon icon={ArrowUpRight} />
      </ButtonLink>
    );
  }
  return (
    <Button variant="primary" onClick={() => openPanel({ kind: "contact" })}>
      <span>{contact.cta}</span>
      <Icon icon={ArrowRight} />
    </Button>
  );
}

/** The end of every panel: the action, then one or two related panels. */
export function PanelEnd({
  related,
  book,
  challenge,
}: {
  related?: { to: NightPanel; label: string }[];
  book?: boolean;
  challenge?: string;
}) {
  const { ui } = useContent();
  return (
    <footer className="mt-14">
      <Cta book={book} challenge={challenge} />
      {related && related.length > 0 && (
        <nav aria-label={ui.related} className="mt-12">
          <Eyebrow>{ui.related}</Eyebrow>
          <ul className="mt-3 grid gap-2">
            {related.map((r) => (
              <li key={r.label}>
                <PanelLink to={r.to}>{r.label}</PanelLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </footer>
  );
}

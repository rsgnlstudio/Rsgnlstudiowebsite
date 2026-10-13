"use client";

import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import type { NightPanel } from "@/config/nightMap";
import { CONTACT, UI } from "@/content/consulting";
import { useSceneStore } from "@/store/scene";

/** Opens another panel; the map follows. */
export const openPanel = (panel: NightPanel) => useSceneStore.getState().setPanel(panel);

/** The small category above a panel's heading, e.g. "Leistung". */
export function Category({ children }: { children: ReactNode }) {
  return <p className="text-caption tracking-widest uppercase opacity-60">{children}</p>;
}

/** A panel's heading (it names the dialog). */
export function Heading({ children }: { children: ReactNode }) {
  return (
    <h2 id="night-panel-title" className="mt-3 max-w-[22ch] font-display text-heading md:text-display">
      {children}
    </h2>
  );
}

/** Two to three sentences under the heading; `detail` is the plain second line, smaller and quieter. */
export function Intro({ children, detail }: { children?: ReactNode; detail?: ReactNode }) {
  return (
    <div className="mt-5 max-w-prose">
      {children && <p className="text-body opacity-85">{children}</p>}
      {detail && <p className="mt-1 text-body italic opacity-55">{detail}</p>}
    </div>
  );
}

/** A content block with its subheading. */
export function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10 max-w-prose">
      <h3 className="text-caption tracking-widest uppercase opacity-60">{title}</h3>
      <div className="mt-2 text-body opacity-90">{children}</div>
    </section>
  );
}

/** A highlighted box (e.g. an entry format, or the subsidy). */
export function Highlight({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="mt-10 max-w-prose rounded-2xl border border-city-light/35 bg-city-light/5 px-5 py-4">
      <p className="font-display text-body italic text-city-light">{title}</p>
      <div className="mt-1 text-body opacity-90">{children}</div>
    </aside>
  );
}

const ctaClass =
  "inline-flex items-center gap-2 rounded-full bg-city-light px-6 py-3 text-body text-on-day shadow-[0_0_36px_-6px_var(--color-city-light)] transition-opacity duration-700 ease-smooth hover:opacity-85 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-city-light";

/** The mail link that stands in for the calendar until a booking tool is chosen. */
export function bookingHref(challenge?: string) {
  const subject = encodeURIComponent(CONTACT.mailSubject);
  const body = challenge ? `&body=${encodeURIComponent(`${CONTACT.mailChallenge} ${challenge}\n\n`)}` : "";
  return `mailto:${CONTACT.email}?subject=${subject}${body}`;
}

/**
 * The one action every panel ends with: "Termin vereinbaren". It opens the
 * contact panel; inside it (`book`), it books directly.
 */
export function Cta({ book, challenge }: { book?: boolean; challenge?: string }) {
  if (book) {
    return (
      <a href={bookingHref(challenge)} className={ctaClass}>
        {CONTACT.cta}
        <ArrowUpRight aria-hidden className="size-[1.125rem]" strokeWidth={1.5} />
      </a>
    );
  }
  return (
    <button type="button" onClick={() => openPanel({ kind: "contact" })} className={`${ctaClass} cursor-pointer`}>
      {CONTACT.cta}
      <ArrowRight aria-hidden className="size-[1.125rem]" strokeWidth={1.5} />
    </button>
  );
}

/** A link to another panel, e.g. from a service to its challenge. */
export function PanelLink({ to, children }: { to: NightPanel; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => openPanel(to)}
      className="group inline-flex cursor-pointer items-center gap-2 text-left text-body underline decoration-current/30 underline-offset-4 transition-[text-decoration-color] duration-700 ease-smooth hover:decoration-current focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-current"
    >
      {children}
      <ArrowRight
        aria-hidden
        className="size-4 shrink-0 transition-transform duration-700 ease-smooth group-hover:translate-x-0.5"
        strokeWidth={1.5}
      />
    </button>
  );
}

/** The end of every panel: the action, then one or two related panels. */
export function PanelEnd({ related, book, challenge }: { related?: { to: NightPanel; label: string }[]; book?: boolean; challenge?: string }) {
  return (
    <footer className="mt-14">
      <Cta book={book} challenge={challenge} />
      {related && related.length > 0 && (
        <nav aria-label={UI.related} className="mt-12">
          <p className="text-caption tracking-widest uppercase opacity-60">{UI.related}</p>
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

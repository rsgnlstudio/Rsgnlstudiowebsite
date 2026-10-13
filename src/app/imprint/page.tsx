import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ViewTransition } from "react";
import { CONTACT_EMAIL, PAGE_IN, PAGE_OUT } from "@/config/site";

export const metadata: Metadata = {
  title: "Impressum · RSGNL Studio",
};

/*
 * Placeholder content. Replace every value with the real details before
 * launch. The canvas stays hidden here (no page claims a scene mode). In the
 * project overlay's colors, and it slides in from the right like the overlay
 * (`page-slide` in globals.css).
 */
export default function ImprintPage() {
  return (
    <ViewTransition
      enter={{ [PAGE_IN]: "page-slide", default: "none" }}
      exit={{ [PAGE_OUT]: "page-slide", default: "none" }}
      default="none"
    >
      <div className="min-h-dvh bg-on-night text-on-day">
        <article className="mx-auto max-w-2xl px-gutter py-section">
          <Link
            href="/"
            transitionTypes={[PAGE_OUT]}
            className="group inline-flex items-center gap-1.5 text-body opacity-55 transition-opacity duration-700 ease-smooth hover:opacity-80 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-current"
          >
            <ArrowLeft
              aria-hidden
              className="size-[1.125rem] transition-transform duration-700 ease-smooth group-hover:-translate-x-0.5"
              strokeWidth={1.5}
            />
            Zurück
          </Link>

          <h1 className="mt-12 font-display text-display">Impressum</h1>

          <section className="mt-16">
            <h2 className="text-heading">Angaben gemäß § 5 DDG</h2>
            <address className="mt-4 text-body not-italic">
              RSGNL Studio
              <br />
              Vorname Nachname
              <br />
              Musterstraße 1
              <br />
              12345 Musterstadt
              <br />
              Deutschland
            </address>
          </section>

          <section className="mt-12">
            <h2 className="text-heading">Kontakt</h2>
            <p className="mt-4 text-body">
              Telefon: +49 000 0000000
              <br />
              E-Mail:{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="underline underline-offset-4"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </section>

          <section className="mt-12">
            <h2 className="text-heading">Umsatzsteuer-ID</h2>
            <p className="mt-4 text-body">
              Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: DE000000000
            </p>
          </section>

          <section className="mt-12">
            <h2 className="text-heading">Verantwortlich für den Inhalt</h2>
            <p className="mt-4 text-body">
              nach § 18 Abs. 2 MStV: Vorname Nachname, Anschrift wie oben
            </p>
          </section>

          <section className="mt-12">
            <h2 className="text-heading">Haftung für Inhalte</h2>
            <p className="mt-4 text-body opacity-70">
              Platzhaltertext. Lorem ipsum dolor sit amet, consectetur
              adipiscing elit, sed do eiusmod tempor incididunt ut labore et
              dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
              exercitation ullamco laboris nisi ut aliquip ex ea commodo
              consequat.
            </p>
          </section>

          <section className="mt-12">
            <h2 className="text-heading">Haftung für Links</h2>
            <p className="mt-4 text-body opacity-70">
              Platzhaltertext. Duis aute irure dolor in reprehenderit in
              voluptate velit esse cillum dolore eu fugiat nulla pariatur.
              Excepteur sint occaecat cupidatat non proident, sunt in culpa qui
              officia deserunt mollit anim id est laborum.
            </p>
          </section>

          <section className="mt-12">
            <h2 className="text-heading">Urheberrecht</h2>
            <p className="mt-4 text-body opacity-70">
              Platzhaltertext. Sed ut perspiciatis unde omnis iste natus error
              sit voluptatem accusantium doloremque laudantium, totam rem
              aperiam.
            </p>
          </section>
        </article>
      </div>
    </ViewTransition>
  );
}

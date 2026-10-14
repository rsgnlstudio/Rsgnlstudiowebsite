import type { LegalPage } from "@/content/schema";
import { site } from "./site";

/** Placeholder content. Replace every value with the real details before launch. */
export const legal: readonly LegalPage[] = [
  {
    slug: "imprint",
    title: "Impressum",
    metaTitle: "Impressum · RSGNL Studio",
    sections: [
      {
        heading: "Angaben gemäß § 5 DDG",
        body: "RSGNL Studio\nVorname Nachname\nMusterstraße 1\n12345 Musterstadt\nDeutschland",
        address: true,
      },
      { heading: "Kontakt", body: `Telefon: +49 000 0000000\nE-Mail: ${site.contactEmail}` },
      { heading: "Umsatzsteuer-ID", body: "Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: DE000000000" },
      { heading: "Verantwortlich für den Inhalt", body: "nach § 18 Abs. 2 MStV: Vorname Nachname, Anschrift wie oben" },
      {
        heading: "Haftung für Inhalte",
        body: "Platzhaltertext. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
        muted: true,
      },
      {
        heading: "Haftung für Links",
        body: "Platzhaltertext. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
        muted: true,
      },
      {
        heading: "Urheberrecht",
        body: "Platzhaltertext. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam.",
        muted: true,
      },
    ],
  },
];

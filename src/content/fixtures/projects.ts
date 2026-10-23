import type { Project, ProjectMedia } from "@/content/schema";

/** Placeholder media until the real project content exists. */
const PLACEHOLDER: readonly ProjectMedia[] = [{ aspect: "landscape" }, { aspect: "portrait" }, { aspect: "portrait" }];

export const projects: readonly Project[] = [
  { id: "about", title: "Vita & Über mich", teaser: "Platzhalter: eine kurze Zeile über Simone.", media: PLACEHOLDER },
  { id: "illustration", title: "Illustrationen & Digitalkunst", teaser: "Platzhalter: eine kurze Zeile zu diesem Portfolio.", media: PLACEHOLDER },
  { id: "painting", title: "Malerei", teaser: "Platzhalter: eine kurze Zeile zu diesem Portfolio.", media: PLACEHOLDER },
  { id: "writing", title: "Texte & Gegenständliches", teaser: "Platzhalter: eine kurze Zeile zu diesem Portfolio.", media: PLACEHOLDER },
  { id: "shop", title: "Shop", href: "https://www.etsy.com/shop/studiorsgnl" },
];

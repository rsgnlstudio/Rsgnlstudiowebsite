import type { SiteDocuments } from "@/content/schema";
import { type FixedItemType, SINGLETONS, type SingletonKey } from "@/sanity/fixedDocuments";
import { splitLabels } from "@/sanity/labels";

export interface SanityDocumentStub {
  _id: string;
  _type: string;
  [field: string]: unknown;
}

/** Gives every object inside an array a `_key`, as Sanity requires. */
function keyed(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((v, i) => (v && typeof v === "object" && !Array.isArray(v) ? { _key: `k${i}`, ...(keyed(v) as object) } : keyed(v)));
  }
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, keyed(v)]));
}

/** The content as Sanity documents with their fixed ids (the transfer, and the tests' fixture). */
export function toSanity(docs: SiteDocuments): SanityDocumentStub[] {
  const { consulting: c } = docs;
  const imprint = docs.legal.find((p) => p.slug === "imprint");
  const [ui, nightUi] = splitLabels(docs.ui);
  const singletons: Record<SingletonKey, object | undefined> = {
    site: docs.site,
    ui,
    nightUi,
    studio: docs.studio,
    intro: c.intro,
    servicesOverview: { intro: c.servicesIntro },
    results: c.results,
    process: c.process,
    about: c.about,
    testimonials: { items: c.testimonials },
    bafa: c.bafa,
    faq: { items: c.faq },
    contact: c.contact,
    imprint,
  };
  const items: Record<FixedItemType, readonly { id: string }[]> = {
    project: docs.projects,
    area: c.areas,
    challenge: c.challenges,
    service: c.services,
    road: c.roads,
  };
  return [
    ...SINGLETONS.flatMap((s) => {
      const fields = singletons[s.key];
      return fields ? [{ _id: s._id, _type: s.type, ...(keyed(fields) as object) }] : [];
    }),
    ...Object.entries(items).flatMap(([type, list]) =>
      list.map((item) => ({ _id: `${type}-${item.id}`, _type: type, ...(keyed(item) as object) })),
    ),
  ];
}

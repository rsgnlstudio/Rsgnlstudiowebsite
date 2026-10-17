import type { FixedItemType, SingletonKey } from "@/sanity/fixedDocuments";
import { fixedItems } from "@/sanity/fixedDocuments";
import type { SiteDocuments } from "@/content/schema";

/** What SITE_QUERY returns, before `fromSanity` cleans it up. */
export type RawSiteContent = Record<SingletonKey, unknown> & Record<FixedItemType, unknown[]>;

/** An image whose file was removed in the Studio (Sanity keeps its alt text): no image. */
const isEmptyImage = (value: object) => "_type" in value && value._type === "contentImage" && !("asset" in value && value.asset);

/**
 * Drops Sanity's own fields (`_id`, `_key`, `_type`, …; references keep
 * `_ref`), empty values and images without a file.
 */
function clean(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(clean);
  if (!value || typeof value !== "object") return value;
  if (isEmptyImage(value)) return undefined;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([k]) => !k.startsWith("_") || k === "_ref")
      .map(([k, v]) => [k, clean(v)])
      .filter(([, v]) => v !== null && v !== undefined),
  );
}

/** A fixed list in config order (the query returns it in any order). */
function inOrder<T>(type: FixedItemType, items: unknown[]): T[] {
  const order = fixedItems(type).map((d) => d.configId);
  const rank = (item: unknown) => order.indexOf((item as { id: string }).id);
  return (clean(items) as unknown[]).sort((a, b) => rank(a) - rank(b)) as T[];
}

/**
 * The fetched documents as `SiteDocuments`, the shape components read. Not a
 * check: `validateContent` decides whether the result is complete.
 */
export function fromSanity(raw: RawSiteContent): SiteDocuments {
  const doc = <T>(key: SingletonKey) => clean(raw[key] ?? {}) as T;
  type C = SiteDocuments["consulting"];
  return {
    site: doc("site"),
    studio: doc("studio"),
    ui: doc("ui"),
    projects: inOrder("project", raw.project ?? []),
    consulting: {
      intro: doc("intro"),
      areas: inOrder("area", raw.area ?? []),
      challenges: inOrder("challenge", raw.challenge ?? []),
      services: inOrder("service", raw.service ?? []),
      servicesIntro: doc<{ intro: string }>("servicesOverview").intro,
      roads: inOrder("road", raw.road ?? []),
      results: doc("results"),
      process: doc("process"),
      about: doc("about"),
      testimonials: doc<{ items?: C["testimonials"] }>("testimonials").items ?? [],
      bafa: doc("bafa"),
      faq: doc<{ items?: C["faq"] }>("faq").items ?? [],
      contact: doc("contact"),
    },
    legal: raw.imprint ? [doc("imprint")] : [],
  };
}

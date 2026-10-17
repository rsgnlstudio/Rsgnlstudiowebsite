import { describe, expect, it } from "vitest";
import { siteDocuments } from "@/content/fixtures";
import { FIXED_ITEM_TYPES, SINGLETONS } from "@/sanity/fixedDocuments";
import { fromSanity, type RawSiteContent } from "@/sanity/fromSanity";
import { toSanity } from "@/sanity/toSanity";

/** What SITE_QUERY returns for these documents: singletons by id, items by type (here in reverse order). */
function rawFrom(docs: ReturnType<typeof toSanity>): RawSiteContent {
  const raw: Record<string, unknown> = {};
  for (const s of SINGLETONS) raw[s.key] = docs.find((d) => d._id === s._id);
  for (const type of FIXED_ITEM_TYPES) raw[type] = docs.filter((d) => d._type === type).reverse();
  return raw as RawSiteContent;
}

function arraysOfObjects(value: unknown, found: object[][] = []): object[][] {
  if (Array.isArray(value)) {
    if (value.some((v) => v && typeof v === "object")) found.push(value);
    value.forEach((v) => arraysOfObjects(v, found));
  } else if (value && typeof value === "object") Object.values(value).forEach((v) => arraysOfObjects(v, found));
  return found;
}

describe("Sanity mapping", () => {
  it("round-trips the content", () => {
    expect(fromSanity(rawFrom(toSanity(siteDocuments)))).toEqual(siteDocuments);
  });
  it("keys every object in an array uniquely", () => {
    for (const list of toSanity(siteDocuments).flatMap((doc) => arraysOfObjects(doc))) {
      const keys = list.map((item) => (item as { _key?: string })._key);
      expect(keys.every(Boolean)).toBe(true);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
  it("gives every document a type and a fixed id", () => {
    const docs = toSanity(siteDocuments);
    const ids = [...SINGLETONS.map((s) => s._id)];
    expect(docs.filter((d) => SINGLETONS.some((s) => s._id === d._id)).map((d) => d._id).sort()).toEqual(ids.sort());
  });
  it("treats an image without an asset as no image", () => {
    const raw = rawFrom(toSanity(siteDocuments));
    const about = raw.about as Record<string, unknown>;
    const result = fromSanity({ ...raw, about: { ...about, portrait: { _type: "contentImage", alt: "Simone" } } });
    expect(result.consulting.about.portrait).toBeUndefined();
  });
});

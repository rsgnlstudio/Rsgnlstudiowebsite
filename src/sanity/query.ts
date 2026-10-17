import { FIXED_ITEM_TYPES, SINGLETONS } from "@/sanity/fixedDocuments";

/** An image with its blur placeholder. */
const image = (field: string) => `${field}{..., "lqip": asset->metadata.lqip}`;

const ITEM_PROJECTIONS: Partial<Record<(typeof FIXED_ITEM_TYPES)[number], string>> = {
  project: `{..., media[]{..., ${image("image")}}}`,
};

/** All the site's documents in one request; `fromSanity` turns the result into `SiteDocuments`. */
export const SITE_QUERY = `{
${[
  ...SINGLETONS.map(
    (s) => `  "${s.key}": *[_id == "${s._id}"][0]${"images" in s ? `{..., ${image(s.images)}}` : ""}`,
  ),
  ...FIXED_ITEM_TYPES.map((t) => `  "${t}": *[_type == "${t}"]${ITEM_PROJECTIONS[t] ?? ""}`),
].join(",\n")}
}`;

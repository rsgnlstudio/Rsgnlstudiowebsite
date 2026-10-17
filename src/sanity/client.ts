import { createClient } from "next-sanity";
import type { SiteDocuments } from "@/content/schema";
import { apiVersion, dataset, projectId } from "@/sanity/env";
import { fromSanity, type RawSiteContent } from "@/sanity/fromSanity";
import { SITE_QUERY } from "@/sanity/query";

/**
 * Reads the published content. No CDN: Next caches the result (see
 * `getSiteContent`), and the webhook must read what was just published.
 */
export const client = createClient({ projectId, dataset, apiVersion, useCdn: false, perspective: "published" });

/**
 * All the site's documents, fresh from Sanity. `no-store` keeps the request
 * out of Next's fetch cache: inside `"use cache"` an unconfigured fetch is
 * cached on its own, untagged, so a refresh of the `content` tag (and a
 * build restoring `.next/cache`) would read the content from before the
 * publish. `getSiteContent`'s cache is the only cache.
 */
export async function fetchSiteDocuments(): Promise<SiteDocuments> {
  return fromSanity(await client.fetch<RawSiteContent>(SITE_QUERY, {}, { cache: "no-store" }));
}

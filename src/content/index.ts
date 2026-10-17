import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { LegalPage, SiteContent } from "@/content/schema";
import { validateContent } from "@/content/validate";
import { client } from "@/sanity/client";
import { fromSanity } from "@/sanity/fromSanity";
import { SITE_QUERY } from "@/sanity/query";

/**
 * The site's content, from Sanity: the only way copy gets into the site.
 * Cached until the webhook (src/app/api/revalidate) refreshes the `content`
 * tag, which it only does for complete content, so the cache always holds
 * the last good content. Incomplete content fails the build.
 */
export async function getSiteContent(): Promise<SiteContent> {
  "use cache";
  cacheLife("max");
  cacheTag("content");
  const content = fromSanity(await client.fetch(SITE_QUERY));
  const problems = validateContent(content);
  if (problems.length) throw new Error(`Incomplete content:\n${problems.join("\n")}`);
  return content;
}

/** A legal page (e.g. the imprint) by its slug. */
export async function getLegalPage(slug: string): Promise<LegalPage> {
  const page = (await getSiteContent()).legal.find((p) => p.slug === slug);
  if (!page) throw new Error(`No legal page "${slug}".`);
  return page;
}

import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { LegalPage, SiteContent } from "@/content/schema";
import { validateContent } from "@/content/validate";
import { fetchSiteDocuments } from "@/sanity/client";

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
  const content = await fetchSiteDocuments();
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

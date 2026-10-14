import { cacheLife, cacheTag } from "next/cache";
import { siteDocuments } from "@/content/data";
import type { LegalPage, SiteContent } from "@/content/schema";
import { bafaActive } from "@/content/selectors";
import { validateContent } from "@/content/validate";

/**
 * The site's content: the only way copy gets into the site. Today it is
 * the local seed data (src/content/data); with Sanity this becomes a GROQ
 * query, revalidated by the `content` tag. Cached for a day at most, so the
 * BAFA subsidy ends on time. Incomplete content fails the build.
 */
export async function getSiteContent(): Promise<SiteContent> {
  "use cache";
  cacheLife("days");
  cacheTag("content");
  const problems = validateContent(siteDocuments);
  if (problems.length) throw new Error(`Incomplete content:\n${problems.join("\n")}`);
  return { ...siteDocuments, bafaActive: bafaActive(siteDocuments.consulting.bafa, new Date()) };
}

/** A legal page (e.g. the imprint) by its slug. */
export async function getLegalPage(slug: string): Promise<LegalPage> {
  const page = (await getSiteContent()).legal.find((p) => p.slug === slug);
  if (!page) throw new Error(`No legal page "${slug}".`);
  return page;
}

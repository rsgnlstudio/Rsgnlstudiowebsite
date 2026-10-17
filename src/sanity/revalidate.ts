import type { SiteDocuments } from "@/content/schema";
import { validateContent } from "@/content/validate";

interface WebhookInput {
  /** From `parseBody`: null when the request carries no signature. */
  isValidSignature: boolean | null;
  fetchContent: () => Promise<SiteDocuments>;
  revalidate: () => void;
}

/**
 * Decides what a Sanity webhook does: the site's content is refreshed only
 * when what's now published is complete, so an incomplete publish never
 * replaces the last good content (the site keeps serving it until the next
 * complete publish).
 */
export async function handleWebhook({ isValidSignature, fetchContent, revalidate }: WebhookInput) {
  if (!isValidSignature) return { status: 401 as const };
  const problems = validateContent(await fetchContent());
  if (problems.length) return { status: 422 as const, problems };
  revalidate();
  return { status: 200 as const };
}

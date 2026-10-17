import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { parseBody } from "next-sanity/webhook";
import { fetchSiteDocuments } from "@/sanity/client";
import { handleWebhook } from "@/sanity/revalidate";

/** Called by the Sanity webhook on every publish (see README): refreshes the `content` cache. */
export async function POST(request: NextRequest) {
  const { isValidSignature } = await parseBody(request, process.env.SANITY_REVALIDATE_SECRET);
  const result = await handleWebhook({
    isValidSignature,
    fetchContent: fetchSiteDocuments,
    revalidate: revalidateTag,
  });
  if (result.status === 422) console.error(`Published content is incomplete, keeping the last good content:\n${result.problems.join("\n")}`);
  return Response.json(result, { status: result.status });
}

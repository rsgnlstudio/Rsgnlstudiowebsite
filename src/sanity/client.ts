import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "@/sanity/env";

/**
 * Reads the published content. No CDN: Next caches the result (see
 * `getSiteContent`), and the webhook must read what was just published.
 */
export const client = createClient({ projectId, dataset, apiVersion, useCdn: false, perspective: "published" });

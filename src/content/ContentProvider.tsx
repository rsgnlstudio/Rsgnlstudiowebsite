"use client";

import { createContext, type ReactNode, use, useLayoutEffect } from "react";
import type { SiteContent } from "@/content/schema";
import { useSceneStore } from "@/store/scene";

const ContentContext = createContext<SiteContent | null>(null);

/**
 * Hands the site's content (fetched on the server by `getSiteContent`) to
 * client components, and the few values the canvas needs to the store
 * (the canvas never reads content). Mounted once in the root layout.
 */
export function ContentProvider({ content, children }: { content: SiteContent; children: ReactNode }) {
  useLayoutEffect(() => {
    useSceneStore.getState().setContentFlags({
      testimonialCount: content.consulting.testimonials.length,
      bafaActive: content.bafaActive,
    });
  }, [content]);
  return <ContentContext value={content}>{children}</ContentContext>;
}

/** The site's content, in a client component. */
export function useContent(): SiteContent {
  const content = use(ContentContext);
  if (!content) throw new Error("useContent needs a ContentProvider.");
  return content;
}

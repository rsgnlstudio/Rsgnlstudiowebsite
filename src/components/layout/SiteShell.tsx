import type { ReactNode } from "react";
import { CursorDot } from "@/components/layout/CursorDot";
import { SiteBrand } from "@/components/layout/SiteBrand";
import { SiteFooter } from "@/components/layout/SiteFooter";
import type { SiteContent } from "@/content/schema";
import { ContentProvider } from "@/content/ContentProvider";
import { calendas } from "@/fonts/calendas";
import { dmSans } from "@/fonts/dmSans";

/**
 * The site's document around `children`: fonts, the content for client
 * components, and the chrome the same on every page (wordmark, footer, dot
 * cursor). Shared by the site's root layout and the page for unknown
 * addresses (`global-not-found.tsx`), which Next renders without a layout.
 */
export function SiteShell({ content, children }: { content: SiteContent; children: ReactNode }) {
  return (
    <html lang="de" className={`${calendas.variable} ${dmSans.variable}`}>
      <body className="bg-background font-sans text-foreground antialiased">
        <ContentProvider content={content}>
          {children}
          {/* The wordmark and the footer, the same on every page. */}
          <SiteBrand />
          <SiteFooter />
          {/* The mouse cursor, a dot, on every page. */}
          <CursorDot />
        </ContentProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { SceneCanvasLoader } from "@/components/canvas/SceneCanvasLoader";
import { CursorDot } from "@/components/cursor/CursorDot";
import { SiteBrand } from "@/components/nav/SiteBrand";
import { SiteFooter } from "@/components/nav/SiteFooter";
import { getSiteContent } from "@/content";
import { ContentProvider } from "@/content/ContentProvider";
import { calendas } from "@/fonts/calendas";
import { dmSans } from "@/fonts/dmSans";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getSiteContent();
  return { title: site.metadata.title, description: site.metadata.description };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const content = await getSiteContent();
  return (
    <html lang="de" className={`${calendas.variable} ${dmSans.variable}`}>
      <body className="bg-background font-sans text-foreground antialiased">
        <ContentProvider content={content}>
          {/* Persistent 3D background; survives route changes. */}
          <SceneCanvasLoader />
          <main className="relative z-10">{children}</main>
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

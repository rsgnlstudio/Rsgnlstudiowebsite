import type { Metadata } from "next";
import { SceneCanvasLoader } from "@/components/canvas/SceneCanvasLoader";
import { CursorDot } from "@/components/cursor/CursorDot";
import { SiteBrand } from "@/components/nav/SiteBrand";
import { SiteFooter } from "@/components/nav/SiteFooter";
import { calendas } from "@/fonts/calendas";
import { dmSans } from "@/fonts/dmSans";
import "./globals.css";

export const metadata: Metadata = {
  title: "RSGNL Studio",
  description: "RSGNL Studio",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${calendas.variable} ${dmSans.variable}`}>
      <body className="bg-background font-sans text-foreground antialiased">
        {/* Persistent 3D background; survives route changes. */}
        <SceneCanvasLoader />
        <main className="relative z-10">{children}</main>
        {/* The wordmark and the footer, the same on every page. */}
        <SiteBrand />
        <SiteFooter />
        {/* The mouse cursor, a dot, on every page. */}
        <CursorDot />
      </body>
    </html>
  );
}

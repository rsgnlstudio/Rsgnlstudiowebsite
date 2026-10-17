import type { Metadata } from "next";
import { SceneCanvasLoader } from "@/components/canvas/SceneCanvasLoader";
import { SiteShell } from "@/components/layout/SiteShell";
import { getSiteContent } from "@/content";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getSiteContent();
  return { title: site.metadata.title, description: site.metadata.description };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const content = await getSiteContent();
  return (
    <SiteShell content={content}>
      {/* Persistent 3D background; survives route changes. */}
      <SceneCanvasLoader />
      <main className="relative z-10">{children}</main>
    </SiteShell>
  );
}

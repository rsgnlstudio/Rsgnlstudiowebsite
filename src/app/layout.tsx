import type { Metadata } from "next";
import { SceneCanvasLoader } from "@/components/canvas/SceneCanvasLoader";
import { calendas } from "@/fonts/calendas";
import "./globals.css";

export const metadata: Metadata = {
  title: "RSGNL Studio",
  description: "RSGNL Studio",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={calendas.variable}>
      <body className="bg-background font-sans text-foreground antialiased">
        {/* Persistent 3D background; survives route changes. */}
        <SceneCanvasLoader />
        <main className="relative z-10">{children}</main>
      </body>
    </html>
  );
}

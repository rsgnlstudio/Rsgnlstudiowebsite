import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/SiteShell";
import { Icon } from "@/components/ui/Icon";
import { TextLink } from "@/components/ui/TextLink";
import { Heading } from "@/components/ui/Typography";
import { getSiteContent } from "@/content";
import "./(site)/globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { ui } = await getSiteContent();
  return { title: ui.notFound.metaTitle };
}

/**
 * The page for an address that doesn't exist. The site has two root layouts
 * (the site and the Studio), so Next renders this without either
 * (`experimental.globalNotFound`); it brings the site's shell itself and
 * looks like the imprint, without the scene.
 */
export default async function GlobalNotFound() {
  const content = await getSiteContent();
  const { notFound } = content.ui;
  return (
    <SiteShell content={content}>
      <main className="relative z-10 min-h-dvh bg-on-night text-on-day">
        <article className="mx-auto max-w-2xl px-gutter py-section">
          <TextLink href="/" variant="subtle" className="group inline-flex items-center gap-1.5 text-base">
            <Icon icon={ArrowLeft} className="transition-transform duration-700 ease-smooth group-hover:-translate-x-0.5" />
            {notFound.home}
          </TextLink>
          <Heading as="h1" size="display" className="mt-12">
            {notFound.title}
          </Heading>
          <p className="mt-6 max-w-prose text-lg">{notFound.text}</p>
        </article>
      </main>
    </SiteShell>
  );
}

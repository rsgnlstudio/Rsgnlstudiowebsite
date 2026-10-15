import { ArrowLeft } from "lucide-react";
import { ViewTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { RichText } from "@/components/ui/RichText";
import { TextLink } from "@/components/ui/TextLink";
import { Heading } from "@/components/ui/Typography";
import { PAGE_IN, PAGE_OUT } from "@/config/navigation";
import type { LegalPage as LegalPageDoc } from "@/content/schema";

/**
 * A legal page (the imprint): a title and sections, in the project
 * overlay's colors. It slides in from the right like the overlay
 * (`page-slide` in globals.css). The canvas stays hidden (no scene mode).
 */
export function LegalPage({ page, back }: { page: LegalPageDoc; back: string }) {
  return (
    <ViewTransition
      enter={{ [PAGE_IN]: "page-slide", default: "none" }}
      exit={{ [PAGE_OUT]: "page-slide", default: "none" }}
      default="none"
    >
      <div className="min-h-dvh bg-on-night text-on-day">
        <article className="mx-auto max-w-2xl px-gutter py-section">
          <TextLink href="/" transitionTypes={[PAGE_OUT]} variant="subtle" className="group inline-flex items-center gap-1.5 text-base">
            <Icon icon={ArrowLeft} className="transition-transform duration-700 ease-smooth group-hover:-translate-x-0.5" />
            {back}
          </TextLink>

          <Heading as="h1" size="display" className="mt-12">
            {page.title}
          </Heading>

          {page.sections.map((section, i) => (
            <section key={section.heading} className={i === 0 ? "mt-16" : "mt-12"}>
              <Heading size="heading">{section.heading}</Heading>
              {section.address ? (
                <address className="mt-4 text-base not-italic">
                  <RichText text={section.body} />
                </address>
              ) : (
                <p className={`mt-4 text-base ${section.muted ? "opacity-70" : ""}`}>
                  <RichText text={section.body} />
                </p>
              )}
            </section>
          ))}
        </article>
      </div>
    </ViewTransition>
  );
}

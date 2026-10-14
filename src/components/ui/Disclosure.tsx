import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

/**
 * A `<details>` that opens softly.
 * - `faq`: a question with a chevron, opening its answer (`faq-item` in globals.css).
 * - `more`: a quiet "read more" line (e.g. the research behind a service).
 * Named groups: the dialog around a panel is a `group` and open too.
 */
export function Disclosure({
  summary,
  variant,
  className = "",
  children,
}: {
  summary: ReactNode;
  variant: "faq" | "more";
  className?: string;
  children: ReactNode;
}) {
  if (variant === "more") {
    return (
      <details className={`group/details ${className}`}>
        <summary className="cursor-pointer text-body opacity-60 transition-opacity duration-700 ease-smooth hover:opacity-90">
          {summary}
        </summary>
        {children}
      </details>
    );
  }
  return (
    <details className={`group/faq faq-item border-b border-current/10 pb-3 ${className}`}>
      <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-2 text-body transition-opacity duration-700 ease-smooth hover:opacity-80 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-current [&::-webkit-details-marker]:hidden">
        {summary}
        <Icon
          icon={ChevronDown}
          className="mt-[0.2em] shrink-0 opacity-70 transition-transform duration-700 ease-reveal group-open/faq:rotate-180"
        />
      </summary>
      {children}
    </details>
  );
}

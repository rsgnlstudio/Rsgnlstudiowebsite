import type { ReactNode } from "react";
import { RichText } from "@/components/ui/RichText";

/** The small line above a heading, e.g. "Leistung". */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="font-display text-body italic opacity-60">{children}</p>;
}

const HEADING_SIZES = {
  /** A page's title (the imprint). */
  display: "text-display",
  /** A panel's or overlay's title: a heading on small screens, display from md. */
  title: "text-heading md:text-display",
  heading: "text-heading",
  lead: "text-lead",
} as const;

/** A heading in the display face. `className` adds placement and measure only. */
export function Heading({
  as: Tag = "h2",
  size,
  italic,
  id,
  className = "",
  children,
}: {
  as?: "h1" | "h2" | "h3";
  size: keyof typeof HEADING_SIZES;
  italic?: boolean;
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag id={id} className={`font-display ${HEADING_SIZES[size]} ${italic ? "italic" : ""} ${className}`}>
      {children}
    </Tag>
  );
}

/** Two to three sentences under a heading; `detail` is the plain second line, smaller and quieter. */
export function Intro({ text, detail }: { text?: string | null; detail?: string }) {
  return (
    <div className="mt-5 max-w-prose">
      {text && (
        <p className="text-body opacity-85">
          <RichText text={text} />
        </p>
      )}
      {detail && <p className="mt-1 text-body italic opacity-55">{detail}</p>}
    </div>
  );
}

/** A content block with its subheading: `text` from the content, or `children` for lists. */
export function Block({ title, text, children }: { title: string; text?: string; children?: ReactNode }) {
  return (
    <section className="mt-10 max-w-prose">
      <h3 className="font-display text-lead">{title}</h3>
      <div className="mt-3 text-body opacity-90">{text ? <RichText text={text} /> : children}</div>
    </section>
  );
}

/** A highlighted passage (e.g. an entry format, or the subsidy): set apart by its title's color, not by a box. */
export function Highlight({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="mt-10 max-w-prose">
      <p className="font-display text-lead italic text-city-light">{title}</p>
      <div className="mt-1 text-body opacity-90">{children}</div>
    </aside>
  );
}

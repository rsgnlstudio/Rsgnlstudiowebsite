import type { ReactNode } from "react";
import { RichText } from "@/components/ui/RichText";

/** The small line above a heading, e.g. "Leistung". */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-sm opacity-60">{children}</p>;
}

const HEADING_SIZES = {
  /** A page's title (the imprint). */
  display: "text-4xl md:text-5xl",
  /** The day overlay's title. */
  title: "text-3xl md:text-4xl",
  /** A night panel's title. */
  panel: "text-3xl",
  /** A section within a page or panel (an imprint section, a step of a path). */
  heading: "text-2xl",
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

/** Two to three sentences under a heading; `detail` is the plain second line, quieter. */
export function Intro({ text, detail }: { text?: string | null; detail?: string }) {
  return (
    <div className="mt-5 max-w-prose">
      {text && (
        <p className="text-lg opacity-90">
          <RichText text={text} />
        </p>
      )}
      {detail && <p className="mt-2 text-base opacity-70">{detail}</p>}
    </div>
  );
}

/** A content block with its subheading: `text` from the content, or `children` for lists. */
export function Block({ title, text, children }: { title: string; text?: string; children?: ReactNode }) {
  return (
    <section className="mt-10 max-w-prose">
      <h3 className="text-base font-medium">{title}</h3>
      <div className="mt-2 text-base opacity-85">{text ? <RichText text={text} /> : children}</div>
    </section>
  );
}

/** A highlighted passage (e.g. an entry format, or the subsidy): set apart by its title's color, not by a box. */
export function Highlight({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="mt-10 max-w-prose">
      <p className="text-base font-medium text-city-light">{title}</p>
      <div className="mt-2 text-base opacity-85">{children}</div>
    </aside>
  );
}

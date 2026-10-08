import type { ReactNode } from "react";

interface SectionProps {
  /** Must match an id in src/config/sections.ts. */
  id: string;
  children?: ReactNode;
}

/** A scroll section; its id links it to a camera keyframe and night target. */
export function Section({ id, children }: SectionProps) {
  return (
    <section id={id} className="relative min-h-screen">
      {children}
    </section>
  );
}

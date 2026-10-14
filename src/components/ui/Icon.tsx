import type { LucideIcon } from "lucide-react";

const SIZES = { sm: "size-4", md: "size-[1.125rem]" } as const;

/** A lucide icon at the site's sizes and stroke, hidden from screen readers. `className` adds placement and state only. */
export function Icon({ icon: Glyph, size = "md", className = "" }: { icon: LucideIcon; size?: keyof typeof SIZES; className?: string }) {
  return <Glyph aria-hidden strokeWidth={1.5} className={`${SIZES[size]} ${className}`} />;
}

import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

/**
 * How a link set as text looks.
 * - `underline`: in running text and panels; the underline darkens on hover.
 * - `hover`: a list of links (the services); underlined only on hover.
 * - `quiet`: small links over the scene (the footer); full strength on hover.
 * - `subtle`: a quiet way back (the imprint's "Zurück").
 */
export type TextLinkVariant = "underline" | "hover" | "quiet" | "subtle";

const BASE = "cursor-pointer focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-current";
const VARIANTS: Record<TextLinkVariant, string> = {
  underline:
    "underline decoration-current/30 underline-offset-4 transition-[text-decoration-color] duration-700 ease-smooth hover:decoration-current",
  hover:
    "underline decoration-transparent underline-offset-4 transition-[text-decoration-color] duration-700 ease-smooth hover:decoration-current/60",
  quiet: "opacity-60 transition-opacity duration-700 ease-smooth hover:opacity-100",
  subtle: "opacity-55 transition-opacity duration-700 ease-smooth hover:opacity-80",
};

export const textLinkClass = (variant: TextLinkVariant = "underline") => `${BASE} ${VARIANTS[variant]}`;

/** A text link (`next/link`; also for `mailto:` and `tel:`). `className` adds placement and state only. */
export function TextLink({ variant, className = "", ...props }: ComponentProps<typeof Link> & { variant?: TextLinkVariant }) {
  return <Link className={`${textLinkClass(variant)} ${className}`} {...props} />;
}

/** A button set as a text link (e.g. opening a panel). */
export function TextButton({
  variant,
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: TextLinkVariant }) {
  return <button type={type} className={`${textLinkClass(variant)} ${className}`} {...props} />;
}

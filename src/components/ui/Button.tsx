import type { AnchorHTMLAttributes, ButtonHTMLAttributes, Ref } from "react";

/**
 * How a button looks. Every button carries the navigation's label size
 * (`text-sm`), whatever it does.
 * - `primary`: the night's call to action, filled with the city light (no glow).
 * - `solid`: filled with the light text color, e.g. the entry screen's first choice.
 * - `outline`: a frosted outline over the scene, e.g. the second choice or "skip".
 * - `ghost`: a quiet label, e.g. the navigation's items; full strength when pressed.
 * - `glass`: a frosted round surface for icon buttons; the caller sets its fill.
 */
export type ButtonVariant = "primary" | "solid" | "outline" | "ghost" | "glass";

/**
 * - `sm`: the navigation's items.
 * - `md`: the default, a little wider from `md` up.
 * - `icon`, `icon-lg`: round icon buttons, as tall as the wordmark below and from `md` up.
 */
export type ButtonSize = "sm" | "md" | "icon" | "icon-lg";

export interface ButtonStyle {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Fills the width of its container. */
  block?: boolean;
  /** Where the label sits when the button is wider than it (default centre). */
  align?: "center" | "start";
}

// Every variant has a border (transparent where it shows none), so all are the same height
// (the padding gives up the border's pixel, keeping the navigation pill as tall as the sound toggle).
const BASE =
  "cursor-pointer rounded-full border text-sm duration-700 ease-smooth focus-visible:outline-1 focus-visible:outline-offset-2";

// Only `glass` transitions its color, because it sets its own (crossing over
// with the scene). The others inherit theirs: transitioning an inherited
// color restarts on every frame while the parent's color crosses over (the
// Day/Night switch), and the labels flicker through the whole switch.
// `glass` leaves opacity alone: its owners fade it with gsap (`useReveal`
// writes opacity inline every frame), and a CSS transition on it, stretched
// to the color crossover's duration, would drag every fade.
const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "transition-[opacity,background-color] border-transparent bg-city-light text-on-day hover:opacity-85 focus-visible:outline-city-light",
  solid: "transition-[opacity,background-color] border-transparent bg-on-night text-on-day hover:opacity-85 focus-visible:outline-current",
  outline: "transition-[opacity,background-color] border-current/25 bg-on-day/30 backdrop-blur-md hover:bg-on-day/50 focus-visible:outline-current",
  ghost: "transition-[opacity,background-color] border-transparent opacity-55 hover:opacity-80 aria-pressed:opacity-100 focus-visible:outline-current",
  glass: "transition-[color,background-color,border-color] border-current/10 backdrop-blur-md focus-visible:outline-current",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "flex items-center gap-2 px-4 py-[calc(0.75rem-1px)]",
  md: "flex items-center gap-2 px-4 py-[calc(0.75rem-1px)] md:px-6",
  icon: "grid size-11.5 shrink-0 place-items-center",
  "icon-lg": "grid size-14.5 shrink-0 place-items-center",
};

// An icon looks lighter than text at the same distance from the edge, so the
// side with an icon gets a quarter less padding (`sm` and `md`, see `SIZES`)
// and the button looks evenly padded. Not for `block` buttons: their label is
// centred or lines up with the rows around it. The label must be an element
// (e.g. a `<span>`): text nodes don't count as children, so a lone icon next
// to bare text would be both first and last child and trim both sides.
const ICON_SIDE: Partial<Record<ButtonSize, string>> = {
  sm: "has-[>svg:first-child]:pl-3 has-[>svg:last-child]:pr-3",
  md: "has-[>svg:first-child]:pl-3 has-[>svg:last-child]:pr-3 md:has-[>svg:first-child]:pl-4.5 md:has-[>svg:last-child]:pr-4.5",
};

/** The classes of a button; for the rare element that can't be `Button` or `ButtonLink`. */
export function buttonClass({ variant = "ghost", size = "md", block, align = "center" }: ButtonStyle = {}) {
  const icon = size.startsWith("icon");
  // Icon sizes set their own width (`size-*`); `w-max` would override it.
  const width = block ? "w-full" : icon ? "" : "w-max";
  const justify = icon ? "" : align === "start" ? "justify-start text-left" : "justify-center";
  const iconSide = block ? "" : (ICON_SIDE[size] ?? "");
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${iconSide} ${width} ${justify}`;
}

type ButtonProps = ButtonStyle & ButtonHTMLAttributes<HTMLButtonElement> & { ref?: Ref<HTMLButtonElement> };

/** The one button of the site. `className` adds placement and state, never size or color. */
export function Button({ variant, size, block, align, className = "", type = "button", ...props }: ButtonProps) {
  return <button type={type} className={`${buttonClass({ variant, size, block, align })} ${className}`} {...props} />;
}

type ButtonLinkProps = ButtonStyle & AnchorHTMLAttributes<HTMLAnchorElement>;

/** A link that looks like a button (e.g. a mailto). */
export function ButtonLink({ variant, size, block, align, className = "", ...props }: ButtonLinkProps) {
  return <a className={`${buttonClass({ variant, size, block, align })} ${className}`} {...props} />;
}

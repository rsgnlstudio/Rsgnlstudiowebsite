import type { HTMLAttributes } from "react";

/**
 * The frosted card of a preview (a hovered bed's label, a map place's
 * preview, the touch card). Tones: `day` over the day, `dusk` the day's
 * label by night, `night` over the map, `night-strong` the touch card.
 */
export type PreviewTone = "day" | "dusk" | "night" | "night-strong";

const TONES: Record<PreviewTone, string> = {
  day: "bg-on-night/75 text-on-day",
  dusk: "bg-on-day/75 text-on-night",
  night: "bg-panel-night/75 text-on-night",
  "night-strong": "bg-panel-night/90 text-on-night",
};

export const previewSurface = (tone: PreviewTone) =>
  `rounded-2xl border border-current/10 px-5 py-4 backdrop-blur-md ${TONES[tone]}`;

/** A preview card; `className` adds placement, width and transitions. */
export function PreviewCard({ tone, className = "", ...props }: HTMLAttributes<HTMLDivElement> & { tone: PreviewTone }) {
  return <div className={`${previewSurface(tone)} ${className}`} {...props} />;
}

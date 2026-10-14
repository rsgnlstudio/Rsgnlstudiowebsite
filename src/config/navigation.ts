import type { NightPanel } from "@/config/nightMap";
import type { UiLabels } from "@/content/schema";

/** The imprint page. */
export const IMPRINT_HREF = "/imprint";

/**
 * View transition types for links between the home page and a sub-page
 * (`transitionTypes` on `<Link>`). The sub-page slides in from the right
 * over the home page like the project overlay, and slides back out; the
 * animations live in `globals.css`.
 */
export const PAGE_IN = "page-in";
export const PAGE_OUT = "page-out";

/**
 * The consulting site's sections, each opening the night panel: in the top
 * navigation from lg up, the footer from md to lg, the mobile menu below md.
 * Labels are `ui.nav[key]`.
 */
export const NIGHT_SECTIONS = [
  { key: "services", panel: { kind: "services" } },
  { key: "process", panel: { kind: "process" } },
  { key: "about", panel: { kind: "about" } },
] as const satisfies readonly { key: keyof UiLabels["nav"]; panel: NightPanel }[];

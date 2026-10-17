import type { UiLabels } from "@/content/schema";

type Labels = Record<string, unknown>;

/**
 * The UI labels that only show on the night map. The Studio keeps them in
 * their own document in the night group (`nightLabels`), `uiLabels` the
 * ones shown by day too; the site reads both as one `ui`. A group named
 * here moves whole, a list moves only those labels of the group.
 */
export const NIGHT_LABELS = {
  nav: ["services", "process", "about", "contact", "contactShort"],
  footer: ["faq"],
  map: true,
  path: true,
  categories: true,
  blocks: true,
  related: true,
} as const satisfies { [K in keyof UiLabels]?: true | readonly (keyof UiLabels[K])[] };

const pick = (group: object, keys: readonly string[], keep: boolean) =>
  Object.fromEntries(Object.entries(group).filter(([k]) => keys.includes(k) === keep));

/** `ui` as the two documents' fields: `[uiLabels, nightLabels]`. */
export function splitLabels(ui: UiLabels): [Labels, Labels] {
  const shared: Labels = {};
  const night: Labels = {};
  for (const [key, value] of Object.entries(ui)) {
    const rule = (NIGHT_LABELS as Record<string, true | readonly string[]>)[key];
    if (rule === true) night[key] = value;
    else if (rule) {
      shared[key] = pick(value, rule, false);
      night[key] = pick(value, rule, true);
    } else shared[key] = value;
  }
  return [shared, night];
}

/** The two documents as one `ui`; a group split between them is joined. */
export function joinLabels(shared: Labels, night: Labels): UiLabels {
  const ui: Labels = { ...shared };
  for (const [key, value] of Object.entries(night)) {
    const both = ui[key] && typeof ui[key] === "object" && value && typeof value === "object";
    ui[key] = both ? { ...(ui[key] as object), ...value } : value;
  }
  return ui as unknown as UiLabels;
}

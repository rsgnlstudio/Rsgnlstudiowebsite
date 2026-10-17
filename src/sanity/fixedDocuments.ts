import { PROJECT_BEDS } from "@/config/flowers";
import { AREAS, CITY_LIGHTS, CLEARINGS, ROADS } from "@/config/nightMap";

/**
 * Every Sanity document of the site. All of them are fixed: the Studio can
 * edit them but never create, delete or duplicate one, because each stands
 * for one place in the layout (src/config) or one part of the site. Lists
 * Simone may grow live as arrays inside these documents.
 */

/** A singleton: one document; `key` is its field in SITE_QUERY's result. */
export interface Singleton {
  _id: string;
  type: string;
  key: string;
  title: string;
  /** Images inside it, dereferenced by the query. */
  images?: string;
}

export const SINGLETONS = [
  { _id: "siteSettings", type: "siteSettings", key: "site", title: "Site settings" },
  { _id: "uiLabels", type: "uiLabels", key: "ui", title: "UI labels" },
  { _id: "dayStudio", type: "dayStudio", key: "studio", title: "Entry & hints" },
  { _id: "nightIntro", type: "nightIntro", key: "intro", title: "Intro" },
  { _id: "servicesOverview", type: "servicesOverview", key: "servicesOverview", title: "Services overview" },
  { _id: "results", type: "results", key: "results", title: "Results" },
  { _id: "process", type: "process", key: "process", title: "Process" },
  { _id: "about", type: "about", key: "about", title: "About", images: "portrait" },
  { _id: "testimonials", type: "testimonials", key: "testimonials", title: "Testimonials" },
  { _id: "bafa", type: "bafa", key: "bafa", title: "BAFA subsidy" },
  { _id: "faq", type: "faq", key: "faq", title: "FAQ" },
  { _id: "contact", type: "contact", key: "contact", title: "Contact" },
  { _id: "legal-imprint", type: "legalPage", key: "imprint", title: "Imprint" },
] as const satisfies readonly Singleton[];

export type SingletonKey = (typeof SINGLETONS)[number]["key"];

/** Document types with one document per id in src/config, in config order. */
export const FIXED_ITEM_TYPES = ["project", "area", "challenge", "service", "road"] as const;
export type FixedItemType = (typeof FIXED_ITEM_TYPES)[number];

const CONFIG_IDS: Record<FixedItemType, readonly string[]> = {
  project: PROJECT_BEDS.map((b) => b.id),
  area: AREAS.map((a) => a.id),
  challenge: CLEARINGS.map((c) => c.id),
  service: CITY_LIGHTS.map((s) => s.id),
  road: ROADS.map((r) => r.id),
};

export interface FixedItem {
  _id: string;
  type: FixedItemType;
  configId: string;
}

/** The documents of a fixed item type, in config order. */
export function fixedItems(type: FixedItemType): FixedItem[] {
  return CONFIG_IDS[type].map((configId) => ({ _id: `${type}-${configId}`, type, configId }));
}

/** Every fixed document type, for the Studio's locked actions. */
export const FIXED_TYPES: readonly string[] = [...SINGLETONS.map((s) => s.type), ...FIXED_ITEM_TYPES];

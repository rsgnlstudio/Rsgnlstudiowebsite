/**
 * The night map: the consulting site, laid out over the night world as seen
 * from the top view, after the briefing's sketch. Mountains across the top,
 * the woods with seven clearings on the left, the city with six lights on
 * the right, the meadow (the day meadow with its flower beds) at the bottom.
 * Every path runs from a clearing through two lights of the city, up to the
 * summit and on to the goal at the edge of the map.
 *
 * Positions are ground points (x, d) in metres, as in painterly/landscape.ts:
 * x to the right, d = -z, the distance into the field, which runs up the
 * screen in the top view. The copy for every place lives in
 * src/content/consulting.ts, keyed by the same ids.
 */

export type MapPoint = readonly [x: number, d: number];

/**
 * Ground rectangle the night camera fits to the screen (with the panel
 * closed), with room at the top and bottom for the navigation and the footer.
 */
export const MAP_FRAME = { minX: -80, maxX: 80, minD: -12, maxD: 104 } as const;

/**
 * Height of the screen, in metres of ground, that the camera shows around
 * the focus while the panel is open (the map stays visible beside it).
 */
export const FOCUS_SPAN = 80;

/** The three areas of the woods, each with two clearings (plus one at the edge). */
export const AREAS = [
  { id: "team", position: [-48, 78] },
  { id: "business", position: [-50, 54] },
  { id: "market", position: [-49, 30] },
] as const satisfies readonly { id: string; position: MapPoint }[];
export type AreaId = (typeof AREAS)[number]["id"];

/** Radius of a clearing in the woods, in metres; trees keep this far away. */
export const CLEARING_RADIUS = 5.5;

/** The clearings: the challenges a visitor may find themselves in. */
export const CLEARINGS = [
  { id: "owner", area: "team", position: [-58, 64] },
  { id: "team", area: "team", position: [-38, 70] },
  { id: "structures", area: "business", position: [-60, 40] },
  { id: "scaling", area: "business", position: [-40, 46] },
  { id: "visibility", area: "market", position: [-58, 16] },
  { id: "ideation", area: "market", position: [-40, 22] },
  // At the forest edge, by the stream and the meadow.
  { id: "clarify", area: null, position: [-27, 6] },
] as const satisfies readonly { id: string; area: AreaId | null; position: MapPoint }[];
export type ChallengeId = (typeof CLEARINGS)[number]["id"];

/** The lights of the city: four big ones (core services) and two small ones. */
export const CITY_LIGHTS = [
  { id: "strategy", size: "big", position: [52, 38] },
  { id: "leadership", size: "big", position: [42, 20] },
  { id: "bizdev", size: "big", position: [62, 26] },
  { id: "innovation", size: "big", position: [70, 10] },
  { id: "brand", size: "small", position: [72, 44] },
  { id: "change", size: "small", position: [42, 54] },
] as const satisfies readonly { id: string; size: "big" | "small"; position: MapPoint }[];
export type ServiceId = (typeof CITY_LIGHTS)[number]["id"];

/** Middle and extent of the city's street grid (an ellipse, turned a little). */
export const CITY_AREA = { x: 57, d: 30, rx: 23, rd: 31, turn: 0.2 } as const;

/**
 * The roads between the lights: why two services belong together. Each but
 * the last belongs to exactly one path, the one that runs along it.
 */
export const ROADS = [
  { id: "leadership-strategy", services: ["leadership", "strategy"] },
  { id: "leadership-change", services: ["leadership", "change"] },
  { id: "strategy-change", services: ["strategy", "change"] },
  { id: "strategy-bizdev", services: ["strategy", "bizdev"] },
  { id: "bizdev-brand", services: ["bizdev", "brand"] },
  { id: "innovation-brand", services: ["innovation", "brand"] },
  // Only for exploring: no path runs along it, and it has no place of its own.
  { id: "innovation-bizdev", services: ["innovation", "bizdev"] },
] as const satisfies readonly { id: string; services: readonly [ServiceId, ServiceId] }[];
export type RoadId = (typeof ROADS)[number]["id"];

/** The summit (results and the view from up there) and the goal (contact). */
export const SUMMIT: MapPoint = [44, 86];
export const GOAL: MapPoint = [70, 88];
/** Where every path starts its climb, above the city. */
export const MOUNTAIN_FOOT: MapPoint = [48, 66];
/** From the foot up to the summit, then on to the goal. */
export const SUMMIT_TRAIL: readonly MapPoint[] = [[45, 76]];
export const GOAL_TRAIL: readonly MapPoint[] = [[58, 91]];

/** The meadow: about Simone. The nightingale lives here by day. */
export const MEADOW: MapPoint = [-3, 8];

/**
 * The paths, one per clearing. A path runs from its clearing along `trail`
 * to its first service, along the road to its second, then along `climb` to
 * the foot of the mountains, up to the summit and on to the goal. The path
 * from the forest edge runs straight to the goal (`trail` only). `bafa`: the
 * consulting on this path can be subsidised (the lantern shows on it).
 */
export const PATHS = [
  {
    id: "owner",
    trail: [[-44, 60], [-26, 56], [-6, 54], [14, 46], [30, 30]],
    services: ["leadership", "strategy"],
    climb: [[50, 52]],
    bafa: true,
  },
  {
    id: "team",
    trail: [[-24, 64], [-6, 58], [14, 48], [30, 32]],
    services: ["leadership", "change"],
    climb: [],
    bafa: true,
  },
  {
    id: "structures",
    trail: [[-46, 38], [-26, 38], [-7, 40], [12, 40], [32, 39]],
    services: ["strategy", "change"],
    climb: [],
    bafa: true,
  },
  {
    id: "scaling",
    trail: [[-24, 44], [-6, 44], [14, 41], [32, 39]],
    services: ["strategy", "bizdev"],
    climb: [[64, 42], [58, 56]],
    bafa: true,
  },
  {
    id: "visibility",
    trail: [[-42, 14], [-24, 16], [-12, 18], [6, 20], [26, 14], [46, 10]],
    services: ["bizdev", "brand"],
    climb: [[64, 58]],
    bafa: true,
  },
  {
    id: "ideation",
    trail: [[-26, 24], [-12, 25], [6, 26], [24, 8], [48, 0]],
    services: ["innovation", "brand"],
    climb: [[64, 58]],
    bafa: true,
  },
  {
    id: "clarify",
    trail: [[-14, 10], [4, 28], [22, 54], [40, 74], [56, 84]],
    services: null,
    climb: [],
    bafa: false,
  },
] as const satisfies readonly {
  id: ChallengeId;
  trail: readonly MapPoint[];
  services: readonly [ServiceId, ServiceId] | null;
  climb: readonly MapPoint[];
  bafa: boolean;
}[];

/**
 * The BAFA subsidy runs until the end of 2026. Set to false on 1.1.2027:
 * that takes the lantern and every hint at it off the site at once.
 */
export const BAFA_ENABLED = true;

/**
 * Testimonials fly as fireflies over the map, each around its own home
 * (x, d) on a slow loop of the given radius.
 */
export const TESTIMONIAL_HOMES: readonly { position: MapPoint; radius: number }[] = [
  { position: [12, 36], radius: 9 },
  { position: [26, 64], radius: 8 },
  { position: [-14, 76], radius: 7 },
];

/** What the night panel shows. */
export type NightPanel =
  | { kind: "path"; id: ChallengeId }
  | { kind: "service"; id: ServiceId }
  | { kind: "testimonial"; index: number }
  | { kind: "results" | "contact" | "about" | "bafa" | "services" | "process" | "faq" };

/** Kinds of places on the map. */
export type PlaceKind = "clearing" | "service" | "summit" | "goal" | "meadow" | "lantern" | "testimonial";

/**
 * Every place a visitor can hover and open, in one list. Its index is the
 * place's slot in the canvas (glow, screen position) and in the store
 * (`hoveredPlace`). The lantern and the testimonials move: their positions
 * are worked out every frame (painterly/nightMap.ts).
 */
export interface Place {
  id: string;
  kind: PlaceKind;
  /** Fixed ground point; null for the lantern, which stands on the active path. */
  position: MapPoint | null;
  /** The panel it opens. */
  panel: NightPanel;
}

export const PLACES: readonly Place[] = [
  ...CLEARINGS.map((c) => ({
    id: `clearing:${c.id}`,
    kind: "clearing" as const,
    position: c.position,
    panel: { kind: "path" as const, id: c.id },
  })),
  ...CITY_LIGHTS.map((l) => ({
    id: `service:${l.id}`,
    kind: "service" as const,
    position: l.position,
    panel: { kind: "service" as const, id: l.id },
  })),
  { id: "summit", kind: "summit", position: SUMMIT, panel: { kind: "results" } },
  { id: "goal", kind: "goal", position: GOAL, panel: { kind: "contact" } },
  { id: "meadow", kind: "meadow", position: MEADOW, panel: { kind: "about" } },
  { id: "lantern", kind: "lantern", position: null, panel: { kind: "bafa" } },
  ...TESTIMONIAL_HOMES.map((home, index) => ({
    id: `testimonial:${index}`,
    kind: "testimonial" as const,
    position: home.position,
    panel: { kind: "testimonial" as const, index },
  })),
];

export const placeIndex = (id: string) => PLACES.findIndex((p) => p.id === id);
export const PATH_IDS = PATHS.map((p) => p.id);
export const pathIndex = (id: ChallengeId) => PATH_IDS.indexOf(id);

/** True if two panel states show the same thing. */
export function samePanel(a: NightPanel | null, b: NightPanel | null) {
  if (!a || !b || a.kind !== b.kind) return false;
  if ("id" in a && "id" in b) return a.id === b.id;
  if ("index" in a && "index" in b) return a.index === b.index;
  return true;
}

import { Vector3 } from "three";
import {
  BAFA_ENABLED,
  CITY_AREA,
  CITY_LIGHTS,
  CLEARINGS,
  type ChallengeId,
  GOAL,
  GOAL_TRAIL,
  MAP_FRAME,
  type MapPoint,
  MOUNTAIN_FOOT,
  type NightPanel,
  PATHS,
  PLACES,
  pathIndex,
  ROADS,
  type ServiceId,
  SUMMIT,
  SUMMIT_TRAIL,
  TESTIMONIAL_HOMES,
  FOCUS_SPAN,
} from "@/config/nightMap";
import { terrainHeight } from "./landscape";
import { mulberry32, valueNoise } from "./random";

/**
 * Shared geometry of the night map (src/config/nightMap.ts): the paths as
 * smooth curves, the dotted lines drawn on the map, where every place is
 * this frame, and where the camera and the light look while the panel is
 * open. Used by the map layers (NightMap), the nightingale, the camera and
 * the conifer layout (the woods leave the clearings and trails open).
 */

const serviceAt = new Map<ServiceId, MapPoint>(CITY_LIGHTS.map((l) => [l.id, l.position]));
const clearingAt = new Map<ChallengeId, MapPoint>(CLEARINGS.map((c) => [c.id, c.position]));
export const servicePosition = (id: ServiceId) => serviceAt.get(id)!;
export const clearingPosition = (id: ChallengeId) => clearingAt.get(id)!;

/** Height above the ground of the lines and lights drawn on the map. */
export const MAP_LIFT = 0.35;
/** World position of a map point, on the ground (plus `lift`). */
export function mapToWorld(out: Vector3, x: number, d: number, lift = MAP_LIFT) {
  return out.set(x, terrainHeight(x, -d) + lift, -d);
}

/** A path as a smooth curve through its points, sampled every half metre or so. */
export interface PathGeometry {
  id: ChallengeId;
  xs: Float32Array;
  ds: Float32Array;
  /** Arc length in metres at every sample. */
  arc: Float32Array;
  length: number;
  /**
   * Arc length at each step of the path, in the order the panel tells it:
   * the clearing, service A, the road (half way), service B, the summit and
   * the goal; or just the clearing and the goal.
   */
  stations: number[];
  /** Arc length of the stretch along the road between the two services. */
  road: [number, number] | null;
  services: readonly [ServiceId, ServiceId] | null;
  bafa: boolean;
}

/** Catmull-Rom through `points`, sampled about every `step` metres; also the arc at each point. */
function smoothCurve(points: readonly MapPoint[], step = 0.5) {
  const xs: number[] = [];
  const ds: number[] = [];
  const arc: number[] = [];
  const at: number[] = [];
  let length = 0;
  const push = (x: number, d: number) => {
    if (xs.length) length += Math.hypot(x - xs[xs.length - 1], d - ds[ds.length - 1]);
    xs.push(x);
    ds.push(d);
    arc.push(length);
  };
  const p = (i: number) => points[Math.min(Math.max(i, 0), points.length - 1)];
  push(points[0][0], points[0][1]);
  at.push(0);
  for (let i = 0; i < points.length - 1; i++) {
    const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const c = (a: number, b: number, e: number, f: number) =>
        0.5 * (2 * b + (-a + e) * t + (2 * a - 5 * b + 4 * e - f) * t2 + (-a + 3 * b - 3 * e + f) * t3);
      push(c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1]));
    }
    at.push(length);
  }
  return { xs: new Float32Array(xs), ds: new Float32Array(ds), arc: new Float32Array(arc), length, at };
}

function buildPath(spec: (typeof PATHS)[number]): PathGeometry {
  const start = clearingPosition(spec.id);
  if (!spec.services) {
    const curve = smoothCurve([start, ...spec.trail, GOAL]);
    return { id: spec.id, ...curve, stations: [0, curve.length], road: null, services: null, bafa: spec.bafa };
  }
  const [a, b] = spec.services;
  const route: MapPoint[] = [
    start,
    ...spec.trail,
    servicePosition(a),
    servicePosition(b),
    ...spec.climb,
    MOUNTAIN_FOOT,
    ...SUMMIT_TRAIL,
    SUMMIT,
    ...GOAL_TRAIL,
    GOAL,
  ];
  const curve = smoothCurve(route);
  const iA = 1 + spec.trail.length;
  const iSummit = route.indexOf(SUMMIT);
  const arcA = curve.at[iA];
  const arcB = curve.at[iA + 1];
  return {
    id: spec.id,
    ...curve,
    stations: [0, arcA, (arcA + arcB) / 2, arcB, curve.at[iSummit], curve.length],
    road: [arcA, arcB],
    services: spec.services,
    bafa: spec.bafa,
  };
}

/** Every path, in the order of PATHS. */
export const PATH_GEOMETRY: readonly PathGeometry[] = PATHS.map(buildPath);

/** The point at `arc` metres along a path (x, d). */
export function pointAtArc(path: PathGeometry, arc: number, out: [number, number] = [0, 0]) {
  const a = Math.min(Math.max(arc, 0), path.length);
  let lo = 0;
  let hi = path.arc.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (path.arc[mid] <= a) lo = mid;
    else hi = mid;
  }
  const span = path.arc[hi] - path.arc[lo];
  const f = span > 0 ? (a - path.arc[lo]) / span : 0;
  out[0] = path.xs[lo] + (path.xs[hi] - path.xs[lo]) * f;
  out[1] = path.ds[lo] + (path.ds[hi] - path.ds[lo]) * f;
  return out;
}

/** Arc length at a fractional step of a path (0 = its clearing). */
export function stationArc(path: PathGeometry, station: number) {
  const s = Math.min(Math.max(station, 0), path.stations.length - 1);
  const i = Math.min(Math.floor(s), path.stations.length - 2);
  const f = s - i;
  return path.stations[i] + (path.stations[i + 1] - path.stations[i]) * f;
}

/** Distance from (x, d) to the nearest trail through the woods, in metres (capped). */
export function distanceToTrail(x: number, d: number, cap = 10) {
  let best = cap;
  for (const path of PATH_GEOMETRY) {
    for (let i = 0; i < path.xs.length; i += 2) {
      const dx = path.xs[i] - x;
      const dd = path.ds[i] - d;
      if (Math.abs(dx) < best && Math.abs(dd) < best) best = Math.min(best, Math.hypot(dx, dd));
    }
  }
  return best;
}

/** Kinds of dots on the map, stored in MapLines' aInfo.x. */
export const LINE = { TRAIL: 0, ROAD: 1, STREET: 2, NODE: 3 } as const;

export interface MapLineData {
  position: number[];
  /** kind, path index (-1 = none), arc along that path in metres, seed. */
  info: number[];
}

const v = new Vector3();
function dot(out: MapLineData, x: number, d: number, kind: number, path: number, arc: number, seed: number) {
  mapToWorld(v, x, d);
  out.position.push(v.x, v.y, v.z);
  out.info.push(kind, path, arc, seed);
}

/** Dots every `spacing` metres along a path, leaving out the stretch along its road. */
function pathDots(out: MapLineData, rng: () => number, spacing: number) {
  const p: [number, number] = [0, 0];
  PATH_GEOMETRY.forEach((path, index) => {
    for (let arc = 0; arc <= path.length; arc += spacing) {
      if (path.road && arc > path.road[0] + 1.5 && arc < path.road[1] - 1.5) continue;
      pointAtArc(path, arc, p);
      dot(out, p[0], p[1], LINE.TRAIL, index, arc, rng());
    }
  });
}

/** The roads between the lights, each lit with the path that runs along it. */
function roadDots(out: MapLineData, rng: () => number, spacing: number) {
  for (const road of ROADS) {
    const [a, b] = road.services.map(servicePosition);
    const owner = PATH_GEOMETRY.findIndex(
      (p) => p.services && p.services[0] === road.services[0] && p.services[1] === road.services[1],
    );
    const path = owner >= 0 ? PATH_GEOMETRY[owner] : null;
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let s = 0; s <= length; s += spacing) {
      const t = s / length;
      const arc = path?.road ? path.road[0] + (path.road[1] - path.road[0]) * t : 0;
      dot(out, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, LINE.ROAD, owner, arc, rng());
    }
  }
}

/**
 * The city's street grid, turned by CITY_AREA.turn: (u, w) are metres along
 * its two axes from the middle of the city, streets run every CITY_SPACING
 * metres (give or take half a metre) and the grid reaches CITY_EXTENT out.
 */
export const CITY_SPACING = 4.6;
export const CITY_EXTENT = Math.max(CITY_AREA.rx, CITY_AREA.rd) * 1.2;
const cityCos = Math.cos(CITY_AREA.turn);
const citySin = Math.sin(CITY_AREA.turn);

/** Map point (x, d) of a point (u, w) of the city grid. */
export const cityToMap = (u: number, w: number): MapPoint => [
  CITY_AREA.x + u * cityCos - w * citySin,
  CITY_AREA.d + u * citySin + w * cityCos,
];

/** True if a point (u, w) of the city grid is built up: inside the city's ragged edge. */
export function inCity(u: number, w: number) {
  const [x, d] = cityToMap(u, w);
  const reach = Math.hypot((x - CITY_AREA.x) / CITY_AREA.rx, (d - CITY_AREA.d) / CITY_AREA.rd);
  return reach < 0.82 + 0.25 * valueNoise(x * 0.08, d * 0.08, 31);
}

/** The city's street grid: a turned grid with gaps and ragged ends, nodes at the crossings. */
function streetDots(out: MapLineData, rng: () => number) {
  const spacing = CITY_SPACING;
  const along = 0.7;
  const extent = CITY_EXTENT;
  for (const axis of [0, 1]) {
    for (let k = -Math.ceil(extent / spacing); k * spacing <= extent; k++) {
      const offset = k * spacing + (rng() - 0.5) * 0.8;
      const wobble = rng() * 10;
      for (let s = -extent; s <= extent; s += along) {
        const u = axis ? offset : s;
        const w = axis ? s : offset;
        if (!inCity(u, w)) continue;
        // Gaps: not every block is built up.
        if (valueNoise(s * 0.09 + wobble, offset * 0.3, 32 + axis) < 0.3) continue;
        const bend = Math.sin(s * 0.05 + wobble) * 0.6;
        const [x, d] = cityToMap(u + (axis ? bend : 0), w + (axis ? 0 : bend));
        dot(out, x, d, LINE.STREET, -1, 0, rng());
      }
    }
  }
  // Bright points at the crossings.
  for (let i = -Math.ceil(extent / spacing); i * spacing <= extent; i++) {
    for (let j = -Math.ceil(extent / spacing); j * spacing <= extent; j++) {
      const u = i * spacing;
      const w = j * spacing;
      if (!inCity(u, w) || rng() < 0.45) continue;
      const [x, d] = cityToMap(u, w);
      dot(out, x, d, LINE.NODE, -1, 0, rng());
    }
  }
}

/** Every dot drawn on the map, in one list (MapLines draws it in one call). */
export function buildMapLines(): MapLineData {
  const out: MapLineData = { position: [], info: [] };
  const rng = mulberry32(9090);
  pathDots(out, rng, 0.55);
  roadDots(out, rng, 0.45);
  streetDots(out, rng);
  return out;
}

/** Where every place is this frame, in world space (written by NightMap). */
export const placeWorld = PLACES.map(() => new Vector3());

const lanternPoint: [number, number] = [0, 0];
const lanternAhead: [number, number] = [0, 0];

/**
 * Updates the places that move: the testimonials drift on slow loops around
 * their homes, and the lantern stands just before the first service of the
 * active path, if that path can be subsidised. Returns whether the lantern
 * shows. Fixed places are set once, here too.
 */
export function updatePlaceWorld(time: number, activePath: ChallengeId | null) {
  let lantern = false;
  PLACES.forEach((place, i) => {
    const out = placeWorld[i];
    if (place.kind === "testimonial") {
      const index = Number(place.id.split(":")[1]);
      const home = TESTIMONIAL_HOMES[index];
      const a = time * 0.05 + index * 2.1;
      mapToWorld(
        out,
        home.position[0] + Math.cos(a) * home.radius,
        home.position[1] + Math.sin(a * 1.3 + index) * home.radius * 0.7,
        1.6,
      );
    } else if (place.kind === "lantern") {
      const path = activePath ? PATH_GEOMETRY[pathIndex(activePath)] : null;
      lantern = BAFA_ENABLED && !!path?.bafa && path.stations.length > 2;
      if (path && lantern) {
        // Beside the path, a few metres before its first service.
        const arc = path.stations[1] - 5;
        pointAtArc(path, arc, lanternPoint);
        pointAtArc(path, arc + 1, lanternAhead);
        const tx = lanternAhead[0] - lanternPoint[0];
        const td = lanternAhead[1] - lanternPoint[1];
        const n = Math.hypot(tx, td) || 1;
        mapToWorld(out, lanternPoint[0] - (td / n) * 2.6, lanternPoint[1] + (tx / n) * 2.6, 0.8);
      } else {
        // Nowhere, so the BAFA panel shows the whole map (panelFocus).
        out.set(0, 0, 0);
      }
    } else if (place.position) {
      mapToWorld(out, place.position[0], place.position[1]);
    }
  });
  return lantern;
}

/** Where the camera and the light look while the night panel is open. */
export interface MapFocus {
  x: number;
  d: number;
  /** Height of the screen in metres of ground; 0 = the whole map. */
  span: number;
}

const focusPoint: [number, number] = [0, 0];

/**
 * The focus for what the panel shows: the open place, or the point on the
 * active path the panel has been scrolled to (`pathStation`). Overviews (all
 * services, the process, the questions) show the whole map. Null when the
 * panel is closed.
 */
export function panelFocus(panel: NightPanel | null, pathStation: number): MapFocus | null {
  if (!panel) return null;
  const at = (index: number): MapFocus => {
    const p = placeWorld[index];
    return { x: p.x, d: -p.z, span: FOCUS_SPAN };
  };
  switch (panel.kind) {
    case "path": {
      const path = PATH_GEOMETRY[pathIndex(panel.id)];
      pointAtArc(path, stationArc(path, pathStation), focusPoint);
      return { x: focusPoint[0], d: focusPoint[1], span: FOCUS_SPAN };
    }
    case "service":
      return at(PLACES.findIndex((p) => p.id === `service:${panel.id}`));
    case "testimonial":
      return at(PLACES.findIndex((p) => p.id === `testimonial:${panel.index}`));
    case "results":
      return at(PLACES.findIndex((p) => p.kind === "summit"));
    case "contact":
      return at(PLACES.findIndex((p) => p.kind === "goal"));
    case "about":
      return at(PLACES.findIndex((p) => p.kind === "meadow"));
    case "bafa": {
      const lantern = PLACES.findIndex((p) => p.kind === "lantern");
      return placeWorld[lantern].lengthSq() > 0 ? at(lantern) : { x: 0, d: 45, span: 0 };
    }
    default:
      return { x: (MAP_FRAME.minX + MAP_FRAME.maxX) / 2, d: (MAP_FRAME.minD + MAP_FRAME.maxD) / 2, span: 0 };
  }
}

import { CITY_AREA, CITY_LIGHTS, type MapPoint, ROADS } from "@/config/nightMap";
import { CITY_EXTENT, CITY_SPACING, cityToMap, distanceToTrail, inCity, servicePosition } from "./nightMap";
import { mulberry32 } from "./random";

/** A building of the night city: a box standing in a block of the street grid. */
export interface Building {
  /** Middle of its footprint (map point). */
  x: number;
  d: number;
  /** Half its footprint along the grid's two axes (u, w), in metres. */
  hu: number;
  hw: number;
  height: number;
}

/** Room kept free on each side of a street, in metres (the streets wobble). */
const STREET_MARGIN = 0.9;
/** Room kept free around a city light, by size. */
const LIGHT_ROOM = { big: 4.5, small: 3.5 } as const;

function distanceToSegment(x: number, d: number, a: MapPoint, b: MapPoint) {
  const ex = b[0] - a[0];
  const ed = b[1] - a[1];
  const t = Math.min(Math.max(((x - a[0]) * ex + (d - a[1]) * ed) / (ex * ex + ed * ed), 0), 1);
  return Math.hypot(x - a[0] - ex * t, d - a[1] - ed * t);
}

/** True if a footprint of radius `r` at (x, d) leaves the lights, the roads and the paths free. */
function clear(x: number, d: number, r: number) {
  for (const light of CITY_LIGHTS) {
    if (Math.hypot(x - light.position[0], d - light.position[1]) < r + LIGHT_ROOM[light.size]) return false;
  }
  for (const road of ROADS) {
    const [a, b] = road.services.map(servicePosition);
    if (distanceToSegment(x, d, a, b) < r + 1) return false;
  }
  return distanceToTrail(x, d, r + 2) >= r + 1.2;
}

/**
 * The buildings of the night city (CITY_AREA), one to four in every block of
 * its street grid, tallest in the middle of the city. They leave the lights,
 * the roads and the paths through the city free. Squat, like the dust trees:
 * the night camera looks straight down, so tall boxes would lean out of the
 * frame. Night only: Dust draws them as specks on their walls and roofs.
 */
export function layoutCity(): Building[] {
  const rng = mulberry32(5151);
  const buildings: Building[] = [];
  const blocks = Math.ceil(CITY_EXTENT / CITY_SPACING);
  const inner = CITY_SPACING / 2 - STREET_MARGIN;
  for (let i = -blocks; i < blocks; i++) {
    for (let j = -blocks; j < blocks; j++) {
      const u0 = (i + 0.5) * CITY_SPACING;
      const w0 = (j + 0.5) * CITY_SPACING;
      if (!inCity(u0, w0) || rng() < 0.12) continue;
      // Taller toward the middle of the city.
      const [bx, bd] = cityToMap(u0, w0);
      const reach = Math.hypot((bx - CITY_AREA.x) / CITY_AREA.rx, (bd - CITY_AREA.d) / CITY_AREA.rd);
      const middle = Math.max(0, 1 - reach);
      // One block, two halves or four quarters.
      const split = rng();
      const nu = split < 0.45 ? 1 : 2;
      const nw = split < 0.75 ? 1 : 2;
      for (let a = 0; a < nu; a++) {
        for (let b = 0; b < nw; b++) {
          const hu = (inner / nu) * (0.7 + 0.25 * rng());
          const hw = (inner / nw) * (0.7 + 0.25 * rng());
          const u = u0 + (nu > 1 ? (a - 0.5) * inner : 0);
          const w = w0 + (nw > 1 ? (b - 0.5) * inner : 0);
          const [x, d] = cityToMap(u, w);
          if (!clear(x, d, Math.hypot(hu, hw))) continue;
          const height = 1.2 + middle * 3.2 + Math.pow(rng(), 2.5) * (1.5 + middle * 3);
          buildings.push({ x, d, hu, hw, height });
        }
      }
    }
  }
  return buildings;
}

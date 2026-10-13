"use client";

import { useFrame } from "@react-three/fiber";
import { MathUtils, Vector3 } from "three";
import { type ChallengeId, PLACES, pathIndex, samePanel } from "@/config/nightMap";
import { TESTIMONIALS } from "@/content/consulting";
import { useSceneStore } from "@/store/scene";
import { mapUniforms } from "../painterly/mapUniforms";
import { PATH_GEOMETRY, placeWorld, stationArc, updatePlaceWorld } from "../painterly/nightMap";
import { sharedUniforms } from "../painterly/palette";
import { MapLights } from "./MapLights";
import { MapLines } from "./MapLines";

const projected = new Vector3();

/** Places along a path, by step (clearing, A, road, B, summit, goal); the road has none. */
function stepPlaces(id: ChallengeId) {
  const path = PATH_GEOMETRY[pathIndex(id)];
  const index = (placeId: string) => PLACES.findIndex((p) => p.id === placeId);
  if (!path.services) return [index(`clearing:${id}`), index("goal")];
  return [
    index(`clearing:${id}`),
    index(`service:${path.services[0]}`),
    -1,
    index(`service:${path.services[1]}`),
    index("summit"),
    index("goal"),
  ];
}
const STEP_PLACES = Object.fromEntries(PATH_GEOMETRY.map((p) => [p.id, stepPlaces(p.id)])) as Record<
  ChallengeId,
  number[]
>;

/**
 * The night map over the dust world (src/config/nightMap.ts): its lines and
 * its lights. Every frame it moves the places that move (testimonials, the
 * lantern), lights the active path up to where the panel has got to, eases
 * the hover and projects every place to the screen (viewport pixels, so
 * the canvas being pushed aside by a panel is taken into account), into the
 * store's `placeScreen`, where the DOM (MapPlaces) puts a real button over
 * each one.
 */
export function NightMap() {
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const store = useSceneStore.getState();
    const { activePath, pathStation, panel, hoveredPlace, placeScreen, night } = store;
    const lantern = updatePlaceWorld(sharedUniforms.uTime.value, activePath);

    const path = activePath ? PATH_GEOMETRY[pathIndex(activePath)] : null;
    mapUniforms.uActivePath.value = activePath ? pathIndex(activePath) : -1;
    mapUniforms.uPathReach.value = path ? stationArc(path, pathStation) : 0;
    const hovered = hoveredPlace !== null ? PLACES[hoveredPlace] : null;
    mapUniforms.uPreviewPath.value =
      hovered?.panel.kind === "path" && hovered.panel.id !== activePath ? pathIndex(hovered.panel.id) : -1;
    mapUniforms.uPixelRatio.value = state.gl.getPixelRatio();

    const steps = activePath ? STEP_PLACES[activePath] : [];
    const current = panel?.kind === "path" ? steps[Math.round(pathStation)] : -1;
    const camera = state.camera;
    const { width, height } = state.size;
    const usable = night > 0.98;
    // In viewport pixels: the canvas may be pushed aside by a panel, or
    // still sliding back after one has closed.
    const rect = usable ? state.gl.domElement.getBoundingClientRect() : null;
    const left = rect?.left ?? 0;
    const top = rect?.top ?? 0;

    PLACES.forEach((place, i) => {
      const p = placeWorld[i];
      mapUniforms.uPlacePos.value[i].copy(p);
      const shown =
        place.kind === "lantern"
          ? lantern
          : place.panel.kind !== "testimonial" || place.panel.index < TESTIMONIALS.length;
      const open = panel !== null && panel.kind !== "path" && samePanel(place.panel, panel);
      const s = mapUniforms.uPlaceState.value[i];
      s.x = shown ? 1 : 0;
      s.y = MathUtils.damp(s.y, hoveredPlace === i ? 1 : 0, hoveredPlace === i ? 8 : 3, dt);
      s.z = MathUtils.damp(s.z, steps.includes(i) || open ? 1 : 0, 2.5, dt);
      s.w = MathUtils.damp(s.w, current === i ? 1 : 0, 4, dt);

      projected.copy(p).project(camera);
      const x = left + (projected.x * 0.5 + 0.5) * width;
      const y = top + (-projected.y * 0.5 + 0.5) * height;
      const onScreen =
        usable && shown && projected.z < 1 && x > -20 && x < window.innerWidth + 20 && y > -20 && y < window.innerHeight + 20;
      placeScreen[i * 3] = x;
      placeScreen[i * 3 + 1] = y;
      placeScreen[i * 3 + 2] = onScreen ? 1 : 0;
    });
  });

  return (
    <group name="night-map">
      <MapLines />
      <MapLights />
    </group>
  );
}

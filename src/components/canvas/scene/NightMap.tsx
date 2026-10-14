"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { MathUtils, Vector3 } from "three";
import { type ChallengeId, PLACES, pathIndex, samePanel } from "@/config/nightMap";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
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

/** Seconds a highlighted path takes to draw itself in, and to retract. */
const DRAW_TIME = 1.4;
const RETRACT_TIME = 0.45;

/** A path drawing itself in or retracting (trim path): which one, and how far (0..1). */
interface Trim {
  path: number;
  progress: number;
}

/**
 * Moves a trim toward showing path `target` (-1 = none): the path shown
 * retracts first, then the target draws itself in from its clearing.
 */
function advanceTrim(trim: Trim, target: number, dt: number) {
  if (trim.path !== target) {
    trim.progress -= dt / RETRACT_TIME;
    if (trim.progress > 0 && trim.path >= 0) return;
    trim.path = target;
    trim.progress = 0;
  }
  if (target >= 0) trim.progress = Math.min(1, trim.progress + dt / DRAW_TIME);
}

/** Metres of a trim's path drawn (past the end when done, so the soft tip is gone). */
function trimDrawn(trim: Trim) {
  if (trim.path < 0) return 0;
  const t = trim.progress;
  const eased = t * t * (3 - 2 * t);
  return eased * (PATH_GEOMETRY[trim.path].length + 4);
}

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
  const reducedMotion = usePrefersReducedMotion();
  const active = useRef<Trim>({ path: -1, progress: 0 });
  const preview = useRef<Trim>({ path: -1, progress: 0 });

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const store = useSceneStore.getState();
    const { activePath, pathStation, panel, hoveredPlace, placeScreen, night, testimonialCount, bafaActive } = store;
    const lantern = updatePlaceWorld(sharedUniforms.uTime.value, activePath, bafaActive);

    // Highlighted paths draw themselves in (trim path); a path clicked while
    // its preview is drawing carries on from there.
    const activeIndex = activePath ? pathIndex(activePath) : -1;
    const hovered = hoveredPlace !== null ? PLACES[hoveredPlace] : null;
    const previewIndex =
      hovered?.panel.kind === "path" && hovered.panel.id !== activePath ? pathIndex(hovered.panel.id) : -1;
    const trimDt = reducedMotion ? 1 : dt;
    const a = active.current;
    const p = preview.current;
    // The preview keeps the clicked path drawing while the path open before
    // retracts, and hands it over as the active trim takes it.
    const handingOver = activeIndex >= 0 && a.path !== activeIndex && p.path === activeIndex;
    advanceTrim(a, activeIndex, trimDt);
    if (handingOver && a.path === activeIndex) a.progress = Math.max(a.progress, p.progress);
    advanceTrim(p, handingOver && a.path !== activeIndex ? activeIndex : previewIndex, trimDt);
    mapUniforms.uActivePath.value = a.path;
    mapUniforms.uActiveDrawn.value = trimDrawn(a);
    mapUniforms.uPreviewPath.value = p.path;
    mapUniforms.uPreviewDrawn.value = trimDrawn(p);
    // A path still retracting keeps the reach it had.
    if (a.path >= 0 && a.path === activeIndex) {
      mapUniforms.uPathReach.value = stationArc(PATH_GEOMETRY[a.path], pathStation);
    }
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
      const at = placeWorld[i];
      mapUniforms.uPlacePos.value[i].copy(at);
      const shown =
        place.kind === "lantern"
          ? lantern
          : place.panel.kind !== "testimonial" || place.panel.index < testimonialCount;
      const open = panel !== null && panel.kind !== "path" && samePanel(place.panel, panel);
      const s = mapUniforms.uPlaceState.value[i];
      s.x = shown ? 1 : 0;
      s.y = MathUtils.damp(s.y, hoveredPlace === i ? 1 : 0, hoveredPlace === i ? 8 : 3, dt);
      s.z = MathUtils.damp(s.z, steps.includes(i) || open ? 1 : 0, 2.5, dt);
      s.w = MathUtils.damp(s.w, current === i ? 1 : 0, 4, dt);

      projected.copy(at).project(camera);
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

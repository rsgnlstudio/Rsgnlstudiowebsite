"use client";

import { useFrame, useThree, type RootState } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { MathUtils, Vector3 } from "three";
import { FEATURED_FLOWERS, FEATURED_HIT, type FeaturedFlowerId } from "@/config/flowers";
import { INTRO_UI_AT } from "@/config/scene";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useWindowPointer } from "@/hooks/useWindowPointer";
import { useLookStore } from "@/store/look";
import { useSceneStore } from "@/store/scene";
import { featuredUniforms } from "../painterly/featured";
import { terrainHeight } from "../painterly/landscape";
import { FLOWER_KIND, paintFlower, PETAL_TINTS, PLANT_COLORS } from "../painterly/plants";
import { mulberry32 } from "../painterly/random";
import { StrokeBuffer } from "../painterly/strokes";
import { viewUniforms } from "../painterly/view";
import { StrokeLayer } from "./StrokeLayer";

/** Where each flower stands, and the middle of its head (for hovering). */
const flowers = FEATURED_FLOWERS.map((flower) => {
  const z = -flower.d;
  const root = [flower.x, terrainHeight(flower.x, z) - 0.04, z] as const;
  return { ...flower, root, head: new Vector3(root[0], root[1] + flower.height * 0.95, z) };
});

function paintFeatured() {
  const out = new StrokeBuffer();
  const rng = mulberry32(4711);
  flowers.forEach((flower, i) => {
    paintFlower(
      {
        out,
        rng,
        root: flower.root,
        height: flower.height,
        phase: rng() * Math.PI * 2,
        light: 1.3 + rng() * 0.2,
        variation: [(rng() - 0.5) * 0.06, 1.05, 1],
        detail: 1,
        feature: i + 1,
      },
      FLOWER_KIND[flower.kind],
      PETAL_TINTS.indexOf(flower.tint),
      1,
    );
  });
  return out;
}

const projected = new Vector3();

/** Day only: the flowers fade out with the morph into the night. */
const dayOf = (night: number) => 1 - MathUtils.smoothstep(night, 0.02, 0.2);

/**
 * The featured flower whose head is under a point on screen (normalized
 * device coordinates), or null. The nearest one wins.
 */
function flowerAt(
  { camera, size, viewport }: Pick<RootState, "camera" | "size" | "viewport">,
  x: number,
  y: number,
) {
  // uPxPerUnit is in device pixels; the hit test works in CSS pixels.
  const pxPerUnit = viewUniforms.uPxPerUnit.value / viewport.dpr;
  let best = 1;
  let hit: FeaturedFlowerId | null = null;
  for (const flower of flowers) {
    projected.copy(flower.head).project(camera);
    if (projected.z > 1) continue;
    const dx = ((projected.x - x) * size.width) / 2;
    const dy = ((projected.y - y) * size.height) / 2;
    const dist = camera.position.distanceTo(flower.head);
    const radius = Math.max(
      (flower.height * FEATURED_HIT.radius * pxPerUnit) / dist,
      FEATURED_HIT.minPx,
    );
    const r = Math.hypot(dx, dy) / radius;
    if (r < best) {
      best = r;
      hit = flower.id;
    }
  }
  return hit;
}

/** Clicks on these stay with the DOM and never open a flower. */
const INTERACTIVE = "a, button, input, select, textarea, label, dialog, [role='dialog']";

/**
 * The featured flowers: a few slightly bigger flowers in the day meadow (see
 * src/config/flowers.ts) that breathe a soft glow and light up under the
 * cursor. The canvas ignores pointer events, so hovering is found here by
 * projecting each flower's head to the screen; the hovered one goes to the
 * store (`hoveredFlower`) for the DOM. Day only, mouse only. A click (or a
 * tap on touch screens) on a flower opens its project overlay (`openFlower`);
 * while it is open, hovering pauses and the open flower stays lit.
 */
export function FeaturedFlowers() {
  const geometry = useMemo(() => paintFeatured().createGeometry(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const reducedMotion = usePrefersReducedMotion();
  const reduced = useRef(reducedMotion);
  useEffect(() => {
    reduced.current = reducedMotion;
  }, [reducedMotion]);

  const pointer = useWindowPointer();
  const get = useThree((s) => s.get);

  // Clicks land on the DOM (the canvas ignores them), so they are tested
  // against the flowers here, at the click's own position.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const { night, intro, sceneMode, openFlower, setOpenFlower } = useSceneStore.getState();
      if (openFlower || sceneMode === "hidden" || dayOf(night) <= 0.5 || intro < INTRO_UI_AT) return;
      if (event.target instanceof Element && event.target.closest(INTERACTIVE)) return;
      const hit = flowerAt(
        get(),
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1,
      );
      if (hit) setOpenFlower(hit);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [get]);

  // The pointer cursor follows the hover; hiding the scene or leaving the
  // page clears it.
  useEffect(() => {
    const { setHoveredFlower } = useSceneStore.getState();
    const unsubscribe = useSceneStore.subscribe((state, prev) => {
      if (state.hoveredFlower !== prev.hoveredFlower) {
        document.body.style.cursor = state.hoveredFlower ? "pointer" : "";
      }
      if (state.sceneMode === "hidden" && state.hoveredFlower) setHoveredFlower(null);
    });
    return () => {
      unsubscribe();
      setHoveredFlower(null);
      document.body.style.cursor = "";
    };
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const { night, intro, hoveredFlower, openFlower, setHoveredFlower } = useSceneStore.getState();
    const day = dayOf(night);

    // Not before the intro has painted the meadow and revealed the UI.
    const hovered =
      pointer.current.active && day > 0.5 && !openFlower && intro >= INTRO_UI_AT
        ? flowerAt(state, pointer.current.position.x, pointer.current.position.y)
        : null;
    if (hovered !== hoveredFlower) setHoveredFlower(hovered);

    // Light up softly, fade out slower still.
    const hover = featuredUniforms.uFeatureHover.value;
    flowers.forEach((flower, i) => {
      const target = flower.id === hovered || flower.id === openFlower ? 1 : 0;
      hover[i] = MathUtils.damp(hover[i], target, target > hover[i] ? 5 : 2.5, dt);
    });
    const look = useLookStore.getState();
    featuredUniforms.uFeatureRest.value = look.featuredRest * day;
    featuredUniforms.uFeatureBreathe.value = reduced.current ? 0 : look.featuredBreathe;
    featuredUniforms.uFeatureHoverGlow.value = look.featuredHover * day;
    featuredUniforms.uFeatureGrow.value = reduced.current ? 0 : look.featuredGrow;
  });

  return (
    <StrokeLayer
      name="featured-flowers"
      geometry={geometry}
      options={{
        colors: PLANT_COLORS,
        shadow: "fieldShadow",
        light: "flowerWhite",
        sway: 0.07,
        rootFade: 0.3,
        relief: 0.7,
        backlight: 1,
        featured: true,
      }}
    />
  );
}

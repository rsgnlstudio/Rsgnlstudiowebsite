"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { MathUtils, Vector3 } from "three";
import { FEATURED_FLOWERS, FEATURED_HIT, type FeaturedFlowerId } from "@/config/flowers";
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

/**
 * The featured flowers: a few slightly bigger flowers in the day meadow (see
 * src/config/flowers.ts) that breathe a soft glow and light up under the
 * cursor. The canvas ignores pointer events, so hovering is found here by
 * projecting each flower's head to the screen; the hovered one goes to the
 * store (`hoveredFlower`) for the DOM. Day only, mouse only.
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

  useFrame(({ camera, size, viewport }, delta) => {
    const dt = Math.min(delta, 0.05);
    const { night, hoveredFlower, setHoveredFlower } = useSceneStore.getState();
    const day = 1 - MathUtils.smoothstep(night, 0.02, 0.2);

    let hovered: FeaturedFlowerId | null = null;
    if (pointer.current.active && day > 0.5) {
      // uPxPerUnit is in device pixels; the hit test works in CSS pixels.
      const pxPerUnit = viewUniforms.uPxPerUnit.value / viewport.dpr;
      let best = 1;
      for (const flower of flowers) {
        projected.copy(flower.head).project(camera);
        if (projected.z > 1) continue;
        const dx = ((projected.x - pointer.current.position.x) * size.width) / 2;
        const dy = ((projected.y - pointer.current.position.y) * size.height) / 2;
        const dist = camera.position.distanceTo(flower.head);
        const radius = Math.max(
          (flower.height * FEATURED_HIT.radius * pxPerUnit) / dist,
          FEATURED_HIT.minPx,
        );
        const r = Math.hypot(dx, dy) / radius;
        if (r < best) {
          best = r;
          hovered = flower.id;
        }
      }
    }
    if (hovered !== hoveredFlower) setHoveredFlower(hovered);

    // Light up quickly, fade out a little slower.
    const hover = featuredUniforms.uFeatureHover.value;
    flowers.forEach((flower, i) => {
      const target = flower.id === hovered ? 1 : 0;
      hover[i] = MathUtils.damp(hover[i], target, target > hover[i] ? 9 : 4, dt);
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

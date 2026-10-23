"use client";

import { useFrame, useThree, type RootState } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { MathUtils, Vector3 } from "three";
import { qualityPresets } from "@/config/look";
import { BED_HIT, BED_PULSE, PROJECT_BEDS, type ProjectBedId } from "@/config/flowers";
import { INTRO_UI_AT } from "@/config/scene";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useWindowPointer } from "@/hooks/useWindowPointer";
import { useLookStore } from "@/store/look";
import { useSceneStore } from "@/store/scene";
import { areaReach, scatterBeds, squeezeArea } from "../painterly/beds";
import { featuredUniforms } from "../painterly/featured";
import { terrainHeight } from "../painterly/landscape";
import { paintFlower, PLANT_COLORS } from "../painterly/plants";
import { sharedUniforms } from "../painterly/palette";
import { mulberry32, valueNoise } from "../painterly/random";
import { StrokeBuffer } from "../painterly/strokes";
import { viewUniforms } from "../painterly/view";
import { StrokeLayer } from "./StrokeLayer";

function paintBeds(scale: number) {
  const out = new StrokeBuffer();
  const rng = mulberry32(4711);
  for (const plant of scatterBeds(scale)) {
    const z = -plant.d;
    // Sunlit drifts and shaded hollows, as in the rest of the meadow.
    const sun = valueNoise(plant.x * 0.09, z * 0.09, 3);
    const pale = plant.tint === "flowerWhite" || plant.tint === "flowerPeriwinkle" || plant.tint === "flowerBlue";
    paintFlower(
      {
        out,
        rng,
        // y is relative to the ground; the stroke shader seats the plant (SQUEEZE).
        root: [plant.x, -0.04, z],
        height: plant.height,
        phase: rng() * Math.PI * 2,
        light: 0.8 + sun * 0.5 + (rng() - 0.5) * 0.3,
        variation: [(rng() - 0.5) * 0.12, 0.95 + rng() * 0.15, 0.92 + rng() * 0.16],
        // Every petal close by, fewer strokes toward the back.
        detail: MathUtils.clamp(1 - (plant.d - 9) / 30, 0.3, 1),
        feature: plant.feature,
      },
      plant.kind,
      plant.tint,
      // The petals of project beds carry the full glow (lit by day on hover
      // and pulse); elsewhere some flowers glow at night.
      plant.feature > 0 ? 1 : rng() < 0.35 ? (pale ? 1 : 0.4) : 0,
    );
  }
  return out;
}

const origin = new Vector3();
const ray = new Vector3();

/** Day only: the beds stop reacting as the day morphs into the night. */
const dayOf = (night: number) => 1 - MathUtils.smoothstep(night, 0.02, 0.2);

/**
 * The project bed under a point on screen (normalized device coordinates),
 * or null. The cursor ray is tested against each bed's areas at a few
 * heights, from the stems up to the heads (BED_HIT); the nearest bed along
 * the ray wins, so a bed in front covers the one behind it. Beds move
 * together with the trees on narrow screens (uTreeSqueeze), and so do their
 * hit areas.
 */
function bedAt({ camera }: Pick<RootState, "camera">, x: number, y: number) {
  origin.copy(camera.position);
  ray.set(x, y, 0.5).unproject(camera).sub(origin).normalize();
  if (ray.y >= 0) return null;
  const squeeze = viewUniforms.uTreeSqueeze.value;
  let best = Infinity;
  let hit: ProjectBedId | null = null;
  for (const bed of PROJECT_BEDS) {
    for (const area of bed.areas) {
      const squeezed = squeezeArea(area, squeeze);
      const ground = terrainHeight(squeezed.x, -area.d);
      for (const height of BED_HIT.heights) {
        const s = (ground + height - origin.y) / ray.y;
        if (s <= 0 || s >= best) continue;
        const px = origin.x + ray.x * s;
        const pd = -(origin.z + ray.z * s);
        if (areaReach(squeezed, px, pd, BED_HIT.margin) < 1) {
          best = s;
          hit = bed.id;
        }
      }
    }
  }
  return hit;
}

/** Clicks on these stay with the DOM and never open a bed. */
const INTERACTIVE = "a, button, input, select, textarea, label, dialog, [role='dialog']";

/**
 * The flower beds of the day meadow (src/config/flowers.ts), painted plant
 * by plant into one stroke layer. The project beds react as a group: their
 * flowers breathe a soft glow, now and then a pulse of light ripples through
 * one of them (BED_PULSE) as a hint that it can be clicked, and under the
 * cursor the whole bed lights up. The
 * canvas ignores pointer events, so hovering is found here by casting the
 * cursor ray against the beds; the hovered one goes to the store
 * (`hoveredBed`) for the DOM. Day only, mouse only. A click (or a tap on
 * touch screens) on a bed opens its section in the overlay (`openBed`), or
 * its outside page in a new tab (`bedLinks`);
 * while it is open, hovering pauses and the open bed stays lit.
 */
export function FlowerBeds() {
  const tier = useLookStore((s) => s.tier);
  const scale = qualityPresets[tier].beds;
  const geometry = useMemo(() => paintBeds(scale).createGeometry(), [scale]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const reducedMotion = usePrefersReducedMotion();
  const reduced = useRef(reducedMotion);
  useEffect(() => {
    reduced.current = reducedMotion;
  }, [reducedMotion]);

  const pointer = useWindowPointer();
  const get = useThree((s) => s.get);

  // When each project bed pulses next (uTime), once the UI is shown.
  const nextPulse = useRef<number[] | null>(null);
  const pulseRng = useMemo(() => mulberry32(808), []);
  const between = ([lo, hi]: readonly [number, number]) => lo + pulseRng() * (hi - lo);

  // Clicks land on the DOM (the canvas ignores them), so they are tested
  // against the beds here, at the click's own position.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const { night, intro, sceneMode, openBed, bedLinks, setOpenBed } = useSceneStore.getState();
      if (openBed || sceneMode === "hidden" || dayOf(night) <= 0.5 || intro < INTRO_UI_AT) return;
      if (event.target instanceof Element && event.target.closest(INTERACTIVE)) return;
      const hit = bedAt(
        get(),
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1,
      );
      if (!hit) return;
      const href = bedLinks[hit];
      // Opened here, inside the click, so browsers don't block the new tab.
      if (href) window.open(href, "_blank", "noopener,noreferrer");
      else setOpenBed(hit);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [get]);

  // Hiding the scene or leaving the page clears the hover (the cursor dot
  // grows over a hovered bed, see CursorDot).
  useEffect(() => {
    const { setHoveredBed } = useSceneStore.getState();
    const unsubscribe = useSceneStore.subscribe((state) => {
      if (state.sceneMode === "hidden" && state.hoveredBed) setHoveredBed(null);
    });
    return () => {
      unsubscribe();
      setHoveredBed(null);
    };
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const { night, intro, hoveredBed, openBed, setHoveredBed } = useSceneStore.getState();
    const day = dayOf(night);

    // Not before the intro has painted the meadow and revealed the UI.
    const hovered =
      pointer.current.active && day > 0.5 && !openBed && intro >= INTRO_UI_AT
        ? bedAt(state, pointer.current.position.x, pointer.current.position.y)
        : null;
    if (hovered !== hoveredBed) setHoveredBed(hovered);

    // Light up softly, fade out slower still.
    const hover = featuredUniforms.uFeatureHover.value;
    PROJECT_BEDS.forEach((bed, i) => {
      const target = bed.id === hovered || bed.id === openBed ? 1 : 0;
      hover[i] = MathUtils.damp(hover[i], target, target > hover[i] ? 5 : 2.5, dt);
    });
    // Now and then a bed flares up on its own, never one that is lit already.
    // Away from the day the schedule starts over, so the pulses that fell
    // due meanwhile don't all fire at once when the day comes back.
    const now = sharedUniforms.uTime.value;
    const starts = featuredUniforms.uFeaturePulseStart.value;
    if (intro < INTRO_UI_AT || day <= 0.5) {
      nextPulse.current = null;
    } else {
      nextPulse.current ??= PROJECT_BEDS.map(() => now + between(BED_PULSE.first));
      PROJECT_BEDS.forEach((bed, i) => {
        if (now < nextPulse.current![i]) return;
        if (bed.id !== hovered && bed.id !== openBed) starts[i] = now;
        nextPulse.current![i] = now + between(BED_PULSE.every);
      });
    }

    const look = useLookStore.getState();
    featuredUniforms.uFeatureRest.value = look.featuredRest * day;
    featuredUniforms.uFeatureBreathe.value = reduced.current ? 0 : look.featuredBreathe;
    featuredUniforms.uFeaturePulseGlow.value = reduced.current ? 0 : look.featuredPulse * day;
    featuredUniforms.uFeatureHoverGlow.value = look.featuredHover * day;
    featuredUniforms.uFeatureGrow.value = reduced.current ? 0 : look.featuredGrow;
  });

  return (
    <StrokeLayer
      name="flower-beds"
      geometry={geometry}
      options={{
        colors: PLANT_COLORS,
        shadow: "fieldShadow",
        light: "flowerWhite",
        sway: 0.07,
        rootFade: 0.3,
        relief: 0.7,
        backlight: 1,
        squeeze: true,
        featured: true,
      }}
    />
  );
}

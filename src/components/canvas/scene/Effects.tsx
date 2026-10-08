"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BloomEffect, DepthOfFieldEffect } from "postprocessing";
import { useEffect, useMemo } from "react";
import { qualityPresets } from "@/config/look";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useLookStore } from "@/store/look";
import { BrushStrokePass, STROKE_LAYERS } from "../painterly/BrushStrokePass";
import { PainterlyEffect } from "../painterly/PainterlyEffect";
import { sharedUniforms } from "../painterly/palette";

const COC_SOURCE = "float magnitude=smoothstep(0.0,focusRange,abs(signedDistance));";

/**
 * postprocessing ramps blur symmetrically over `focusRange`, which makes the
 * trees as blurry as the mountains. Patch the CoC so the far side ramps over
 * focusRange (trees soft, mountains softer) and the near side ramps relative
 * to the focus distance (the closest grass goes fully soft).
 */
function patchCircleOfConfusion(effect: DepthOfFieldEffect) {
  const material = effect.cocMaterial;
  if (!material.fragmentShader.includes(COC_SOURCE)) {
    console.warn("Effects: postprocessing CoC shader changed; using the default ramp.");
    return;
  }
  material.fragmentShader = material.fragmentShader.replace(
    COC_SOURCE,
    `float magnitude = signedDistance < 0.0
      ? smoothstep(focusDistance * 0.3, focusDistance * 0.85, -signedDistance)
      : smoothstep(1.0, focusRange, signedDistance);`,
  );
  material.needsUpdate = true;
}

interface EffectSet {
  dof: DepthOfFieldEffect;
  bloom: BloomEffect;
  strokes: BrushStrokePass | null;
  finish: PainterlyEffect;
}

/** Copies the live look settings onto the effects. */
function applyLook({ dof, bloom, strokes, finish }: EffectSet, time: number) {
  const look = useLookStore.getState();
  dof.cocMaterial.focusDistance = look.focusDistance;
  dof.cocMaterial.focusRange = look.focusRange;
  dof.bokehScale = look.blurStrength;
  // Only HDR highlights bloom (sun, moon, stars, glowing flowers, fireflies).
  bloom.intensity = look.glow * (0.45 + 0.6 * sharedUniforms.uGlow.value);
  if (strokes) strokes.strokeScale = look.strokeScale;
  finish.time = time;
  finish.grain = look.grain;
  finish.vignette = look.vignette;
}

/**
 * Post-processing, in order:
 * 1. depth of field (sharp midground, soft trees, softer mountains) and bloom
 *    on the HDR highlights,
 * 2. BrushStrokePass, which repaints the whole frame with brushstrokes,
 * 3. the finish: canvas texture, grain and vignette.
 * The near foreground fakes its blur with pre-blurred textures.
 */
export function Effects() {
  const camera = useThree((s) => s.camera);
  const tier = useLookStore((s) => s.tier);
  const brushStrokes = useLookStore((s) => s.brushStrokes);
  const preset = qualityPresets[tier];
  const reducedMotion = usePrefersReducedMotion();

  const dof = useMemo(() => {
    const { focusDistance, focusRange, blurStrength } = useLookStore.getState();
    const effect = new DepthOfFieldEffect(camera, {
      focusDistance,
      focusRange,
      bokehScale: blurStrength,
      resolutionScale: preset.dofResolution,
    });
    patchCircleOfConfusion(effect);
    return effect;
  }, [camera, preset.dofResolution]);
  useEffect(() => () => dof.dispose(), [dof]);

  const bloom = useMemo(
    () =>
      new BloomEffect({
        luminanceThreshold: 1,
        luminanceSmoothing: 0.3,
        mipmapBlur: true,
        radius: 0.55,
      }),
    [],
  );
  useEffect(() => () => bloom.dispose(), [bloom]);

  const strokes = useMemo(
    () => (brushStrokes ? new BrushStrokePass(STROKE_LAYERS.slice(0, preset.strokeLayers)) : null),
    [brushStrokes, preset.strokeLayers],
  );
  useEffect(() => () => strokes?.dispose(), [strokes]);

  const finish = useMemo(() => new PainterlyEffect(), []);
  useEffect(() => () => finish.dispose(), [finish]);

  useFrame(() => {
    // Reduced motion: freeze the grain pattern.
    applyLook({ dof, bloom, strokes, finish }, reducedMotion ? 0 : sharedUniforms.uTime.value);
  });

  return (
    <EffectComposer multisampling={preset.multisampling}>
      <primitive object={dof} />
      <primitive object={bloom} />
      {strokes && <primitive object={strokes} />}
      <primitive object={finish} />
    </EffectComposer>
  );
}

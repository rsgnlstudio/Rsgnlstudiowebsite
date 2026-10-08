"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BloomEffect, DepthOfFieldEffect, EffectPass } from "postprocessing";
import { useEffect, useMemo } from "react";
import { type Camera, MathUtils, Vector3 } from "three";
import { qualityPresets } from "@/config/look";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useLookStore } from "@/store/look";
import { rayGroundDistance } from "../painterly/landscape";
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
  finish: PainterlyEffect;
}

const forward = new Vector3();

/** Distance to the ground at the centre of the frame, where focus sits. */
function centreFocusDistance(camera: Camera) {
  // From the quaternion: CameraRig set it this frame, matrixWorld lags.
  return rayGroundDistance(camera.position, forward.set(0, 0, -1).applyQuaternion(camera.quaternion));
}

/** Copies the live look settings onto the effects. */
function applyLook({ dof, bloom, finish }: EffectSet, camera: Camera, time: number) {
  const look = useLookStore.getState();
  dof.cocMaterial.focusDistance = centreFocusDistance(camera);
  dof.cocMaterial.focusRange = look.focusRange;
  // The dust world blurs its own specks into bokeh, so depth of field hands
  // over to it as the painting dissolves.
  const dust = MathUtils.clamp(sharedUniforms.uDissolve.value / 0.7, 0, 1);
  dof.bokehScale = look.blurStrength * (1 - dust);
  // Only HDR highlights bloom (sun, moon, stars, glowing flowers, fireflies,
  // the cursor light and the dust it lights).
  bloom.intensity = look.glow * (0.45 + 0.6 * sharedUniforms.uGlow.value);
  finish.time = time;
  finish.grain = look.grain;
  // Night closes in around the light.
  finish.vignette = MathUtils.lerp(look.vignette, Math.max(look.vignette, 0.55), dust);
  finish.fringe = look.fringe * (0.5 + 0.5 * dust);
  finish.canvas = 1 - dust;
}

/**
 * Post-processing, in order:
 * 1. depth of field, focused on the ground at the centre of the frame, and
 *    bloom on the HDR highlights,
 * 2. the finish, in its own pass as it samples the frame at offsets:
 *    chromatic fringe, canvas texture, grain and vignette.
 * The near foreground fakes its blur with pre-blurred textures.
 */
export function Effects() {
  const camera = useThree((s) => s.camera);
  const tier = useLookStore((s) => s.tier);
  const preset = qualityPresets[tier];
  const reducedMotion = usePrefersReducedMotion();

  const dof = useMemo(() => {
    const { focusRange, blurStrength } = useLookStore.getState();
    const effect = new DepthOfFieldEffect(camera, {
      focusDistance: centreFocusDistance(camera),
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

  // Disposing the pass disposes its effect too.
  const { finish, finishPass } = useMemo(() => {
    const effect = new PainterlyEffect();
    return { finish: effect, finishPass: new EffectPass(camera, effect) };
  }, [camera]);
  useEffect(() => () => finishPass.dispose(), [finishPass]);

  useFrame(() => {
    // Reduced motion: freeze the grain pattern.
    applyLook({ dof, bloom, finish }, camera, reducedMotion ? 0 : sharedUniforms.uTime.value);
  });

  return (
    <EffectComposer multisampling={preset.multisampling}>
      <primitive object={dof} />
      <primitive object={bloom} />
      <primitive object={finishPass} />
    </EffectComposer>
  );
}

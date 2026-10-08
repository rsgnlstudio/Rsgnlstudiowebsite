"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BloomEffect, DepthOfFieldEffect, EffectPass } from "postprocessing";
import { useEffect, useMemo } from "react";
import { MathUtils, type PerspectiveCamera, Vector3 } from "three";
import { qualityPresets } from "@/config/look";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useLookStore } from "@/store/look";
import { rayGroundDistance } from "../painterly/landscape";
import { PainterlyEffect } from "../painterly/PainterlyEffect";
import { VolumetricMist } from "../painterly/VolumetricMist";
import { WetCanvasPass, wetUniforms } from "../painterly/WetCanvasPass";
import { sharedUniforms } from "../painterly/palette";

const COC_SOURCE = "float magnitude=smoothstep(0.0,focusRange,abs(signedDistance));";

/**
 * postprocessing ramps blur symmetrically over `focusRange`, which makes the
 * trees as blurry as the mountains. Patch the CoC so the far side ramps over
 * focusRange (trees soft, mountains softer) and the near side ramps relative
 * to the focus distance (the closest grass goes fully soft). The sky (on
 * the far plane) only blurs a little: it is painted soft already, and fully
 * blurred the sun breaks up into rings of bokeh dots.
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
      ? smoothstep(focusDistance * 0.12, focusDistance * 0.6, -signedDistance)
      : smoothstep(1.0, focusRange, signedDistance) * (depth > 0.9999 ? 0.25 : 1.0);`,
  );
  material.needsUpdate = true;
}

interface EffectSet {
  wetCanvas: WetCanvasPass;
  dof: DepthOfFieldEffect;
  bloom: BloomEffect;
  finish: PainterlyEffect;
}

const forward = new Vector3();

/**
 * Where focus sits: on the ground this far below the centre of the frame
 * (in half-frame heights), i.e. the near meadow a few metres out. Everything
 * beyond melts into soft paint, the flowers by the lens blur the other way.
 */
const FOCUS_BELOW_CENTRE = 0.4;

/** Distance to the ground at the focus point of the frame. */
function focusDistance(camera: PerspectiveCamera) {
  const tan = Math.tan(MathUtils.degToRad(camera.fov / 2));
  // From the quaternion: CameraRig set it this frame, matrixWorld lags.
  forward.set(0, -FOCUS_BELOW_CENTRE * tan, -1).normalize().applyQuaternion(camera.quaternion);
  return rayGroundDistance(camera.position, forward);
}

/** Copies the live look settings onto the effects. */
function applyLook({ wetCanvas, dof, bloom, finish }: EffectSet, camera: PerspectiveCamera, time: number) {
  const look = useLookStore.getState();
  dof.cocMaterial.focusDistance = focusDistance(camera);
  dof.cocMaterial.focusRange = look.focusRange;
  // The dust world blurs its own specks into bokeh, so depth of field hands
  // over to it as the painting morphs into dust.
  const morph = sharedUniforms.uMorph.value;
  const dust = MathUtils.clamp((morph - 0.08) / 0.6, 0, 1);
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
  // Wet in wet by day only; the dust world has no paint to mix.
  const day = 1 - MathUtils.clamp((morph - 0.08) / 0.25, 0, 1);
  wetUniforms.uWetAmount.value = wetCanvas.ready ? look.wetBlend * day : 0;
}

/**
 * Post-processing, in order:
 * 0. the wet canvas: a blurred copy of the frame the strokes mix into on the
 *    next frame (WetCanvasPass); the frame passes through unchanged,
 * 0. volumetric mist, raymarched against the depth (VolumetricMist),
 * 1. depth of field, focused on the near meadow (FOCUS_BELOW_CENTRE), and
 *    bloom on the HDR highlights,
 * 2. the finish, in its own pass as it samples the frame at offsets:
 *    chromatic fringe, canvas texture, grain and vignette.
 */
export function Effects() {
  const camera = useThree((s) => s.camera);
  const tier = useLookStore((s) => s.tier);
  const preset = qualityPresets[tier];
  const reducedMotion = usePrefersReducedMotion();

  const dof = useMemo(() => {
    const { focusRange, blurStrength } = useLookStore.getState();
    const effect = new DepthOfFieldEffect(camera, {
      focusDistance: focusDistance(camera as PerspectiveCamera),
      focusRange,
      bokehScale: blurStrength,
      resolutionScale: preset.dofResolution,
    });
    patchCircleOfConfusion(effect);
    return effect;
  }, [camera, preset.dofResolution]);
  useEffect(() => () => dof.dispose(), [dof]);

  const wetCanvas = useMemo(() => new WetCanvasPass(), []);
  useEffect(() => () => wetCanvas.dispose(), [wetCanvas]);

  // Its own pass: depth of field has to see the mist to blur it.
  const mistPass = useMemo(() => new EffectPass(camera, new VolumetricMist(camera)), [camera]);
  useEffect(() => () => mistPass.dispose(), [mistPass]);

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
    applyLook({ wetCanvas, dof, bloom, finish }, camera as PerspectiveCamera, reducedMotion ? 0 : sharedUniforms.uTime.value);
  });

  return (
    <EffectComposer multisampling={preset.multisampling}>
      <primitive object={wetCanvas} />
      <primitive object={mistPass} />
      <primitive object={dof} />
      <primitive object={bloom} />
      <primitive object={finishPass} />
    </EffectComposer>
  );
}

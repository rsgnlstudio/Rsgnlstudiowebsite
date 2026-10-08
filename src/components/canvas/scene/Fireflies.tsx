"use client";

import { useEffect, useMemo } from "react";
import {
  AdditiveBlending,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  PlaneGeometry,
  ShaderMaterial,
} from "three";
import { qualityPresets } from "@/config/look";
import type { PaletteKey } from "@/config/palette";
import { useLookStore } from "@/store/look";
import { overheadPoint, terrainHeight } from "../painterly/landscape";
import { paletteGLSL, paletteUniformsFor, sharedUniforms } from "../painterly/palette";
import { mulberry32 } from "../painterly/random";
import { viewUniforms } from "../painterly/view";

const COLORS = ["firefly"] as const satisfies readonly PaletteKey[];

const vertexShader = /* glsl */ `
attribute vec3 aBase;
attribute vec4 aSeed;
uniform float uTime;
uniform float uWind;
uniform float uGlow;
uniform float uTopView;
varying vec2 vUv;
varying float vBright;
void main() {
  float t = uTime * (0.25 + aSeed.x * 0.3) * max(uWind, 0.15);
  vec3 drift = vec3(sin(t + aSeed.y * 6.3) * 0.8, sin(t * 1.3 + aSeed.z * 6.3) * 0.35, cos(t * 0.9 + aSeed.w * 6.3) * 0.8);
  vec4 view = viewMatrix * vec4(aBase + drift, 1.0);
  // Larger from the top view, so they still read as specks from up there.
  view.xy += position.xy * (0.07 + aSeed.x * 0.06) * (1.0 + uTopView * 2.2);
  gl_Position = projectionMatrix * view;
  float blink = smoothstep(0.2, 0.9, sin(uTime * (0.6 + aSeed.w) + aSeed.y * 20.0) * 0.5 + 0.5);
  vBright = blink * smoothstep(aSeed.z * 0.5, aSeed.z * 0.5 + 0.5, uGlow);
  vUv = uv;
}
`;

const fragmentShader = /* glsl */ `
${paletteGLSL(COLORS)}
varying vec2 vUv;
varying float vBright;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float a = (1.0 - smoothstep(0.0, 1.0, d)) * vBright;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uFirefly * 2.6 * a, a);
}
`;

/** Fireflies drifting over the meadow at night (HDR, so they bloom). */
export function Fireflies() {
  const tier = useLookStore((s) => s.tier);
  const count = qualityPresets[tier].fireflies;

  const geometry = useMemo(() => {
    const rng = mulberry32(31337);
    const base = new Float32Array(count * 3);
    const seed = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      // Night is seen from above, so they spread over the whole top view.
      const [x, d] = overheadPoint(rng, false);
      const z = -d;
      base.set([x, terrainHeight(x, z) + 0.3 + rng() * 1.6, z], i * 3);
      seed.set([rng(), rng(), rng(), rng()], i * 4);
    }
    const quad = new PlaneGeometry(1, 1);
    const geom = new InstancedBufferGeometry();
    geom.index = quad.index;
    geom.setAttribute("position", quad.attributes.position);
    geom.setAttribute("uv", quad.attributes.uv);
    geom.setAttribute("aBase", new InstancedBufferAttribute(base, 3));
    geom.setAttribute("aSeed", new InstancedBufferAttribute(seed, 4));
    geom.instanceCount = count;
    return geom;
  }, [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          ...paletteUniformsFor(COLORS),
          ...sharedUniforms,
          uTopView: viewUniforms.uTopView,
        },
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  return <mesh name="fireflies" geometry={geometry} material={material} renderOrder={5} frustumCulled={false} />;
}

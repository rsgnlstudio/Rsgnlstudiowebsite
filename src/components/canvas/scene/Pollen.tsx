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
import { terrainHeight } from "../painterly/landscape";
import { paletteGLSL, paletteUniformsFor, sharedUniforms } from "../painterly/palette";
import { mulberry32 } from "../painterly/random";

const COLORS = ["sunGlow", "sun"] as const satisfies readonly PaletteKey[];

const vertexShader = /* glsl */ `
attribute vec3 aBase;
attribute vec4 aSeed;
uniform float uTime;
uniform float uWind;
uniform vec3 uSunDir;
uniform float uSunStrength;
uniform float uNight;
varying vec2 vUv;
varying float vBright;
void main() {
  // Lazy drift on the breeze, rising and sinking a little.
  float t = uTime * (0.08 + aSeed.x * 0.1) * max(uWind, 0.2);
  vec3 drift = vec3(
    sin(t + aSeed.y * 6.3) * 0.6 + t * 0.3,
    sin(t * 1.7 + aSeed.z * 6.3) * 0.25,
    cos(t * 0.8 + aSeed.w * 6.3) * 0.4
  );
  vec3 world = aBase + drift;
  world.x = mod(world.x + 40.0, 80.0) - 40.0;
  vec4 view = viewMatrix * vec4(world, 1.0);
  view.xy += position.xy * (0.007 + aSeed.x * 0.012) * (1.0 + -view.z * 0.05);
  gl_Position = projectionMatrix * view;

  // Specks between the eye and the sun light up most (they are backlit),
  // and twinkle as they turn.
  vec3 toSpeck = normalize(world - cameraPosition);
  float backlit = pow(max(dot(toSpeck, uSunDir), 0.0), 3.0);
  float twinkle = 0.5 + 0.5 * sin(uTime * (0.7 + aSeed.w * 1.3) + aSeed.y * 30.0);
  vBright = (0.35 + 1.4 * backlit) * (0.4 + 0.6 * twinkle) * uSunStrength * (1.0 - smoothstep(0.1, 0.4, uNight));
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
  // HDR, so bloom gives each speck a soft halo.
  gl_FragColor = vec4(mix(uSunGlow, uSun, 1.0 - d) * 2.2 * a, a);
}
`;

/**
 * Pollen drifting over the meadow by day, glowing where the low sun shines
 * through it: the day's small bit of magic (the fireflies are the night's).
 */
export function Pollen() {
  const tier = useLookStore((s) => s.tier);
  const count = qualityPresets[tier].pollen;

  const geometry = useMemo(() => {
    const rng = mulberry32(2024);
    const base = new Float32Array(count * 3);
    const seed = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      // In the view of the day camera, most of it close enough to read.
      const d = 1.5 + Math.pow(rng(), 1.6) * 40;
      const x = (rng() * 2 - 1) * (d * 0.9 + 1);
      const z = -d;
      base.set([x, terrainHeight(x, z) + 0.3 + rng() * 2.2, z], i * 3);
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
    quad.dispose();
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
        },
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  return <mesh name="pollen" geometry={geometry} material={material} renderOrder={5} frustumCulled={false} />;
}

"use client";

import { useEffect, useMemo } from "react";
import {
  AdditiveBlending,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  PlaneGeometry,
  ShaderMaterial,
} from "three";
import { CITY_LIGHTS, PLACES } from "@/config/nightMap";
import type { PaletteKey } from "@/config/palette";
import { mapUniforms, PLACE_KIND_INDEX as K } from "../painterly/mapUniforms";
import { paletteGLSL, paletteUniformsFor, sharedUniforms } from "../painterly/palette";

const COLORS = [
  "clearingGlow",
  "cityLight",
  "goalLight",
  "lantern",
  "firefly",
  "flowerGlow",
  "mapPath",
] as const satisfies readonly PaletteKey[];

const N = PLACES.length;

/** Half the size of each place's sprite, in metres. */
function spriteSize(index: number) {
  const place = PLACES[index];
  switch (place.kind) {
    case "clearing":
      return 7.5;
    case "service": {
      const light = CITY_LIGHTS.find((l) => `service:${l.id}` === place.id);
      return light?.size === "small" ? 6 : 9;
    }
    case "summit":
      return 6;
    case "goal":
      return 9;
    case "meadow":
      return 10;
    case "lantern":
      return 3.2;
    case "testimonial":
      return 2.6;
  }
}

const vertexShader = /* glsl */ `
attribute vec3 aPlace; // index, kind, half size (m)
uniform vec3 uPlacePos[${N}];
uniform vec4 uPlaceState[${N}];
uniform float uMorph;
varying vec2 vUv;
varying vec4 vState;
varying float vKind;
varying float vSeed;
void main() {
  int i = int(aPlace.x + 0.5);
  vState = uPlaceState[i];
  vKind = aPlace.y;
  vSeed = aPlace.x * 1.618;
  vUv = uv;
  float show = vState.x * smoothstep(0.6, 1.0, uMorph);
  vState.x = show;
  // Straight down from the top view: a sprite in view space lies on the ground.
  vec4 view = viewMatrix * vec4(uPlacePos[i], 1.0);
  view.xy += position.xy * 2.0 * aPlace.z * step(0.001, show);
  gl_Position = projectionMatrix * view;
}
`;

const fragmentShader = /* glsl */ `
uniform float uTime;
${paletteGLSL(COLORS)}
varying vec2 vUv;
varying vec4 vState;
varying float vKind;
varying float vSeed;

void main() {
  float show = vState.x;
  float hover = vState.y;
  float lit = vState.z;
  float current = vState.w;
  if (show <= 0.0) discard;
  float r = length(vUv - 0.5) * 2.0;
  float t = uTime;
  // The step the panel is at pulses.
  float pulse = current * (0.5 + 0.5 * sin(t * 3.0));
  vec3 col;

  if (vKind < ${K.clearing}.5) {
    // A clearing: a ring of light in the dark woods, breathing slowly.
    float ring = exp(-pow((r - 0.62) / 0.07, 2.0));
    float fill = (1.0 - smoothstep(0.0, 0.7, r)) * 0.25;
    float breathe = 0.85 + 0.15 * sin(t * 0.7 + vSeed * 4.0);
    float b = (0.35 + 0.9 * hover + 1.1 * lit + 0.8 * pulse) * breathe;
    col = mix(uClearingGlow, uMapPath, lit) * (ring + fill) * b;
  } else if (vKind < ${K.service}.5) {
    // A light of the city: a hot core in a wide halo.
    float core = exp(-r * r * 80.0);
    float halo = exp(-r * 5.0) * (1.0 - r);
    float b = 1.0 + 1.2 * hover + 0.9 * lit + 0.8 * pulse;
    col = uCityLight * (core * 3.2 + halo * 0.45) * b;
  } else if (vKind < ${K.summit}.5) {
    // The summit: a small mark on the ridge, lit when a path reaches it.
    float core = exp(-r * r * 60.0);
    float ring = exp(-pow((r - 0.55) / 0.06, 2.0));
    float b = 0.5 + 1.0 * hover + 1.2 * lit + 0.8 * pulse;
    col = uGoalLight * (core * 2.0 + ring * 0.4) * b;
  } else if (vKind < ${K.goal}.5) {
    // The goal: brighter than everything else, with rings pulsing out of it.
    float core = exp(-r * r * 70.0);
    float wave = fract(t * 0.32);
    float rings = exp(-pow((r - wave) / 0.05, 2.0)) * (1.0 - wave);
    float halo = exp(-r * 4.0) * (1.0 - r);
    float b = 1.0 + 0.8 * hover + 0.5 * lit + 0.6 * pulse;
    col = uGoalLight * (core * 5.0 + rings * 0.9 + halo * 0.5) * b;
  } else if (vKind < ${K.meadow}.5) {
    // The meadow: a faint, wide shimmer over the flower beds.
    float glow = (1.0 - smoothstep(0.0, 1.0, r)) * (0.6 + 0.4 * sin(t * 0.5));
    col = uFlowerGlow * glow * (0.12 + 0.6 * hover + 0.4 * pulse);
  } else if (vKind < ${K.lantern}.5) {
    // The lantern: small and warm, flickering a little.
    float flicker = 0.85 + 0.1 * sin(t * 7.0) + 0.05 * sin(t * 13.0 + 1.3);
    float core = exp(-r * r * 40.0);
    float halo = exp(-r * 5.0) * (1.0 - r);
    col = uLantern * (core * 2.5 + halo * 0.35) * flicker * (1.0 + hover);
  } else {
    // A testimonial: a firefly, blinking slowly.
    float blink = 0.55 + 0.45 * smoothstep(0.2, 0.9, sin(t * 0.9 + vSeed * 7.0) * 0.5 + 0.5);
    float core = exp(-r * r * 30.0);
    float halo = exp(-r * 4.0) * (1.0 - r);
    col = uFirefly * (core * 2.6 + halo * 0.4) * blink * (1.0 + 1.2 * hover);
  }

  col *= show;
  if (max(col.r, max(col.g, col.b)) < 0.002) discard;
  gl_FragColor = vec4(col, 1.0);
}
`;

/**
 * The places of the night map as lights, in one instanced draw call: the
 * clearings (rings of light in the woods), the city's lights, the summit,
 * the goal (the brightest light, pulsing), the meadow, the lantern and the
 * testimonials (fireflies). Hover, the active path and the step the panel
 * is at brighten them (mapUniforms, written by NightMap). HDR, so bloom
 * picks them up. Night only.
 */
export function MapLights() {
  const geometry = useMemo(() => {
    const quad = new PlaneGeometry(1, 1);
    const geom = new InstancedBufferGeometry();
    geom.index = quad.index;
    geom.setAttribute("position", quad.attributes.position);
    geom.setAttribute("uv", quad.attributes.uv);
    const place = new Float32Array(N * 3);
    PLACES.forEach((p, i) => place.set([i, K[p.kind], spriteSize(i)], i * 3));
    geom.setAttribute("aPlace", new InstancedBufferAttribute(place, 3));
    geom.instanceCount = N;
    return geom;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          ...paletteUniformsFor(COLORS),
          uTime: sharedUniforms.uTime,
          uMorph: sharedUniforms.uMorph,
          uPlacePos: mapUniforms.uPlacePos,
          uPlaceState: mapUniforms.uPlaceState,
        },
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        depthTest: false,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  return <mesh name="map-lights" geometry={geometry} material={material} renderOrder={7} frustumCulled={false} />;
}

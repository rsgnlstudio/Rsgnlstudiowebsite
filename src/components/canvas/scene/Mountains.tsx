"use client";

import { useMemo } from "react";
import { BufferGeometry, Float32BufferAttribute, ShaderMaterial, Vector4 } from "three";
import type { PaletteKey } from "@/config/palette";
import { paletteGLSL, paletteUniformsFor, sharedUniforms } from "../painterly/palette";
import { dissolveGLSL, paintDissolveGLSL } from "../painterly/dissolve";
import { noiseGLSL } from "../painterly/shaderChunks";

const COLORS = [
  "mountainNear",
  "mountainFar",
  "mountainShade",
  "haze",
  "skyHorizon",
  "sunGlow",
  "dustEdge",
] as const satisfies readonly PaletteKey[];

/** Ridge layers, nearest first: distance, base height, ridge amplitude. */
const LAYERS = [
  { z: -235, base: 6, amp: 22, freq: 0.012 },
  { z: -300, base: 14, amp: 30, freq: 0.009 },
  { z: -370, base: 22, amp: 42, freq: 0.0065 },
  { z: -450, base: 30, amp: 60, freq: 0.0045 },
] as const;

const vertexShader = /* glsl */ `
attribute float aLayer;
varying vec3 vWorld;
varying float vLayer;
void main() {
  vLayer = aLayer;
  vWorld = position;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
${paletteGLSL(COLORS)}
uniform vec4 uLayers[${LAYERS.length}];
uniform vec3 uSunDir;
uniform float uDusk;
uniform float uDissolve;
varying vec3 vWorld;
varying float vLayer;
${noiseGLSL}
${dissolveGLSL}
${paintDissolveGLSL}

float ridge(float x, vec4 layer) {
  float n = 0.0;
  float amp = 0.55;
  float f = layer.w;
  for (int i = 0; i < 4; i++) {
    float v = 1.0 - abs(vnoise(vec2(x * f, layer.x * 0.37)) * 2.0 - 1.0);
    n += v * v * amp;
    f *= 2.1;
    amp *= 0.45;
  }
  return layer.y + layer.z * n;
}

void main() {
  int index = int(vLayer + 0.5);
  vec4 layer = uLayers[0];
  for (int i = 1; i < ${LAYERS.length}; i++) if (i == index) layer = uLayers[i];

  // Ragged, brushy ridge edge.
  float top = ridge(vWorld.x, layer)
    + (strokes(vWorld.xy * vec2(0.08, 0.3), vec2(1.0, 0.3), 2.0) - 0.5) * layer.z * 0.12;
  if (vWorld.y > top) discard;
  // Vertical planes: fold height into depth so the crests crumble first.
  vec3 edge = dissolvePaint(vec3(vWorld.x, 0.0, vWorld.z - vWorld.y * 2.0));

  float depth = vLayer / ${(LAYERS.length - 1).toFixed(1)};
  vec3 col = mix(uMountainNear, uMountainFar, depth);
  // Slopes catch the light near the crest and dissolve into haze below.
  float h = clamp((vWorld.y - (layer.y - 25.0)) / (top - layer.y + 25.0), 0.0, 1.0);
  float st = strokes(vWorld.xy * vec2(0.05, 0.12), vec2(0.8, -0.6), 3.0);
  col *= 0.88 + 0.22 * st + 0.08 * smoothstep(0.7, 1.0, h);
  // Violet shadow strokes across the slopes.
  float shade = strokes(vWorld.xy * vec2(0.025, 0.06) + layer.x, vec2(1.0, -0.5), 2.5);
  col = mix(col, uMountainShade, smoothstep(0.45, 0.75, shade) * (0.55 - depth * 0.3));
  col = mix(col, uHaze, (1.0 - h) * 0.3 + depth * 0.12);
  col = mix(col, uSkyHorizon, depth * 0.15);

  // Sunset: the ridges toward the sun light up along their crests.
  vec2 toPoint = normalize(vWorld.xz - cameraPosition.xz);
  float sunSide = pow(max(dot(toPoint, normalize(uSunDir.xz + 1e-4)), 0.0), 6.0);
  float crest = smoothstep(top - layer.z * 0.25, top, vWorld.y);
  col = mix(col, uSunGlow * 1.2, crest * sunSide * uDusk * 0.7);

  gl_FragColor = vec4(col + edge, 1.0);
}
`;

/** Layered ridge silhouettes fading into haze toward the sky color. */
export function Mountains() {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const layers: number[] = [];
    LAYERS.forEach((layer, i) => {
      const half = Math.abs(layer.z) * 3;
      const y0 = -60;
      const y1 = layer.base + layer.amp * 1.4;
      // Two triangles per layer; far layers first so near ones draw over them.
      positions.push(
        -half, y0, layer.z, half, y0, layer.z, half, y1, layer.z,
        -half, y0, layer.z, half, y1, layer.z, -half, y1, layer.z,
      );
      for (let v = 0; v < 6; v++) layers.push(i);
    });
    const geom = new BufferGeometry();
    geom.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geom.setAttribute("aLayer", new Float32BufferAttribute(layers, 1));
    geom.computeBoundingSphere();
    return geom;
  }, []);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          ...paletteUniformsFor(COLORS),
          uSunDir: sharedUniforms.uSunDir,
          uDusk: sharedUniforms.uDusk,
          uDissolve: sharedUniforms.uDissolve,
          uLayers: {
            value: LAYERS.map((l, i) => new Vector4(i * 13.7 + 2, l.base, l.amp, l.freq)),
          },
        },
      }),
    [],
  );

  return <mesh name="mountains" geometry={geometry} material={material} />;
}

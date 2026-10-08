"use client";

import { useEffect, useMemo } from "react";
import { DoubleSide, ShaderMaterial } from "three";
import { qualityPresets } from "@/config/look";
import type { PaletteKey } from "@/config/palette";
import { useLookStore } from "@/store/look";
import { getBrushTextures, GRASS_ATLAS } from "../painterly/brushTextures";
import { dissolveGLSL, paintDissolveGLSL } from "../painterly/dissolve";
import { FIELD, overheadPoint, terrainHeight } from "../painterly/landscape";
import { paletteGLSL, paletteUniformsFor, sharedUniforms } from "../painterly/palette";
import { mulberry32, valueNoise } from "../painterly/random";
import { alphaGLSL, colorGLSL, hazeGLSL, noiseGLSL } from "../painterly/shaderChunks";
import { viewUniforms } from "../painterly/view";
import { allocateSprites, createSpriteGeometry, spriteVertexShader } from "../painterly/sprites";

const COLORS = ["grassDeep", "grassMid", "grassLight", "groundWarm", "fieldShadow", "haze", "dustEdge"] as const satisfies readonly PaletteKey[];

const fragmentShader = /* glsl */ `
${paletteGLSL(COLORS)}
uniform sampler2D uAtlas;
varying vec2 vUv;
varying vec2 vLocal;
varying float vTint;
varying vec3 vVar;
uniform float uDissolve;
varying float vDist;
varying vec3 vWorld;
${noiseGLSL}
${colorGLSL}
${hazeGLSL}
${alphaGLSL}
${dissolveGLSL}
${paintDissolveGLSL}

void main() {
  vec4 tex = texture2D(uAtlas, vUv);
  if (sharpAlpha(tex.a) < 0.5) discard;
  vec3 edge = dissolvePaint(vWorld);

  // vTint = how sunlit this tuft is; tex.r = tone of the individual blade.
  float tone = tex.r * (0.15 + 0.85 * vTint) * mix(0.55, 1.15, vLocal.y);
  vec3 col = mix(uGrassDeep, uGrassMid, smoothstep(0.0, 0.45, tone));
  col = mix(col, uGrassLight, smoothstep(0.45, 0.9, tone));
  col = mix(col, uGroundWarm, smoothstep(0.85, 1.0, tone) * 0.35);
  col = vary(col, vVar);
  // Warm aubergine shadow at the roots, deep contrast against the flowers.
  col = mix(uFieldShadow * 0.6, col, smoothstep(0.0, 0.75, vLocal.y));

  gl_FragColor = vec4(applyHaze(col, vDist) + edge, 1.0);
}
`;

/** Share of tufts spread over the night top view rather than the day wedge. */
const OVERHEAD_SHARE = 0.35;

function scatterGrass(count: number) {
  const data = allocateSprites(count);
  const rng = mulberry32(98765);
  for (let i = 0; i < count; i++) {
    let x: number;
    let d: number;
    let grow: number;
    if (rng() < OVERHEAD_SHARE) {
      // Spread over the night top view, sized to read from up there.
      [x, d] = overheadPoint(rng);
      grow = 2;
    } else {
      const band = rng();
      d =
        band < 0.1
          ? FIELD.near + rng() * 3
          : band < 0.78
            ? 4 + Math.pow(rng(), 1.2) * 22
            : 26 + Math.pow(rng(), 1.4) * (FIELD.far - 26);
      x = (rng() * 2 - 1) * (d * 1.1 + 1.5);
      // Far tufts grow so they stay readable.
      grow = 1 + Math.max(0, d - 10) * 0.035;
    }
    const z = -d;

    const height = (0.4 + rng() * 0.55) * grow;
    const sun = valueNoise(x * 0.09, z * 0.09, 3);

    data.offset.set([x, terrainHeight(x, z) - 0.05, z], i * 3);
    data.size.set([height * 0.55 * (rng() < 0.5 ? -1 : 1), height], i * 2);
    data.lean[i] = (rng() - 0.5) * 0.35;
    data.cell[i] = Math.floor(rng() * GRASS_ATLAS.cols);
    // Sunlit drifts and deep shadowed hollows.
    data.tint[i] = Math.min(1, Math.max(0, (sun - 0.35) * 1.8) + rng() * 0.3);
    data.variation.set([(rng() - 0.5) * 0.25, 0.85 + rng() * 0.3, 0.8 + rng() * 0.35], i * 3);
    data.phase[i] = rng() * Math.PI * 2;
  }
  return data;
}

/** Grass tufts between the flowers: deep shadow at the roots, lime at the tips. */
export function Grass() {
  const tier = useLookStore((s) => s.tier);
  const density = useLookStore((s) => s.flowerDensity);
  const count = Math.round(qualityPresets[tier].grass * density);

  const geometry = useMemo(() => createSpriteGeometry(scatterGrass(count)), [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: spriteVertexShader,
        fragmentShader,
        side: DoubleSide,
        uniforms: {
          ...paletteUniformsFor(COLORS),
          ...sharedUniforms,
          uAtlas: { value: getBrushTextures().grass },
          uGrid: { value: [GRASS_ATLAS.cols, GRASS_ATLAS.rows] },
          uSway: { value: 0.09 },
          uTopView: viewUniforms.uTopView,
          uTopScale: { value: 1 },
        },
      }),
    [],
  );

  return <mesh name="grass" geometry={geometry} material={material} frustumCulled={false} />;
}

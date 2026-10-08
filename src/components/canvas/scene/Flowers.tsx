"use client";

import { useEffect, useMemo } from "react";
import { DoubleSide, ShaderMaterial } from "three";
import { qualityPresets } from "@/config/look";
import type { PaletteKey } from "@/config/palette";
import { useLookStore } from "@/store/look";
import { FLOWER_ATLAS, getBrushTextures } from "../painterly/brushTextures";
import { dissolveGLSL, paintDissolveGLSL } from "../painterly/dissolve";
import { blueBandX, FIELD, overheadPoint, terrainHeight } from "../painterly/landscape";
import { paletteGLSL, paletteUniformsFor, sharedUniforms } from "../painterly/palette";
import { mulberry32, pickWeighted, valueNoise } from "../painterly/random";
import { alphaGLSL, colorGLSL, hazeGLSL, noiseGLSL } from "../painterly/shaderChunks";
import { viewUniforms } from "../painterly/view";
import { allocateSprites, createSpriteGeometry, spriteVertexShader } from "../painterly/sprites";

const COLORS = [
  "flowerPink",
  "flowerPinkDeep",
  "flowerWhite",
  "flowerYellow",
  "flowerOrange",
  "flowerBlue",
  "flowerPeriwinkle",
  "flowerCenter",
  "flowerGlow",
  "grassDeep",
  "grassMid",
  "grassLight",
  "haze",
  "dustEdge",
] as const satisfies readonly PaletteKey[];

// Tint slots, matching flowerColor() in the shader (2 = white).
const PINK = 0;
const PINK_DEEP = 1;
const YELLOW = 3;
const ORANGE = 4;
const BLUE = 5;
const PERIWINKLE = 6;

/** Per atlas cell: relative frequency, height range (m), tint weights. */
const SPECIES = [
  { weight: 22, height: [0.4, 0.75], tints: [5, 2.5, 2.5, 0, 0, 0, 0] }, // cosmos
  { weight: 14, height: [0.35, 0.65], tints: [0, 0, 8, 1, 0, 0, 0] }, // daisy
  { weight: 12, height: [0.3, 0.55], tints: [0, 0, 1, 6, 2.5, 0, 0] }, // buttercup
  { weight: 5, height: [0.45, 0.8], tints: [1, 0, 0, 0, 0, 5, 3.5] }, // lupine
  { weight: 12, height: [0.35, 0.65], tints: [6, 2, 2, 0, 0, 0, 0] }, // wild rose
  { weight: 10, height: [0.3, 0.6], tints: [4, 1, 2.5, 2, 1, 0.5, 0.5] }, // dab cluster
  { weight: 10, height: [0.4, 0.75], tints: [5, 2, 2.5, 0, 0, 0, 0] }, // side-on cosmos
  { weight: 8, height: [0.35, 0.65], tints: [0, 0, 6, 3, 0, 0, 0] }, // yarrow
] as const;
const BLUE_SPECIES = [0, 0, 0, 8, 0, 3, 0, 0];
const FAR_SPECIES = [2, 1, 2, 1, 1, 10, 1, 3];

const fragmentShader = /* glsl */ `
${paletteGLSL(COLORS)}
uniform sampler2D uAtlas;
uniform float uGlow;
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

vec3 flowerColor(float i) {
  if (i < 0.5) return uFlowerPink;
  if (i < 1.5) return uFlowerPinkDeep;
  if (i < 2.5) return uFlowerWhite;
  if (i < 3.5) return uFlowerYellow;
  if (i < 4.5) return uFlowerOrange;
  if (i < 5.5) return uFlowerBlue;
  return uFlowerPeriwinkle;
}

void main() {
  vec4 tex = texture2D(uAtlas, vUv);
  if (sharpAlpha(tex.a) < 0.5) discard;
  vec3 edge = dissolvePaint(vWorld);

  vec3 petal = vary(flowerColor(vTint), vVar);
  vec3 col = petal * (0.42 + 0.72 * tex.r);
  vec3 centre = vary(uFlowerCenter, vec3(vVar.x * 0.5, 1.0, vVar.z)) * (0.55 + 0.6 * tex.r);
  col = mix(col, centre, step(0.5, tex.g));
  vec3 stem = mix(uGrassDeep, uGrassMid, tex.r);
  stem = mix(stem, uGrassLight, smoothstep(0.75, 1.0, tex.r) * 0.6);
  col = mix(col, stem * mix(0.5, 1.0, vLocal.y), step(0.5, tex.b));

  // Night: some flowers glow, the pale and blue ones most (HDR, so they bloom).
  float petalMask = (1.0 - step(0.5, tex.g)) * (1.0 - step(0.5, tex.b));
  float glowing = step(0.72, fract(vVar.z * 37.0 + vVar.y * 11.0));
  float pale = vTint > 1.5 && vTint < 2.5 || vTint > 4.5 ? 1.0 : 0.4;
  col += uFlowerGlow * uGlow * petalMask * glowing * pale * (0.6 + 0.7 * tex.r);

  gl_FragColor = vec4(applyHaze(col, vDist) + edge, 1.0);
}
`;

/** Share of flowers spread over the night top view rather than the day wedge. */
const OVERHEAD_SHARE = 0.35;

function scatterFlowers(count: number) {
  const data = allocateSprites(count);
  const rng = mulberry32(1234);
  for (let i = 0; i < count; i++) {
    let x: number;
    let d: number;
    let grow: number;
    if (rng() < OVERHEAD_SHARE) {
      // Spread over the night top view, sized to read from up there.
      [x, d] = overheadPoint(rng);
      grow = 2.2;
    } else {
      // Most flowers in the midground, where the eye lands.
      const band = rng();
      d =
        band < 0.05
          ? FIELD.near + rng() * 3.5
          : band < 0.75
            ? 4.5 + Math.pow(rng(), 1.1) * 22
            : 24 + Math.pow(rng(), 1.5) * (FIELD.far - 24);
      x = (rng() * 2 - 1) * (d * 1.1 + 1.5);
      // Far flowers grow so they stay readable.
      grow = 1 + Math.max(0, d - 10) * 0.03;
    }
    const z = -d;

    // Species: blue drift along the band, dabs in the far field, else mixed.
    const inBlue = Math.abs(x - blueBandX(d)) < 0.3 + d * 0.035 && rng() < 0.6;
    const weights = inBlue
      ? BLUE_SPECIES
      : d > 30
        ? FAR_SPECIES
        : SPECIES.map((s) => s.weight);
    const cell = pickWeighted(rng, weights);
    const species = SPECIES[cell];

    // Tint: clustered drifts of the same color, like a real meadow.
    const drift = valueNoise(x * 0.12, z * 0.12, 7);
    const tints = species.tints.map((w, t) => {
      if (t === YELLOW || t === ORANGE) return w * (0.4 + drift * 1.6);
      if (t === PINK || t === PINK_DEEP) return w * (1.4 - drift);
      return w;
    });
    const tint = inBlue && cell !== 3 ? (rng() < 0.7 ? BLUE : PERIWINKLE) : pickWeighted(rng, tints);

    const [h0, h1] = species.height;
    // Far flowers grow so they stay readable as dabs of color.

    const height = (h0 + rng() * (h1 - h0)) * grow;

    data.offset.set([x, terrainHeight(x, z) - 0.04, z], i * 3);
    data.size.set([height * 0.5 * (rng() < 0.5 ? -1 : 1), height], i * 2);
    data.lean[i] = (rng() - 0.5) * 0.3;
    data.cell[i] = cell;
    data.tint[i] = tint;
    data.variation.set([(rng() - 0.5) * 0.22, 0.85 + rng() * 0.3, 0.85 + rng() * 0.28], i * 3);
    data.phase[i] = rng() * Math.PI * 2;
  }
  return data;
}

/** The midground flower field: one instanced draw for every flower. */
export function Flowers() {
  const tier = useLookStore((s) => s.tier);
  const density = useLookStore((s) => s.flowerDensity);
  const count = Math.round(qualityPresets[tier].flowers * density);

  const geometry = useMemo(() => createSpriteGeometry(scatterFlowers(count)), [count]);
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
          uAtlas: { value: getBrushTextures().flowers },
          uGrid: { value: [FLOWER_ATLAS.cols, FLOWER_ATLAS.rows] },
          uSway: { value: 0.07 },
          uTopView: viewUniforms.uTopView,
          uTopScale: { value: 1 },
        },
      }),
    [],
  );

  return <mesh name="flowers" geometry={geometry} material={material} frustumCulled={false} />;
}

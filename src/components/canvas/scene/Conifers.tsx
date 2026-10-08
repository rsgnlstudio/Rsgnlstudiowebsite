"use client";

import { useEffect, useMemo } from "react";
import { DoubleSide, ShaderMaterial } from "three";
import { qualityPresets } from "@/config/look";
import type { PaletteKey } from "@/config/palette";
import { useLookStore } from "@/store/look";
import { CONIFER_ATLAS, getBrushTextures } from "../painterly/brushTextures";
import { clearingHalfWidth } from "../painterly/landscape";
import { paletteGLSL, paletteUniformsFor, sharedUniforms } from "../painterly/palette";
import { mulberry32 } from "../painterly/random";
import { alphaGLSL, colorGLSL, hazeGLSL } from "../painterly/shaderChunks";
import { viewUniforms } from "../painterly/view";
import { allocateSprites, createSpriteGeometry, spriteVertexShader } from "../painterly/sprites";

const COLORS = ["coniferDark", "coniferLight", "haze"] as const satisfies readonly PaletteKey[];

const fragmentShader = /* glsl */ `
${paletteGLSL(COLORS)}
uniform sampler2D uAtlas;
varying vec2 vUv;
varying vec2 vLocal;
varying float vTint;
varying vec3 vVar;
varying float vDist;
${colorGLSL}
${hazeGLSL}
${alphaGLSL}

void main() {
  vec4 tex = texture2D(uAtlas, vUv);
  if (sharpAlpha(tex.a) < 0.5) discard;
  vec3 col = mix(uConiferDark, uConiferLight, pow(tex.r, 2.0));
  col = vary(col, vVar);
  // Distant trees sink further into the haze than the ground does.
  gl_FragColor = vec4(applyHaze(col, vDist * vTint), 1.0);
}
`;

function scatterConifers(count: number) {
  const data = allocateSprites(count);
  const rng = mulberry32(4242);
  const edge = Math.round(count * 0.72);
  for (let i = 0; i < count; i++) {
    let x: number;
    let d: number;
    let height: number;
    if (i < edge) {
      // Tree lines framing the meadow on both sides.
      const side = i % 2 === 0 ? -1 : 1;
      d = 14 + Math.pow(rng(), 1.4) * 65;
      x = side * (clearingHalfWidth(d) + Math.pow(rng(), 1.5) * d * 1.3);
      height = (13 + rng() * 17) * (1 + d / 120);
      data.tint[i] = 0.25;
    } else {
      // A hazy far tree line below the mountains.
      d = 120 + rng() * 60;
      // Thinner in the middle so the view to the mountains stays open.
      const u = rng() * 2 - 1;
      x = Math.sign(u) * Math.pow(Math.abs(u), 0.6) * d * 1.3;
      height = 4 + rng() * 5;
      data.tint[i] = 0.5;
    }
    const z = -d;
    // y is relative to the ground; the shader seats the tree (SQUEEZE).
    data.offset.set([x, -0.8, z], i * 3);
    const slim = i < edge ? 0.27 : 0.45;
    data.size.set([height * slim * (rng() < 0.5 ? -1 : 1), height], i * 2);
    data.lean[i] = (rng() - 0.5) * 0.04;
    data.cell[i] = Math.floor(rng() * CONIFER_ATLAS.cols);
    data.variation.set([(rng() - 0.5) * 0.3, 0.8 + rng() * 0.4, 0.75 + rng() * 0.5], i * 3);
    data.phase[i] = rng() * Math.PI * 2;
  }
  return data;
}

/** Near-black conifer silhouettes at the edges of the meadow. */
export function Conifers() {
  const tier = useLookStore((s) => s.tier);
  const count = qualityPresets[tier].conifers;

  const geometry = useMemo(() => createSpriteGeometry(scatterConifers(count), 2), [count]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: spriteVertexShader,
        fragmentShader,
        side: DoubleSide,
        defines: { SQUEEZE: "" },
        uniforms: {
          ...paletteUniformsFor(COLORS),
          ...sharedUniforms,
          uAtlas: { value: getBrushTextures().conifer },
          uGrid: { value: [CONIFER_ATLAS.cols, CONIFER_ATLAS.rows] },
          uSway: { value: 0.01 },
          uSqueeze: viewUniforms.uTreeSqueeze,
        },
      }),
    [],
  );

  return <mesh name="conifers" geometry={geometry} material={material} frustumCulled={false} />;
}

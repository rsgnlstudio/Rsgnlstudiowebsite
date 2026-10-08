"use client";

import { useEffect, useMemo } from "react";
import { DoubleSide, ShaderMaterial } from "three";
import { qualityPresets } from "@/config/look";
import type { PaletteKey } from "@/config/palette";
import { useLookStore } from "@/store/look";
import { CONIFER_ATLAS, getBrushTextures } from "../painterly/brushTextures";
import { scatterConifers } from "../painterly/conifers";
import { dissolveGLSL, paintDissolveGLSL } from "../painterly/dissolve";
import { paletteGLSL, paletteUniformsFor, sharedUniforms } from "../painterly/palette";
import { alphaGLSL, colorGLSL, hazeGLSL, noiseGLSL } from "../painterly/shaderChunks";
import { viewUniforms } from "../painterly/view";
import { createSpriteGeometry, spriteVertexShader } from "../painterly/sprites";

const COLORS = ["coniferDark", "coniferLight", "haze", "dustEdge"] as const satisfies readonly PaletteKey[];

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
  vec3 col = mix(uConiferDark, uConiferLight, pow(tex.r, 2.0));
  col = vary(col, vVar);
  // Distant trees sink further into the haze than the ground does.
  gl_FragColor = vec4(applyHaze(col, vDist * vTint) + edge, 1.0);
}
`;

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
          uTopView: viewUniforms.uTopView,
          uTopScale: { value: 0.5 },
        },
      }),
    [],
  );

  return <mesh name="conifers" geometry={geometry} material={material} frustumCulled={false} />;
}

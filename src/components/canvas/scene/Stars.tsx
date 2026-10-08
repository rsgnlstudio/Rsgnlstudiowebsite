"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, BufferGeometry, Float32BufferAttribute, type Points, ShaderMaterial } from "three";
import { qualityPresets } from "@/config/look";
import type { PaletteKey } from "@/config/palette";
import { useLookStore } from "@/store/look";
import { paletteGLSL, paletteUniformsFor, sharedUniforms } from "../painterly/palette";
import { mulberry32 } from "../painterly/random";

const COLORS = ["moon"] as const satisfies readonly PaletteKey[];
const pixelRatio = { value: 1 };

const vertexShader = /* glsl */ `
attribute float aSeed;
uniform float uTime;
uniform float uGlow;
uniform float uPixelRatio;
varying float vBright;
void main() {
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
  float twinkle = 0.65 + 0.35 * sin(uTime * (0.8 + aSeed * 2.0) + aSeed * 40.0);
  // Stars come out only once night has set in, faint ones last.
  vBright = smoothstep(aSeed * 0.6, aSeed * 0.6 + 0.4, uGlow) * twinkle;
  gl_PointSize = (1.5 + aSeed * 2.5) * uPixelRatio;
}
`;

const fragmentShader = /* glsl */ `
${paletteGLSL(COLORS)}
varying float vBright;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = 1.0 - smoothstep(0.2, 0.5, d);
  if (a * vBright < 0.01) discard;
  gl_FragColor = vec4(uMoon * 1.8 * vBright, a);
}
`;

/** Star field on the upper sky, fading in and twinkling as night falls. */
export function Stars() {
  const tier = useLookStore((s) => s.tier);
  const count = qualityPresets[tier].stars;
  const points = useRef<Points>(null);

  const geometry = useMemo(() => {
    const rng = mulberry32(777);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Uniform over the upper hemisphere, denser toward the zenith.
      const az = rng() * Math.PI * 2;
      const el = Math.asin(0.04 + 0.96 * Math.pow(rng(), 0.7));
      positions.set([Math.sin(az) * Math.cos(el) * 450, Math.sin(el) * 450, -Math.cos(az) * Math.cos(el) * 450], i * 3);
      seeds[i] = Math.pow(rng(), 2);
    }
    const geom = new BufferGeometry();
    geom.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geom.setAttribute("aSeed", new Float32BufferAttribute(seeds, 1));
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
          uTime: sharedUniforms.uTime,
          uGlow: sharedUniforms.uGlow,
          uPixelRatio: pixelRatio,
        },
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  useFrame(({ camera, gl }) => {
    points.current?.position.copy(camera.position);
    pixelRatio.value = gl.getPixelRatio();
  });

  return (
    <points ref={points} name="stars" geometry={geometry} material={material} renderOrder={-9} frustumCulled={false} />
  );
}

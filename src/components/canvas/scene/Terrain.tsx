"use client";

import { useMemo } from "react";
import { PlaneGeometry, ShaderMaterial } from "three";
import type { PaletteKey } from "@/config/palette";
import { terrainHeight } from "../painterly/landscape";
import { paletteGLSL, paletteUniformsFor } from "../painterly/palette";
import { colorGLSL, hazeGLSL, noiseGLSL } from "../painterly/shaderChunks";
import { Mountains } from "./Mountains";

const COLORS = [
  "groundDeep",
  "groundMid",
  "groundLight",
  "groundWarm",
  "fieldShadow",
  "flowerPink",
  "flowerWhite",
  "flowerYellow",
  "flowerBlue",
  "haze",
] as const satisfies readonly PaletteKey[];

const vertexShader = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const fragmentShader = /* glsl */ `
${paletteGLSL(COLORS)}
varying vec3 vWorld;
${noiseGLSL}
${colorGLSL}
${hazeGLSL}

void main() {
  vec2 p = vWorld.xz;
  float dist = distance(cameraPosition.xz, p);

  // Large painted patches, then horizontal strokes inside them.
  float patchN = fbm(p * vec2(0.035, 0.07));
  float tone = fbm(p * vec2(0.2, 0.45) + patchN * 2.0);
  float st = strokes(p * vec2(0.9, 2.6), vec2(1.0, 0.2), 2.5);
  float t = tone + (st - 0.5) * 0.4;

  vec3 col = mix(uGroundDeep, uGroundMid, smoothstep(0.32, 0.55, t));
  col = mix(col, uGroundLight, smoothstep(0.56, 0.72, t + st * 0.15) * 0.85);
  col = mix(col, uGroundWarm, smoothstep(0.6, 0.75, patchN) * smoothstep(0.4, 0.7, st) * 0.6);

  // Close to the camera the ground sits in the shadow of the grass.
  col = mix(col, mix(uGroundDeep, uFieldShadow, 0.5), (1.0 - smoothstep(3.0, 20.0, dist)) * 0.7);

  // Far field: flowers become flat horizontal dabs painted into the ground.
  vec2 cell = p * vec2(0.7, 2.2);
  vec2 id = floor(cell);
  vec2 f = fract(cell) - 0.5;
  float h = hash12(id);
  vec2 jitter = vec2(hash12(id + 7.1), hash12(id + 3.7)) - 0.5;
  float dabShape = 1.0 - smoothstep(0.22, 0.32, length((f - jitter * 0.4) * vec2(0.8, 1.3)));
  float field = smoothstep(22.0, 55.0, dist) * step(0.45, h);
  vec3 flower = h < 0.62 ? uFlowerPink : h < 0.78 ? uFlowerWhite : h < 0.9 ? uFlowerYellow : uFlowerBlue;
  flower = vary(flower, vec3((hash12(id + 1.3) - 0.5) * 0.2, 1.0, 0.85 + hash12(id + 9.1) * 0.25));
  // Fade dabs out where they would shimmer (sub-pixel cells).
  float detail = 1.0 - smoothstep(0.35, 0.8, fwidth(cell.y));
  col = mix(col, flower, dabShape * field * detail * 0.9);

  col = applyHaze(col, dist);
  gl_FragColor = vec4(col, 1.0);
}
`;

/** Rolling meadow ground with painted color variation, plus the mountains. */
export function Terrain() {
  const geometry = useMemo(() => {
    const plane = new PlaneGeometry(420, 260, 140, 160);
    plane.rotateX(-Math.PI / 2);
    plane.translate(0, 0, -120);
    const position = plane.attributes.position;
    for (let i = 0; i < position.count; i++) {
      position.setY(i, terrainHeight(position.getX(i), position.getZ(i)));
    }
    plane.computeBoundingSphere();
    return plane;
  }, []);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: paletteUniformsFor(COLORS),
      }),
    [],
  );

  return (
    <group name="terrain">
      <mesh geometry={geometry} material={material} />
      <Mountains />
    </group>
  );
}

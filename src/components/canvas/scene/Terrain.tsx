"use client";

import { useMemo } from "react";
import { PlaneGeometry, ShaderMaterial } from "three";
import type { PaletteKey } from "@/config/palette";
import { terrainHeight } from "../painterly/landscape";
import { paletteGLSL, paletteUniformsFor, sharedUniforms } from "../painterly/palette";
import { dissolveGLSL, paintDissolveGLSL } from "../painterly/dissolve";
import { colorGLSL, hazeGLSL, noiseGLSL } from "../painterly/shaderChunks";
import { viewUniforms } from "../painterly/view";
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
  "flowerGlow",
  "haze",
  "dustEdge",
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
uniform float uGlow;
uniform float uTopView;
uniform float uDissolve;
varying vec3 vWorld;
${noiseGLSL}
${colorGLSL}
${hazeGLSL}
${dissolveGLSL}
${paintDissolveGLSL}

// A grid of flower dabs painted over col; keep is the share of cells
// with a dab. Some glow at night (HDR, so they bloom).
vec3 dabs(vec3 col, vec2 p, vec2 scale, vec2 shape, float keep, float amount) {
  vec2 cell = p * scale;
  vec2 id = floor(cell);
  vec2 f = fract(cell) - 0.5;
  float h = hash12(id);
  vec2 jitter = vec2(hash12(id + 7.1), hash12(id + 3.7)) - 0.5;
  float dabShape = 1.0 - smoothstep(0.22, 0.32, length((f - jitter * 0.4) * shape));
  vec3 flower = h < 0.62 ? uFlowerPink : h < 0.78 ? uFlowerWhite : h < 0.9 ? uFlowerYellow : uFlowerBlue;
  flower = vary(flower, vec3((hash12(id + 1.3) - 0.5) * 0.2, 1.0, 0.85 + hash12(id + 9.1) * 0.25));
  flower += uFlowerGlow * uGlow * step(0.9, hash12(id + 5.3)) * 0.8;
  // Fade dabs out where they would shimmer (sub-pixel cells).
  float detail = 1.0 - smoothstep(0.35, 0.8, max(fwidth(cell.x), fwidth(cell.y)));
  return mix(col, flower, dabShape * amount * step(1.0 - keep, h) * detail * 0.9);
}

// Painted ground: large patches, then strokes inside them. aniso = 1
// stretches everything sideways for the low day view (the ground is seen
// foreshortened); 0 keeps it even for the top view.
vec3 ground(vec2 p, float aniso) {
  float patchN = fbm(p * mix(vec2(0.03), vec2(0.035, 0.07), aniso));
  float tone = fbm(p * mix(vec2(0.12), vec2(0.2, 0.45), aniso) + patchN * 2.0);
  float st = strokes(p * mix(vec2(0.8), vec2(0.9, 2.6), aniso), vec2(1.0, 0.2), mix(2.0, 2.5, aniso));
  float t = tone + (st - 0.5) * 0.4;

  vec3 col = mix(uGroundDeep, uGroundMid, smoothstep(0.32, 0.55, t));
  col = mix(col, uGroundLight, smoothstep(0.56, 0.72, t + st * 0.15) * 0.85);
  return mix(col, uGroundWarm, smoothstep(0.6, 0.75, patchN) * smoothstep(0.4, 0.7, st) * 0.6);
}

void main() {
  vec3 edge = dissolvePaint(vWorld);
  vec2 p = vWorld.xz;
  float dist = distance(cameraPosition, vWorld);

  // Cross-fade the day and top view looks with the camera, rather than
  // morphing one pattern, so nothing swims during the transition.
  vec3 col = vec3(0.0);
  float field = smoothstep(22.0, 55.0, dist);
  if (uTopView < 1.0) {
    vec3 day = ground(p, 1.0);
    // Close to the camera the ground sits in the shadow of the grass.
    day = mix(day, mix(uGroundDeep, uFieldShadow, 0.5), (1.0 - smoothstep(3.0, 20.0, dist)) * 0.7);
    // Far field: flowers become flat horizontal dabs painted into the ground.
    col += dabs(day, p, vec2(0.7, 2.2), vec2(0.8, 1.3), 0.55, field) * (1.0 - uTopView);
  }
  if (uTopView > 0.0) {
    col += dabs(ground(p, 0.0), p, vec2(0.9), vec2(1.0), 0.14, field * 0.75) * uTopView;
  }

  col = applyHaze(col, dist);
  gl_FragColor = vec4(col + edge, 1.0);
}
`;

/**
 * Rolling meadow ground with painted color variation, plus the mountains.
 * The plane reaches past the original camera (+z) so the night top view
 * never sees its edge.
 */
export function Terrain() {
  const geometry = useMemo(() => {
    const plane = new PlaneGeometry(420, 340, 140, 210);
    plane.rotateX(-Math.PI / 2);
    plane.translate(0, 0, -80);
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
        uniforms: {
          ...paletteUniformsFor(COLORS),
          uGlow: sharedUniforms.uGlow,
          uTopView: viewUniforms.uTopView,
          uDissolve: sharedUniforms.uDissolve,
        },
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

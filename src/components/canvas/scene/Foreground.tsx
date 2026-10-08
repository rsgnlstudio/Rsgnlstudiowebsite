"use client";

import { useMemo } from "react";
import {
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  PlaneGeometry,
  ShaderMaterial,
} from "three";
import type { PaletteKey } from "@/config/palette";
import { FLOWER_ATLAS, getBrushTextures, LEAF_ATLAS } from "../painterly/brushTextures";
import { paletteGLSL, paletteUniformsFor, sharedUniforms } from "../painterly/palette";
import { dissolveGLSL, paintDissolveGLSL } from "../painterly/dissolve";
import { colorGLSL, noiseGLSL } from "../painterly/shaderChunks";
import { viewUniforms } from "../painterly/view";

/**
 * A camera-locked element. `anchor` is in normalised screen space (-1..1,
 * may sit past the edge); size is in half-frame-heights so shapes keep their
 * proportions at every aspect ratio. The quad pivots on its bottom edge and
 * `rotation` turns it (0 = growing up, PI = hanging down).
 */
interface ForegroundItem {
  anchor: [number, number];
  depth: number;
  size: [number, number];
  rotation: number;
  cell: number;
  tint: number;
}

// Branches hang in from the top and the right side.
const LEAVES: ForegroundItem[] = [
  { anchor: [-0.7, 1.12], depth: 0.8, size: [0.95, 0.95], rotation: Math.PI + 0.55, cell: 0, tint: 0 },
  { anchor: [0.55, 1.15], depth: 0.9, size: [0.7, 0.7], rotation: Math.PI - 0.4, cell: 1, tint: 0 },
  { anchor: [1.08, 0.95], depth: 0.8, size: [0.9, 0.9], rotation: Math.PI * 0.72, cell: 1, tint: 0 },
  { anchor: [1.12, 0.3], depth: 0.85, size: [0.85, 0.85], rotation: Math.PI / 2 + 0.25, cell: 0, tint: 0 },
];

// Large soft flowers right in front of the lens. Tints as in Flowers.tsx.
const FLOWERS: ForegroundItem[] = [
  { anchor: [-0.78, -1.2], depth: 1.6, size: [0.62, 1.25], rotation: 0.12, cell: 0, tint: 0 },
  { anchor: [-1.05, -0.95], depth: 1.9, size: [0.5, 1.0], rotation: 0.3, cell: 4, tint: 1 },
  { anchor: [-0.25, -1.34], depth: 1.8, size: [0.45, 0.9], rotation: -0.05, cell: 1, tint: 2 },
  { anchor: [0.15, -1.42], depth: 1.7, size: [0.42, 0.85], rotation: 0.1, cell: 6, tint: 1 },
  { anchor: [0.56, -1.22], depth: 1.5, size: [0.65, 1.3], rotation: -0.15, cell: 4, tint: 0 },
  { anchor: [0.98, -1.05], depth: 1.8, size: [0.5, 1.0], rotation: -0.25, cell: 0, tint: 2 },
];

const vertexShader = /* glsl */ `
attribute vec2 aAnchor;
attribute float aDepth;
attribute vec2 aSize;
attribute float aRot;
attribute float aCell;
attribute float aTint;
attribute float aPhase;

uniform float uTanHalfFov;
uniform float uAspect;
uniform vec2 uParallax;
uniform vec2 uGrid;
uniform float uSway;
uniform float uTime;
uniform float uWind;
uniform float uTopView;

varying vec2 vUv;
varying float vTint;
varying float vFade;
varying vec3 vDissolvePos;

void main() {
  float halfH = aDepth * uTanHalfFov;
  float halfW = halfH * uAspect;
  // On narrow screens size follows the width so the frame isn't swamped.
  vec2 size = aSize * min(halfH, halfW * 1.25);

  float t = uv.y;
  float sway = uWind * uSway * (sin(uTime * 0.35 + aPhase) * 0.8 + sin(uTime * 0.7 + aPhase * 2.3) * 0.2);
  float a = aRot + sway * t;
  vec2 local = vec2(position.x * size.x, t * size.y);
  vec2 rotated = vec2(cos(a) * local.x - sin(a) * local.y, sin(a) * local.x + cos(a) * local.y);

  // Rising into the top view, the camera leaves the branches and flowers
  // behind: they slide out past the frame edges and fade.
  vec2 anchor = aAnchor * (1.0 + uTopView * 1.5);
  vec3 view = vec3(anchor * vec2(halfW, halfH) + rotated + uParallax, -aDepth);
  gl_Position = projectionMatrix * vec4(view, 1.0);
  // Locked to the camera, so it dissolves in screen space.
  vec2 screen = view.xy / vec2(halfW, halfH);
  vDissolvePos = vec3(screen.x * 30.0, 0.0, -screen.y * 30.0 - 60.0);

  float col = mod(aCell, uGrid.x);
  float row = floor(aCell / uGrid.x);
  vUv = vec2((col + uv.x) / uGrid.x, (uGrid.y - 1.0 - row + uv.y) / uGrid.y);
  vTint = aTint;
  vFade = 1.0 - smoothstep(0.0, 0.5, uTopView);
}
`;

const LEAF_COLORS = ["leafDark", "leafMid", "leafLight", "dustEdge"] as const satisfies readonly PaletteKey[];
const FLOWER_COLORS = [
  "flowerPink",
  "flowerPinkDeep",
  "flowerWhite",
  "flowerCenter",
  "grassDeep",
  "grassMid",
  "dustEdge",
] as const satisfies readonly PaletteKey[];

const leafFragment = /* glsl */ `
${paletteGLSL(LEAF_COLORS)}
uniform sampler2D uAtlas;
varying vec2 vUv;
varying float vFade;
uniform float uDissolve;
varying vec3 vDissolvePos;
${noiseGLSL}
${dissolveGLSL}
${paintDissolveGLSL}
void main() {
  vec4 tex = texture2D(uAtlas, vUv);
  vec3 col = mix(uLeafDark, uLeafMid, tex.r);
  col = mix(col, uLeafLight, tex.g * 0.6);
  col += dissolvePaint(vDissolvePos);
  gl_FragColor = vec4(col, smoothstep(0.05, 0.55, tex.a) * vFade);
}
`;

const flowerFragment = /* glsl */ `
${paletteGLSL(FLOWER_COLORS)}
uniform sampler2D uAtlas;
varying vec2 vUv;
varying float vTint;
varying float vFade;
uniform float uDissolve;
varying vec3 vDissolvePos;
${noiseGLSL}
${dissolveGLSL}
${paintDissolveGLSL}
${colorGLSL}
void main() {
  vec4 tex = texture2D(uAtlas, vUv);
  vec3 petal = vTint < 0.5 ? uFlowerPink : vTint < 1.5 ? uFlowerPinkDeep : uFlowerWhite;
  vec3 col = petal * (0.5 + 0.6 * tex.r);
  col = mix(col, uFlowerCenter * (0.7 + 0.4 * tex.r), smoothstep(0.3, 0.7, tex.g));
  col = mix(col, mix(uGrassDeep, uGrassMid, tex.r), smoothstep(0.3, 0.7, tex.b));
  col += dissolvePaint(vDissolvePos);
  gl_FragColor = vec4(col, smoothstep(0.08, 0.6, tex.a) * vFade);
}
`;

function createGeometry(items: ForegroundItem[]) {
  const base = new PlaneGeometry(1, 1, 1, 4);
  const geometry = new InstancedBufferGeometry();
  geometry.index = base.index;
  geometry.setAttribute("position", base.attributes.position);
  geometry.setAttribute("uv", base.attributes.uv);
  const attr = (fn: (item: ForegroundItem, i: number) => number[], size: number) =>
    new InstancedBufferAttribute(new Float32Array(items.flatMap(fn)), size);
  geometry.setAttribute("aAnchor", attr((it) => it.anchor, 2));
  geometry.setAttribute("aDepth", attr((it) => [it.depth], 1));
  geometry.setAttribute("aSize", attr((it) => it.size, 2));
  geometry.setAttribute("aRot", attr((it) => [it.rotation], 1));
  geometry.setAttribute("aCell", attr((it) => [it.cell], 1));
  geometry.setAttribute("aTint", attr((it) => [it.tint], 1));
  geometry.setAttribute("aPhase", attr((_, i) => [i * 1.7], 1));
  geometry.instanceCount = items.length;
  return geometry;
}

function createMaterial(fragmentShader: string, uniforms: Record<string, unknown>) {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: { ...viewUniforms, ...sharedUniforms, ...uniforms },
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
}

/**
 * The out-of-focus layer right in front of the lens: branches from the top
 * and side, big flowers at the bottom. Locked to the camera and drawn last.
 * Faked depth of field: the textures are pre-blurred and the layer writes no
 * depth, so the real DOF pass leaves it alone.
 */
export function Foreground() {
  const leaves = useMemo(() => {
    const geometry = createGeometry(LEAVES);
    const material = createMaterial(leafFragment, {
      ...paletteUniformsFor(LEAF_COLORS),
      uAtlas: { value: getBrushTextures().leaves },
      uGrid: { value: [LEAF_ATLAS.cols, LEAF_ATLAS.rows] },
      uSway: { value: 0.035 },
    });
    return { geometry, material };
  }, []);

  const flowers = useMemo(() => {
    const geometry = createGeometry(FLOWERS);
    const material = createMaterial(flowerFragment, {
      ...paletteUniformsFor(FLOWER_COLORS),
      uAtlas: { value: getBrushTextures().flowersSoft },
      uGrid: { value: [FLOWER_ATLAS.cols, FLOWER_ATLAS.rows] },
      uSway: { value: 0.04 },
    });
    return { geometry, material };
  }, []);

  return (
    <group name="foreground">
      <mesh {...flowers} renderOrder={10} frustumCulled={false} />
      <mesh {...leaves} renderOrder={11} frustumCulled={false} />
    </group>
  );
}

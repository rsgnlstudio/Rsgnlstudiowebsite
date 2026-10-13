import {
  type Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  PlaneGeometry,
  ShaderMaterial,
} from "three";
import type { PaletteKey } from "@/config/palette";
import { brushCell, brushGLSL, getBrushAtlas } from "./brushes";
import { dustUniforms } from "./dust";
import { paletteArrayFor, paletteGLSL, paletteUniformsFor } from "./palette";
import { wetGLSL, wetUniforms } from "./WetCanvasPass";

/** Paints of the nightingale, indexed by its strokes. */
const COLORS = [
  "nightingale",
  "nightingaleTail",
  "nightingaleBreast",
  "nightingaleDark",
] as const satisfies readonly PaletteKey[];
const paint = (key: (typeof COLORS)[number]) => COLORS.indexOf(key);

/** Palette colors the glow reads. */
const GLOW_KEYS = ["cursorLight", "dustLit"] as const satisfies readonly PaletteKey[];

/**
 * One brushstroke of the bird, in the bird frame: x forward (to the beak),
 * y up, z to its right; one unit is the bird's length.
 */
interface BirdStroke {
  start: readonly [number, number, number];
  vec: readonly [number, number, number];
  width: number;
  /** Sideways curve, as a fraction of the stroke's length. */
  bend?: number;
  brush: number;
  color: number;
  /** 0 = shadow, 1 = local color, 2 = light. */
  shade?: number;
  /** -1 left wing, 1 right wing, 0 body. Wing strokes beat around the shoulder. */
  wing?: number;
}

/** Shoulder the wings beat around, in the bird frame (z is mirrored per wing). */
const SHOULDER = [0.04, 0.07, 0.06] as const;

/**
 * The nightingale as a painter would put it down in a few strokes: a plain
 * brown back over a pale buff breast, a rufous tail, a dark eye and a thin
 * beak, and two wings of a covert stroke and long flight feathers. Strokes
 * are in painting order: later ones lie on top.
 */
function paintNightingale(): BirdStroke[] {
  const strokes: BirdStroke[] = [];
  // Far parts first: the tail, fanned a little.
  strokes.push(
    { start: [-0.22, 0.03, 0], vec: [-0.42, -0.06, 0], width: 0.15, bend: 0.06, brush: brushCell("round", 2), color: paint("nightingaleTail"), shade: 0.6 },
    { start: [-0.2, 0.05, 0], vec: [-0.46, 0.02, 0], width: 0.13, bend: -0.04, brush: brushCell("round", 5), color: paint("nightingaleTail"), shade: 1.4 },
  );
  for (const side of [-1, 1]) {
    const z = SHOULDER[2] * side;
    // Covert: the broad inner wing.
    strokes.push({ start: [0.12, 0.07, z], vec: [-0.16, 0.0, 0.36 * side], width: 0.2, bend: 0.12 * side, brush: brushCell("filbert", 1), color: paint("nightingale"), shade: 1.2, wing: side });
    // Flight feathers: long, darker, sweeping back to the tip.
    strokes.push({ start: [0.0, 0.07, 0.1 * side], vec: [-0.3, 0.0, 0.32 * side], width: 0.16, bend: -0.08 * side, brush: brushCell("round", 3 + side), color: paint("nightingale"), shade: 0.4, wing: side });
    strokes.push({ start: [0.06, 0.07, 0.3 * side], vec: [-0.26, 0.0, 0.2 * side], width: 0.1, bend: 0.05, brush: brushCell("round", 6), color: paint("nightingaleDark"), shade: 1.6, wing: side });
  }
  // The body: breast below, back above, then the head.
  strokes.push(
    { start: [-0.26, -0.05, 0], vec: [0.58, 0.02, 0], width: 0.26, bend: -0.1, brush: brushCell("filbert", 4), color: paint("nightingaleBreast"), shade: 1 },
    { start: [-0.3, 0.05, 0], vec: [0.6, 0.04, 0], width: 0.22, bend: 0.12, brush: brushCell("filbert", 6), color: paint("nightingale"), shade: 1 },
    { start: [0.22, 0.07, 0], vec: [0.2, 0.0, 0], width: 0.19, bend: 0.1, brush: brushCell("dab", 2), color: paint("nightingale"), shade: 1.3 },
    { start: [0.24, -0.04, 0], vec: [0.16, 0.05, 0], width: 0.11, brush: brushCell("dab", 5), color: paint("nightingaleBreast"), shade: 1.8 },
    // Beak and eye.
    { start: [0.4, 0.06, 0], vec: [0.12, -0.02, 0], width: 0.035, brush: brushCell("round", 1), color: paint("nightingaleDark"), shade: 1 },
    { start: [0.33, 0.1, 0], vec: [0.045, 0.0, 0], width: 0.05, brush: brushCell("dab", 7), color: paint("nightingaleDark"), shade: 0.5 },
  );
  return strokes;
}

/** Instanced ribbons for the bird's strokes, in painting order. */
export function createNightingaleGeometry(segments = 8) {
  const strokes = paintNightingale();
  const base = new PlaneGeometry(1, 1, segments, 1);
  // x: 0 where the brush lands .. 1 where it lifts off, y: -0.5 .. 0.5 across.
  base.translate(0.5, 0, 0);
  const geometry = new InstancedBufferGeometry();
  geometry.index = base.index;
  geometry.setAttribute("position", base.attributes.position);
  const attr = (size: number, get: (s: BirdStroke) => readonly number[]) =>
    new InstancedBufferAttribute(new Float32Array(strokes.flatMap((s) => [...get(s)])), size);
  geometry.setAttribute("aStart", attr(3, (s) => s.start));
  geometry.setAttribute("aVec", attr(3, (s) => s.vec));
  geometry.setAttribute("aShape", attr(3, (s) => [s.width, s.bend ?? 0, s.brush]));
  geometry.setAttribute("aPaint", attr(3, (s) => [s.color, s.shade ?? 1, s.wing ?? 0]));
  geometry.instanceCount = strokes.length;
  base.dispose();
  return geometry;
}

/** Per-frame state of the bird's material, written by Nightingale. */
export const nightingaleUniforms = {
  /** Wing angle in radians, up positive. */
  uFlap: { value: 0 },
  /** 0..1: how far its paint has turned into the night light. */
  uBirdGlow: { value: 0 },
  /** 0..1: overall opacity (it fades into the light's core). */
  uBirdFade: { value: 1 },
  /**
   * Depth (0..1) every fragment of the bird writes: the one of its centre, so
   * depth of field blurs it as one thing (by the paint behind it, it would
   * blur with the far meadow) and its strokes lie on top of each other in
   * painting order.
   */
  uBirdDepth: { value: 0.5 },
};

const vertexShader = /* glsl */ `
attribute vec3 aStart;
attribute vec3 aVec;
attribute vec3 aShape;
attribute vec3 aPaint;
uniform float uFlap;
varying vec2 vUv;
varying float vCell;
varying vec2 vPaint;

const vec3 SHOULDER = vec3(${SHOULDER.map((v) => v.toFixed(3)).join(", ")});

// The stroke's path: a quadratic Bezier from aStart to aStart + aVec, its
// handle off the chord by the bend.
vec3 strokePath(float t) {
  vec3 n = cross(aVec, vec3(0.0, 0.0, 1.0));
  if (length(n) < 1e-4) n = cross(aVec, vec3(1.0, 0.0, 0.0));
  vec3 handle = aStart + aVec * 0.5 + normalize(n) * length(aVec) * aShape.y;
  float s = 1.0 - t;
  return s * s * aStart + 2.0 * s * t * handle + t * t * (aStart + aVec);
}

// Wing strokes beat around the shoulder, the tips whipping further.
vec3 beat(vec3 q) {
  float side = aPaint.z;
  if (side == 0.0) return q;
  float out_ = max((q.z - SHOULDER.z * side) * side, 0.0);
  float angle = uFlap * (1.0 + out_ * 0.8);
  float y = q.y - SHOULDER.y;
  return vec3(q.x, SHOULDER.y + y * cos(angle) + out_ * sin(angle), SHOULDER.z * side + side * (out_ * cos(angle) - y * sin(angle)));
}

void main() {
  float u = position.x;
  float du = u < 0.98 ? 0.02 : -0.02;
  vec3 world = (modelMatrix * vec4(beat(strokePath(u)), 1.0)).xyz;
  vec3 ahead = (modelMatrix * vec4(beat(strokePath(u + du)), 1.0)).xyz;
  vec3 tangent = (ahead - world) * sign(du);
  // The ribbon faces the camera, its width across the stroke.
  vec3 side = cross(tangent, cameraPosition - world);
  float sideLen = length(side);
  side = sideLen > 1e-6 ? side / sideLen : vec3(0.0, 1.0, 0.0);
  float scale = length(modelMatrix[0].xyz);
  world += side * position.y * aShape.x * scale;

  vUv = vec2(u, position.y + 0.5);
  vCell = aShape.z;
  vPaint = aPaint.xy;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D uBrushes;
uniform vec3 uColors[${COLORS.length}];
${paletteGLSL([...COLORS, ...GLOW_KEYS])}
uniform float uBirdGlow;
uniform float uBirdFade;
uniform float uBirdDepth;
uniform float uLightIntensity;
uniform sampler2D uWet;
uniform float uWetAmount;
uniform vec2 uScreen;
varying vec2 vUv;
varying float vCell;
varying vec2 vPaint;

${brushGLSL}
${wetGLSL}

void main() {
  vec2 uv = brushUv(vCell, vUv);
  vec4 brush = texture(uBrushes, uv, 0.7);
  float opacity = clamp(brush.a, 0.0, 1.0) * uBirdFade;
  if (opacity < 0.015) discard;

  vec3 color = uColors[int(vPaint.x + 0.5)];
  // Colored shadows and a warm light, never plain darkening.
  float shade = vPaint.y;
  vec3 shadowed = mix(color, uNightingaleDark, 0.3) * 0.85;
  vec3 lit = mix(color, uNightingaleBreast, 0.25) * 1.08;
  color = shade < 1.0 ? mix(shadowed, color, shade) : mix(color, lit, shade - 1.0);
  vec3 col = paintColor(brush, color, uColors[${paint("nightingaleDark")}], 0.3, vec2(0.0));
  // Its thin edges melt into the wet paint around it.
  col = wetMix(col, 0.5 * (1.0 - smoothstep(0.2, 0.9, brush.a)));

  // It is the night's light: the paint kindles into it, past white (HDR)
  // where the paint is thickest, so bloom haloes the bird.
  vec3 light = mix(uCursorLight, uDustLit, 0.4) * uLightIntensity * (0.9 + 0.8 * brush.g);
  col = mix(col, light, uBirdGlow);
  gl_FragColor = vec4(col, opacity);
  gl_FragDepth = uBirdDepth;
}
`;

/** Unlit, translucent paint for the bird; colors come from the palette. */
export function createNightingaleMaterial() {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: DoubleSide,
    transparent: true,
    uniforms: {
      ...paletteUniformsFor([...COLORS, ...GLOW_KEYS]),
      ...nightingaleUniforms,
      ...wetUniforms,
      uColors: { value: paletteArrayFor(COLORS) as Color[] },
      uBrushes: { value: getBrushAtlas() },
      uLightIntensity: dustUniforms.uLightIntensity,
    },
  });
}

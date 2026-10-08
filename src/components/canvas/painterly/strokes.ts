import {
  type Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  PlaneGeometry,
  ShaderMaterial,
} from "three";
import type { PaletteKey } from "@/config/palette";
import { homeSections } from "@/config/sections";
import { brushGLSL, getBrushAtlas } from "./brushes";
import { dissolveGLSL, paintDissolveGLSL } from "./dissolve";
import { gustGLSL, gustUniforms } from "./gust";
import { terrainHeightGLSL } from "./landscape";
import { paletteArrayFor, paletteGLSL, paletteUniformsFor, sharedUniforms } from "./palette";
import { colorGLSL, hazeGLSL, noiseGLSL, windGLSL } from "./shaderChunks";
import { viewUniforms } from "./view";
import { wetGLSL, wetUniforms } from "./WetCanvasPass";

/**
 * Brushstrokes as geometry. Every painted plant is a set of strokes, each an
 * instanced ribbon textured with a brush from the atlas (brushes.ts), so a
 * flower is its petal strokes and a fir its branch jabs, not a picture on a
 * card. One draw call per stroke layer.
 *
 * Strokes are placed in a plant frame anchored at a root on the ground:
 * x = sideways (turned toward the camera), y = up, z = toward the camera.
 * The frame turns to face the camera like a billboard (and tips over to face
 * it in the night top view), so a plant always reads like it was painted from
 * this side, while the strokes stay fixed to the plant and move only with
 * the wind (the breeze, and the gusts from the cursor, see gust.ts).
 *
 * Paint is translucent where it is thin (see brushes.ts), so a layer draws
 * in two passes, the usual way to render foliage: the opaque core of every
 * stroke first, writing depth, then the thin fringes and dry tails blended
 * over whatever is behind them. Plants are ordered back to front as seen
 * from the day camera, so fringes mostly blend over the right paint.
 */
export interface Stroke {
  /** Ground point the plant stands on. */
  root: readonly [number, number, number];
  /** Plant height, scales how far the wind bends a point at a given height. */
  height: number;
  /** Where the brush lands, in the plant frame. A small z orders strokes
   * that overlap in one plane (the higher, the later it was painted). */
  start: readonly [number, number, number];
  /** Stroke vector (direction times length) in the plant frame. */
  vec: readonly [number, number, number];
  width: number;
  /** Sideways curve of the stroke, as a fraction of its length. */
  bend?: number;
  /** Brush atlas cell (see brushCell). */
  brush: number;
  /** Index into the layer's colors. */
  color: number;
  /** Index of the color showing where the brush runs dry (defaults to color). */
  dry?: number;
  /** How much the dry color shows, 0..1. */
  dryness?: number;
  /** Value step: 0 = shadow, 1 = local color, 2 = light. Fractions blend. */
  shade?: number;
  /** Hue shift (radians), saturation and value multipliers. */
  variation?: readonly [number, number, number];
  /** Wind phase; strokes of one plant share it so they move together. */
  phase?: number;
  /** Wind bend multiplier for this stroke (0 = rigid). */
  sway?: number;
  /** Night glow, 0..1 (HDR, so it blooms). */
  glow?: number;
  /** Paint opacity, 0..1: below 1 the stroke is a translucent glaze. */
  opacity?: number;
  /** S-shaped wave of the stroke, as a fraction of its length. */
  wave?: number;
}

/** Where plants are sorted back to front from: the day camera. */
const DAY_EYE = homeSections[0].camera.position;

/** Collects strokes and packs them into instanced attributes. */
export class StrokeBuffer {
  private root: number[] = [];
  private start: number[] = [];
  private vec: number[] = [];
  private shape: number[] = [];
  private paint: number[] = [];
  private variation: number[] = [];
  private motion: number[] = [];
  private look: number[] = [];
  count = 0;

  add(s: Stroke) {
    this.root.push(s.root[0], s.root[1], s.root[2], s.height);
    this.start.push(...s.start);
    this.vec.push(...s.vec);
    this.shape.push(s.width, s.bend ?? 0, s.brush);
    this.paint.push(s.color, s.dry ?? s.color, s.shade ?? 1, s.dryness ?? 0.4);
    this.variation.push(...(s.variation ?? [0, 1, 1]));
    this.motion.push(s.phase ?? 0, s.sway ?? 1, s.glow ?? 0);
    this.look.push(s.opacity ?? 1, s.wave ?? 0);
    this.count++;
  }

  /**
   * Stroke order: plants (runs of strokes sharing a root) back to front from
   * the day camera, each plant's strokes in the order they were painted.
   */
  private order() {
    const plants: { first: number; last: number; dist: number }[] = [];
    for (let i = 0; i < this.count; i++) {
      const r = i * 4;
      const prev = plants[plants.length - 1];
      const same =
        prev &&
        this.root[r] === this.root[prev.first * 4] &&
        this.root[r + 1] === this.root[prev.first * 4 + 1] &&
        this.root[r + 2] === this.root[prev.first * 4 + 2];
      if (same) prev.last = i;
      else {
        const dist = Math.hypot(this.root[r] - DAY_EYE[0], this.root[r + 2] - DAY_EYE[2]);
        plants.push({ first: i, last: i, dist });
      }
    }
    plants.sort((a, b) => b.dist - a.dist);
    return plants.flatMap((p) => Array.from({ length: p.last - p.first + 1 }, (_, k) => p.first + k));
  }

  /** Instanced ribbon geometry; `segments` along the stroke let it curve smoothly. */
  createGeometry(segments = 12) {
    const base = new PlaneGeometry(1, 1, segments, 1);
    // x: 0 at the landing point .. 1 at lift-off, y: -0.5 .. 0.5 across.
    base.translate(0.5, 0, 0);
    const geometry = new InstancedBufferGeometry();
    geometry.index = base.index;
    geometry.setAttribute("position", base.attributes.position);
    const order = this.order();
    const attr = (data: number[], size: number) => {
      const out = new Float32Array(order.length * size);
      order.forEach((from, to) => {
        for (let k = 0; k < size; k++) out[to * size + k] = data[from * size + k];
      });
      return new InstancedBufferAttribute(out, size);
    };
    geometry.setAttribute("aRoot", attr(this.root, 4));
    geometry.setAttribute("aStart", attr(this.start, 3));
    geometry.setAttribute("aVec", attr(this.vec, 3));
    geometry.setAttribute("aShape", attr(this.shape, 3));
    geometry.setAttribute("aPaint", attr(this.paint, 4));
    geometry.setAttribute("aVar", attr(this.variation, 3));
    geometry.setAttribute("aMotion", attr(this.motion, 3));
    geometry.setAttribute("aLook", attr(this.look, 2));
    geometry.instanceCount = this.count;
    base.dispose();
    return geometry;
  }
}

const strokeVertexShader = /* glsl */ `
attribute vec4 aRoot;
attribute vec3 aStart;
attribute vec3 aVec;
attribute vec3 aShape;
attribute vec4 aPaint;
attribute vec3 aVar;
attribute vec3 aMotion;
attribute vec2 aLook;

uniform float uTime;
uniform float uWind;
uniform float uSway;
uniform float uTopView;
uniform float uTopScale;
uniform float uPxPerUnit;
uniform float uMinPx;
#ifdef SQUEEZE
uniform float uSqueeze;
#endif

varying vec2 vUv;
varying float vCell;
varying vec4 vPaint;
varying vec3 vVar;
varying float vGlow;
varying float vDist;
varying vec3 vWorld;
varying float vOpacity;
varying float vRise;

${noiseGLSL}
${windGLSL}
${gustGLSL}
${terrainHeightGLSL}

// The stroke's path in the plant frame: a cubic Bezier from aStart to
// aStart + aVec. Its two handles sit off the chord by the bend (an arc) and
// in opposite directions by the wave (an S), so every stroke is one smooth
// curve, the way a hand pulls a brush.
vec3 strokePath(float t) {
  vec3 chord = aVec;
  float len = length(chord);
  vec2 normal = vec2(-chord.y, chord.x);
  float nl = length(normal);
  vec3 off = nl > 1e-5 ? vec3(normal / nl, 0.0) * len : vec3(len, 0.0, 0.0);
  vec3 p0 = aStart;
  vec3 p1 = aStart + chord / 3.0 + off * (aShape.y / 0.75 + aLook.y * 1.3);
  vec3 p2 = aStart + chord * (2.0 / 3.0) + off * (aShape.y / 0.75 - aLook.y * 1.3);
  vec3 p3 = aStart + chord;
  float s = 1.0 - t;
  return s * s * s * p0 + 3.0 * s * s * t * p1 + 3.0 * s * t * t * p2 + t * t * t * p3;
}

// A point of the plant, bent by the wind: the higher a point sits on the
// plant, the further it swings. bend: angle sideways (x) and toward the
// camera (z) in the plant frame, in radians. A plant lies down at most
// almost flat, never folds under.
vec3 inWind(vec3 q, vec2 bend) {
  float h = max(q.y, 0.0);
  float reach = h * h / max(aRoot.w, 0.05);
  float angle = length(bend);
  vec2 dir = angle > 1e-5 ? bend / angle : vec2(0.0);
  angle = min(angle, 1.4);
  vec2 swing = dir * sin(angle) * reach;
  return vec3(q.x + swing.x, q.y - (1.0 - cos(angle)) * reach, q.z + swing.y);
}

void main() {
  float u = position.x;
  float across = position.y;

  vec3 base = aRoot.xyz;
  #ifdef SQUEEZE
  base.x *= uSqueeze;
  base.y += terrainHeight(base.x, base.z);
  #endif
  vec3 eye = cameraPosition;
  vec3 toCam = eye - base;
  vec2 facing = normalize(toCam.xz + vec2(0.0, 1e-4));
  vec3 right = vec3(facing.y, 0.0, -facing.x);
  vec3 up = vec3(0.0, 1.0, 0.0);
  // The cursor's gust, measured on screen at the plant's middle and scaled
  // like the layer's own sway: away from the cursor sideways, and toward
  // the camera below it (away above it).
  vec2 gust = cursorGust(base + vec3(0.0, aRoot.w * 0.6, 0.0), aMotion.x) * aMotion.y * uSway / 0.08;
  vec2 bend = vec2(windSway(base, aMotion.x) * uSway * aMotion.y + gust.x, -gust.y);
  // Top view: the frame tips over to face the camera.
  vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 camUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  right = normalize(mix(right, camRight, uTopView));
  up = normalize(mix(up, camUp, uTopView));
  vec3 fwd = normalize(cross(right, up));
  float scale = mix(1.0, uTopScale, uTopView);
  // The crowd right at the day camera's feet clumps into specks from above.
  float atFeet = step(0.0, -base.z) * step(-base.z, 5.0) * step(abs(base.x), 8.0);
  scale *= 1.0 - atFeet * smoothstep(0.3, 0.8, uTopView);

  // The point on the curve and, just ahead of it, the local direction.
  vec3 path = strokePath(u);
  // Height above the root, in metres.
  vRise = path.y;
  vec3 q = inWind(path, bend);
  float du = u < 0.98 ? 0.02 : -0.02;
  vec3 ahead = inWind(strokePath(u + du), bend);

  mat3 frame = mat3(right, up, fwd);
  vec3 world = base + frame * q * scale;
  vec3 tangent = frame * (ahead - q) * sign(du);

  // The ribbon turns around its own axis to face the camera, its width
  // always across the curve's local direction.
  vec3 view = eye - world;
  vec3 side = cross(tangent, view);
  float sideLen = length(side);
  side = sideLen > 1e-5 ? side / sideLen : right;

  // Painters don't paint finer than their smallest brush: strokes keep a
  // minimum width on screen (a far flower is a dab, not a hairline).
  float dist = length(view);
  float width = aShape.x * scale;
  float px = width * uPxPerUnit / max(dist, 0.01);
  width *= clamp(uMinPx / max(px, 1e-3), 1.0, 3.0);

  world += side * across * width;

  vUv = vec2(u, across + 0.5);
  vCell = aShape.z;
  vPaint = aPaint;
  vVar = aVar;
  vGlow = aMotion.z;
  vDist = dist;
  vOpacity = aLook.x;

  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  vWorld = world;
}
`;

const BASE_KEYS = ["haze", "dustEdge", "flowerGlow", "sunGlow", "groundMid", "grassMid"] as const satisfies readonly PaletteKey[];

function strokeFragmentShader(count: number, shadow: PaletteKey, light: PaletteKey) {
  const name = (key: string) => `u${key[0].toUpperCase()}${key.slice(1)}`;
  const keys = [...new Set<PaletteKey>([...BASE_KEYS, shadow, light])];
  return /* glsl */ `
uniform sampler2D uBrushes;
uniform vec3 uColors[${count}];
${paletteGLSL(keys)}
uniform float uGlow;
uniform float uDissolve;
uniform float uHazeScale;
uniform float uRelief;
uniform float uBacklight;
uniform float uRootFade;
uniform sampler2D uWet;
uniform float uWetAmount;
uniform vec2 uScreen;
uniform float uSunStrength;

varying vec2 vUv;
varying float vCell;
varying vec4 vPaint;
varying vec3 vVar;
varying float vGlow;
varying float vDist;
varying vec3 vWorld;
varying float vOpacity;
varying float vRise;

// Opacity at which paint counts as solid: the core pass draws above it,
// the fringe pass blends below it.
const float CORE = 0.9;

${noiseGLSL}
${colorGLSL}
${hazeGLSL}
${dissolveGLSL}
${paintDissolveGLSL}
${brushGLSL}
${wetGLSL}

void main() {
  vec2 uv = brushUv(vCell, vUv);
  // A slightly softer mip, so edges feather instead of cutting.
  vec4 brush = texture(uBrushes, uv, 0.7);
  // Toward the root a plant melts into the meadow: its paint thins out and
  // takes on the ground's color, as a painter fades stems into the grass.
  float root = smoothstep(0.0, uRootFade, vRise);
  float opacity = clamp(brush.a * vOpacity * mix(0.15, 1.0, root), 0.0, 1.0);
#ifdef FRINGE
  if (opacity >= CORE || opacity < 0.015) discard;
#else
  if (opacity < CORE) discard;
#endif
  vec3 edge = dissolvePaint(vWorld);

  // Impasto slope from neighbouring texels, turned into screen space.
  vec2 du = vec2(BRUSH_TEXEL.x * 1.5, 0.0);
  vec2 dv = vec2(0.0, BRUSH_TEXEL.y * 1.5);
  vec2 grad = vec2(
    texture2D(uBrushes, uv + du).g - texture2D(uBrushes, uv - du).g,
    texture2D(uBrushes, uv + dv).g - texture2D(uBrushes, uv - dv).g
  );
  vec2 ux = dFdx(vUv);
  vec2 uy = dFdy(vUv);
  vec2 slope = vec2(dot(grad, normalize(ux + 1e-6)), dot(grad, normalize(uy + 1e-6)));

  vec3 color = vary(uColors[int(vPaint.x + 0.5)], vVar);
  vec3 dry = uColors[int(vPaint.y + 0.5)];
  // Colored shadows and warm light, never plain darkening.
  float shade = vPaint.z;
  vec3 shadowed = mix(color, ${name(shadow)}, 0.35) * 0.88;
  vec3 lit = mix(color, ${name(light)}, 0.2) * 1.05;
  color = shade < 1.0 ? mix(shadowed, color, shade) : mix(color, lit, shade - 1.0);

  vec3 col = paintColor(brush, color, dry, vPaint.w, slope * uRelief);
  col = mix(mix(uGroundMid, uGrassMid, 0.5), col, mix(0.35, 1.0, root));

  // Backlight: the low sun ahead shines through thin edges and dry tails,
  // which glow past white so bloom haloes them.
  float thin = (1.0 - smoothstep(0.3, 0.8, brush.a)) + (1.0 - brush.b) * 0.35;
  col += uSunGlow * uSunStrength * uBacklight * thin * 0.55;

  // Night: chosen flowers glow.
  col += uFlowerGlow * uGlow * vGlow * (0.7 + 0.6 * brush.g);
  col = applyHaze(col, vDist * uHazeScale);

  // Wet in wet: the stroke picks up the wet paint around it, a little in
  // its body and most where its own paint is thin or runs dry, so edges
  // are lost into their surroundings instead of cut out against them.
  float pickup = 0.4 + 0.4 * (1.0 - brush.b) + 0.5 * (1.0 - smoothstep(0.15, 0.95, opacity));
  col = wetMix(col, pickup);
  col += edge;
#ifdef FRINGE
  gl_FragColor = vec4(col, opacity);
#else
  gl_FragColor = vec4(col, 1.0);
#endif
}
`;
}

export interface StrokeMaterialOptions {
  /** Palette colors the strokes index (Stroke.color, Stroke.dry). */
  colors: readonly PaletteKey[];
  /** Palette color the shadow side leans toward. */
  shadow: PaletteKey;
  /** Palette color the lit side leans toward. */
  light: PaletteKey;
  /** Wind bend multiplier for the whole layer. */
  sway?: number;
  /** Size multiplier in the night top view. */
  topScale?: number;
  /** Multiplier on the distance used for haze (far trees sink further in). */
  hazeScale?: number;
  /** Minimum stroke width in pixels. */
  minPx?: number;
  /** How much the impasto ridges catch the light, 0..1. */
  relief?: number;
  /** How much thin edges glow when the sun is behind them, 0..1. */
  backlight?: number;
  /** Height in metres over which plants fade into the ground at the root. */
  rootFade?: number;
  /** Re-seat roots on the terrain and squeeze x on narrow screens. */
  squeeze?: boolean;
}

/**
 * Unlit material for a layer of strokes; colors come from the palette.
 * `core` draws the solid paint, `fringe` the translucent paint around it.
 */
export function createStrokeMaterial(options: StrokeMaterialOptions, pass: "core" | "fringe") {
  const keys = [...new Set<PaletteKey>([...BASE_KEYS, options.shadow, options.light])];
  const defines: Record<string, string> = {};
  if (options.squeeze) defines.SQUEEZE = "";
  if (pass === "fringe") defines.FRINGE = "";
  return new ShaderMaterial({
    transparent: pass === "fringe",
    depthWrite: pass === "core",
    vertexShader: strokeVertexShader,
    fragmentShader: strokeFragmentShader(options.colors.length, options.shadow, options.light),
    side: DoubleSide,
    defines,
    uniforms: {
      ...paletteUniformsFor(keys),
      ...sharedUniforms,
      uColors: { value: paletteArrayFor(options.colors) as Color[] },
      uBrushes: { value: getBrushAtlas() },
      uSway: { value: options.sway ?? 0.08 },
      uTopScale: { value: options.topScale ?? 1 },
      uHazeScale: { value: options.hazeScale ?? 1 },
      uMinPx: { value: options.minPx ?? 2.2 },
      uRelief: { value: options.relief ?? 1 },
      uBacklight: { value: options.backlight ?? 0 },
      uRootFade: { value: options.rootFade ?? 0.3 },
      ...wetUniforms,
      ...gustUniforms,
      uSqueeze: viewUniforms.uTreeSqueeze,
      uTopView: viewUniforms.uTopView,
      uPxPerUnit: viewUniforms.uPxPerUnit,
    },
  });
}

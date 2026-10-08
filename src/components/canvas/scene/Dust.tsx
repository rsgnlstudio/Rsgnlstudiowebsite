"use client";

import { useEffect, useMemo } from "react";
import { AdditiveBlending, BufferGeometry, Float32BufferAttribute, ShaderMaterial, Sphere, Vector3 } from "three";
import { qualityPresets } from "@/config/look";
import type { PaletteKey } from "@/config/palette";
import { useLookStore } from "@/store/look";
import { CONIFER_EDGE_SHARE, scatterConifers } from "../painterly/conifers";
import { dissolveGLSL } from "../painterly/dissolve";
import { dustUniforms } from "../painterly/dust";
import { terrainHeight } from "../painterly/landscape";
import { paletteGLSL, paletteUniformsFor, sharedUniforms } from "../painterly/palette";
import { mulberry32, type Rng, valueNoise } from "../painterly/random";
import { noiseGLSL } from "../painterly/shaderChunks";

const COLORS = [
  "dust",
  "dustLit",
  "dustEdge",
  "cursorLight",
  "flowerPink",
  "flowerBlue",
  "flowerPeriwinkle",
  "flowerWhite",
  "flowerGlow",
] as const satisfies readonly PaletteKey[];

/** Kinds of dust, stored in aInfo.x. */
const GROUND = 0;
const TREE = 1;
const FLOWER = 2;
const MOTE = 3;

/**
 * Dust trees are squatter than the painted ones: seen from straight above in
 * perspective, tall cones streak out radially, squat ones read as crowns.
 */
const TREE_SQUASH = 0.5;

const vertexShader = /* glsl */ `
attribute vec4 aSeed; // size, phase, brightness, lift
attribute vec2 aInfo; // kind, flower tint

uniform float uTime;
uniform float uWind;
uniform float uGlow;
uniform float uDissolve;
uniform vec3 uMoonDir;
uniform vec3 uLightPos;
uniform float uLightStrength;
uniform float uLightIntensity;
uniform float uLightRadius;
uniform sampler2D uTrail;
uniform vec4 uTrailRect;
uniform float uFocus;
uniform float uPixelRatio;
uniform float uDustSize;
uniform float uBokeh;
uniform float uKick;
${paletteGLSL(COLORS)}

varying vec3 vColor;
varying float vSoft;

${noiseGLSL}
${dissolveGLSL}

vec3 flowerColor(float i) {
  if (i < 0.5) return uFlowerPink;
  if (i < 1.5) return uFlowerBlue;
  if (i < 2.5) return uFlowerPeriwinkle;
  return uFlowerWhite;
}

void hide() {
  gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
  gl_PointSize = 0.0;
  vColor = vec3(0.0);
  vSoft = 0.0;
}

void main() {
  float kind = aInfo.x;
  bool mote = kind > 2.5;
  bool flower = kind > 1.5 && !mote;

  // Dust exists where the painting has dissolved. "age" is how long ago (in
  // dissolve units) this speck broke free; motes just fade in at the end.
  float age = mote ? uDissolve - 0.75 : uDissolve - dissolveField(position);
  if (age <= 0.0) {
    hide();
    return;
  }
  float appear = smoothstep(0.0, mote ? 0.3 : 0.015, age);
  // Freshly released dust lifts off the surface, glowing, then settles.
  float release = 1.0 - smoothstep(0.0, 0.3, age);

  vec3 p = position;
  p += normal * release * (0.4 + aSeed.w * 1.6);
  p.y += release * release * aSeed.w * 3.0;

  // Idle: every speck hangs in the air and drifts a little.
  float t = uTime * (0.15 + aSeed.y * 0.2) + aSeed.y * 40.0;
  float drift = (mote ? 2.5 : 0.07) * max(uWind, 0.0) / 1.7;
  p += vec3(sin(t), sin(t * 1.31 + 1.7) * 0.6, cos(t * 0.87 + 0.4)) * drift;

  // The light's wake stirs the dust: it is swept along the light's path and
  // swirls in little eddies (sideways, so it shows from above), rising a bit.
  vec2 trailUv = (position.xz - uTrailRect.xy) / uTrailRect.zw;
  vec4 trail = texture2D(uTrail, trailUv);
  float energy = mote ? 0.0 : min(trail.r, 1.0) * uKick;
  bool tree = kind > 0.5 && kind < 1.5;
  float stir = energy * (tree ? 0.35 : 1.0);
  float swirl = aSeed.y * 6.2832 + uTime * (0.6 + aSeed.x * 1.4) + vnoise(position.xz * 0.3) * 6.0;
  p.xz += trail.gb * uKick * (tree ? 1.0 : 2.0 + aSeed.y * 5.0);
  p.xz += vec2(cos(swirl), sin(swirl)) * stir * (0.8 + aSeed.w * 3.5);
  p.y += stir * (0.5 + aSeed.w * 4.0);

  // And gently pushes it aside where it is right now.
  vec3 away = p - uLightPos;
  float near = length(away);
  p += away / max(near, 1e-3) * (1.0 - smoothstep(0.0, 10.0, near)) * 1.6 * uLightStrength * uKick;

  // Light: a faint moonlit base, then the cursor light (HDR near it, so it
  // blooms), the glow of stirred-up dust, and embers at the dissolve front.
  vec3 n = normalize(normal);
  vec3 toLight = uLightPos - p;
  float lightDist = length(toLight);
  float facing = dot(n, toLight / max(lightDist, 1e-3));
  float diffuse = mote || flower ? 0.85 : mix(max(facing, 0.0), facing * 0.5 + 0.5, 0.2);
  float reach = lightDist / uLightRadius;
  float falloff = uLightStrength * uLightIntensity / (1.0 + reach * reach * 22.0) * (1.0 - smoothstep(0.55, 1.0, reach));

  float moon = max(dot(n, uMoonDir), 0.0);
  // Slow drifts of brighter dust, so the dark field is never flat.
  float breathe = 0.45 + 1.1 * vnoise(position.xz * 0.035 + vec2(uTime * 0.012, -uTime * 0.008));
  vec3 col = uDust * (0.06 + 0.45 * moon) * breathe * aSeed.z;
  vec3 lit = mix(uCursorLight, uDustLit, smoothstep(0.6, 2.5, falloff));
  col += lit * diffuse * falloff * (0.6 + 0.6 * aSeed.z);
  col += uDustLit * energy * (0.5 + aSeed.z) * 1.1;
  col += uDustEdge * release * release * 1.3;

  if (flower) {
    // Flowers keep a faint color of their own and some glow (bioluminescent).
    vec3 petal = flowerColor(aInfo.y);
    col = petal * (0.08 + 0.25 * moon) * aSeed.z + petal * falloff * 1.4 * diffuse;
    col += uFlowerGlow * uGlow * 0.35 * step(0.75, aSeed.z) * aSeed.z;
    col += uDustEdge * release * release * 1.3;
  }
  if (mote) col = mix(uDust, uDustLit, 0.5) * (0.05 + falloff * 0.5) * aSeed.z;

  vColor = col * appear;

  // Size: fixed on screen at the focus distance, bigger when closer, and
  // blurred into a disc away from the focus (energy kept, so bokeh is dim).
  vec4 view = viewMatrix * vec4(p, 1.0);
  float dist = max(-view.z, 0.1);
  // Capped, so specks right in front of the low camera stay specks.
  float sharp = min(uDustSize * (0.55 + aSeed.x * 0.9) * (mote ? 2.5 : 1.0) * uFocus / dist, mote ? 6.0 : 2.0);
  float coc = uBokeh * abs(1.0 - uFocus / dist) * (mote ? 14.0 : 4.0);
  float size = max(sharp, 1.0) + coc;
  vColor *= min(sharp * sharp, 1.0) * max(sharp, 1.0) * max(sharp, 1.0) / (size * size);
  vSoft = clamp(coc / size, 0.0, 1.0);
  gl_PointSize = size * uPixelRatio;
  gl_Position = projectionMatrix * view;
}
`;

const fragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vSoft;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  // Specks are soft dots; out of focus they open into flat bokeh discs.
  float speck = 1.0 - smoothstep(0.3, 1.0, r);
  float disc = (1.0 - smoothstep(0.82, 1.0, r)) * (0.8 + 0.2 * smoothstep(0.4, 0.95, r));
  float a = mix(speck, disc, vSoft);
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor * a, 1.0);
}
`;

interface DustBuffers {
  position: number[];
  normal: number[];
  seed: number[];
  info: number[];
}

const normal = new Vector3();

function push(b: DustBuffers, rng: Rng, p: [number, number, number], n: Vector3, kind: number, tint = 0) {
  b.position.push(...p);
  b.normal.push(n.x, n.y, n.z);
  // Mostly faint specks with a few bright ones, like real dust.
  b.seed.push(rng(), rng(), 0.35 + Math.pow(rng(), 3) * 1.6, rng());
  b.info.push(kind, tint);
}

/** Ground normal, plus a rippled micro relief that only the light reveals. */
function groundNormal(x: number, z: number) {
  const e = 0.25;
  const h = (px: number, pz: number) =>
    terrainHeight(px, pz) +
    valueNoise(px * 0.3, pz * 0.3, 11) * 0.9 +
    valueNoise(px * 1.1, pz * 1.1, 12) * 0.22;
  const dx = h(x + e, z) - h(x - e, z);
  const dz = h(x, z + e) - h(x, z - e);
  return normal.set(-dx, 2 * e, -dz).normalize();
}

function scatterGround(b: DustBuffers, rng: Rng, count: number) {
  let placed = 0;
  while (placed < count) {
    // Dense where the top view looks, thinner out to the horizon.
    const wide = rng() < 0.3;
    const x = (rng() * 2 - 1) * (wide ? 160 : 100);
    const d = wide ? -40 + rng() * 300 : -20 + rng() * 128;
    const z = -d;
    // Drifts: dust gathers in bands and patches.
    const drift = valueNoise(x * 0.05, z * 0.05, 5) * 0.7 + valueNoise(x * 0.17, z * 0.17, 6) * 0.3;
    if (rng() > 0.25 + drift * 0.95) continue;
    const y = terrainHeight(x, z) + rng() * rng() * 0.6;
    push(b, rng, [x, y, z], groundNormal(x, z), GROUND);
    placed++;
  }
}

function scatterTrees(b: DustBuffers, rng: Rng, budget: number, conifers: number) {
  const trees = scatterConifers(conifers);
  const edge = Math.round(conifers * CONIFER_EDGE_SHARE);
  // Particles in proportion to each tree's surface.
  const area = (i: number) => trees.size[i * 2 + 1] * Math.abs(trees.size[i * 2]) * (i < edge ? 1 : 0.35);
  let total = 0;
  for (let i = 0; i < trees.count; i++) total += area(i);
  for (let i = 0; i < trees.count; i++) {
    const x = trees.offset[i * 3];
    const z = trees.offset[i * 3 + 2];
    const base = terrainHeight(x, z) + trees.offset[i * 3 + 1];
    const height = trees.size[i * 2 + 1] * TREE_SQUASH;
    const radius = Math.abs(trees.size[i * 2]) * 0.5;
    const tiers = 5 + Math.floor(height / 5);
    const n = Math.round((budget * area(i)) / total);
    for (let k = 0; k < n; k++) {
      // Up the cone (denser low down, where it is wider), in flared tiers of
      // branches, mostly on the surface with some inside.
      const f = 1 - Math.sqrt(rng());
      const tier = (f * tiers) % 1;
      const r = radius * (1 - f) * (0.55 + 0.45 * (1 - tier)) * (0.75 + 0.25 * Math.sqrt(rng()));
      const a = rng() * Math.PI * 2;
      const droop = (1 - tier) * 0.12 * height / tiers;
      normal.set(Math.cos(a), 0.55 + tier * 0.4, Math.sin(a)).normalize();
      push(b, rng, [x + Math.cos(a) * r, base + f * height - droop, z + Math.sin(a) * r], normal, TREE);
    }
  }
}

function scatterFlowers(b: DustBuffers, rng: Rng, count: number) {
  let placed = 0;
  while (placed < count) {
    const x = (rng() * 2 - 1) * 105;
    const d = -20 + rng() * 135;
    const z = -d;
    // Flowers grow in drifts of one color.
    if (rng() > valueNoise(x * 0.06, z * 0.06, 21) * 1.2 - 0.15) continue;
    const hue = valueNoise(x * 0.04, z * 0.04, 22);
    const tint = hue < 0.35 ? 0 : hue < 0.55 ? 1 : hue < 0.72 ? 2 : 3;
    const specks = 4 + Math.floor(rng() * 10);
    const spread = 0.25 + rng() * 0.7;
    const y = terrainHeight(x, z) + 0.15 + rng() * 0.5;
    for (let k = 0; k < specks && placed < count; k++, placed++) {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * spread;
      push(b, rng, [x + Math.cos(a) * r, y + rng() * 0.2, z + Math.sin(a) * r], normal.set(0, 1, 0), FLOWER, tint);
    }
  }
}

function scatterMotes(b: DustBuffers, rng: Rng, count: number) {
  for (let i = 0; i < count; i++) {
    // Between the night camera and the ground: they float out of focus.
    const x = (rng() * 2 - 1) * 70;
    const z = -42 + (rng() * 2 - 1) * 48;
    const y = 18 + rng() * 80;
    push(b, rng, [x, y, z], normal.set(0, 1, 0), MOTE);
  }
}

function buildDust(preset: (typeof qualityPresets)["high"], conifers: number) {
  const b: DustBuffers = { position: [], normal: [], seed: [], info: [] };
  const rng = mulberry32(2718);
  scatterGround(b, rng, preset.dust.ground);
  scatterTrees(b, rng, preset.dust.trees, conifers);
  scatterFlowers(b, rng, preset.dust.flowers);
  scatterMotes(b, rng, preset.dust.motes);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(b.position, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(b.normal, 3));
  geometry.setAttribute("aSeed", new Float32BufferAttribute(b.seed, 4));
  geometry.setAttribute("aInfo", new Float32BufferAttribute(b.info, 2));
  // Points move in the shader; a generous fixed bound is enough.
  geometry.boundingSphere = new Sphere(new Vector3(0, 0, -60), 400);
  return geometry;
}

/**
 * The night world: the meadow, its trees and flowers as fine dust, in one
 * draw call. Each speck appears where the painting dissolves, glows as it
 * breaks free and settles. In the dark only a faint moonlit haze of it shows;
 * the cursor light (CursorLight) reveals the shapes, and its wake kicks the
 * dust up. Out-of-focus specks open into bokeh discs.
 */
export function Dust() {
  const tier = useLookStore((s) => s.tier);
  const preset = qualityPresets[tier];

  const geometry = useMemo(() => buildDust(preset, preset.conifers), [preset]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          ...paletteUniformsFor(COLORS),
          ...sharedUniforms,
          ...dustUniforms,
        },
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  return <points name="dust" geometry={geometry} material={material} renderOrder={4} />;
}

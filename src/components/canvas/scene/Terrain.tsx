"use client";

import { useMemo } from "react";
import { PlaneGeometry, ShaderMaterial } from "three";
import type { PaletteKey } from "@/config/palette";
import { terrainHeight } from "../painterly/landscape";
import { paletteGLSL, paletteUniformsFor, sharedUniforms } from "../painterly/palette";
import { NIGHT_LIGHT_KEYS, nightLightGLSL, nightLightUniforms } from "../painterly/nightLight";
import { colorGLSL, hazeGLSL, noiseGLSL } from "../painterly/shaderChunks";
import { brushGLSL, getBrushAtlas } from "../painterly/brushes";
import { strokeFieldGLSL } from "../painterly/strokeField";
import { wetGLSL, wetUniforms } from "../painterly/WetCanvasPass";
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
  ...NIGHT_LIGHT_KEYS,
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
uniform sampler2D uBrushes;
uniform float uGlow;
uniform float uTopView;
uniform sampler2D uWet;
uniform float uWetAmount;
uniform vec2 uScreen;
varying vec3 vWorld;
${noiseGLSL}
${colorGLSL}
${hazeGLSL}
${nightLightGLSL}
${brushGLSL}
${wetGLSL}

// Painted ground: large patches, then streaks inside them. aniso = 1
// stretches everything sideways for the low day view (the ground is seen
// foreshortened); 0 keeps it even for the top view.
vec3 ground(vec2 p, float aniso) {
  float patchN = fbm(p * mix(vec2(0.03), vec2(0.035, 0.07), aniso));
  float tone = fbm(p * mix(vec2(0.12), vec2(0.2, 0.45), aniso) + patchN * 2.0);
  vec3 col = mix(uGroundDeep, uGroundMid, smoothstep(0.32, 0.55, tone));
  col = mix(col, uGroundLight, smoothstep(0.58, 0.72, tone) * 0.85);
  return mix(col, uGroundWarm, smoothstep(0.62, 0.75, patchN) * 0.6);
}

vec3 flowerPaint(vec2 seed) {
  float h = hash12(seed);
  vec3 c = h < 0.55 ? uFlowerPink : h < 0.75 ? uFlowerWhite : h < 0.9 ? uFlowerYellow : uFlowerBlue;
  c = vary(c, vec3((hash12(seed + 1.3) - 0.5) * 0.2, 1.0, 0.85 + hash12(seed + 9.1) * 0.25));
  return c + uFlowerGlow * uGlow * step(0.9, hash12(seed + 5.3)) * 0.8;
}

// Day view: coordinates in the low camera's perspective (angle across,
// log distance in depth), so strokes keep a steady size on screen and lie
// along the horizon. Top view: plain ground coordinates.
const float KU = 9.0;
const float KD = 1.7;
const float KT = 0.55;
vec2 dayToWorld(vec2 c) {
  float d = exp(c.y / KD);
  return vec2(c.x / KU * d, -d);
}

vec3 groundAt(vec2 xz, float aniso) {
  vec3 col = ground(xz, aniso);
  // Close to the camera the ground sits in the shadow of the grass.
  float near = 1.0 - smoothstep(3.0, 20.0, -xz.y);
  return mix(col, mix(uGroundMid, uFieldShadow, 0.4), near * 0.35 * aniso);
}

// Layers: 0 day blocks, 1 day flowers and light, 2 top blocks, 3 top flowers.
vec3 fieldPaint(vec2 c, float layer) {
  bool top = layer > 1.5;
  vec2 xz = top ? c / KT : dayToWorld(c);
  vec3 col = groundAt(xz, top ? 0.0 : 1.0);
  if (mod(layer, 2.0) > 0.5) {
    // Detail strokes: flowers painted into the field, else a lighter
    // stroke of the grass color.
    float far = top ? 0.6 : smoothstep(12.0, 45.0, -xz.y);
    if (hash12(floor(c * 31.0) + layer) < far * (top ? 0.25 : 0.55)) return flowerPaint(floor(c * 31.0));
    // Sunlit grass strokes; deep green ones where the meadow is in shadow.
    return hash12(floor(c * 23.0)) < 0.5 ? mix(col, uGroundLight, 0.3) : mix(col, uGroundDeep, 0.4);
  }
  return col;
}

// Under the near grass the detail strokes would only show as blobs.
float fieldPresent(vec2 c, float layer) {
  return layer == 1.0 ? step(0.35, smoothstep(5.0, 14.0, -dayToWorld(c).y) + hash12(c * 7.1) * 0.3) : 1.0;
}

vec2 fieldFlow(vec2 c, float layer) {
  if (layer > 1.5) {
    float a = (vnoise(c * 0.08) - 0.5) * 3.0;
    return vec2(cos(a), sin(a));
  }
  // Along the horizon, rising a little with the swells. Close by, where the
  // ground is seen from more above, the strokes scatter in all directions.
  float near = 1.0 - smoothstep(1.5, 9.0, exp(c.y / KD));
  float a = (vnoise(c * 0.7) - 0.5) * mix(0.35, 2.4, near);
  return vec2(cos(a), sin(a));
}

${strokeFieldGLSL}

// The toned ground showing between strokes: a warm, muted underpainting.
vec3 toned(vec2 p) {
  return mix(uGroundMid, uFieldShadow, 0.25 + 0.35 * vnoise(p * 0.3)) * 0.8;
}

vec3 paintGround(vec2 p, float layer, vec3 under) {
  vec2 dx = dFdx(p);
  vec2 dy = dFdy(p);
  vec3 col = fieldLayer(p, dx, dy, 0.34, vec2(1.9, 0.7), 1.0, 0.0, layer, under, 0.5, 0.35).rgb;
  return fieldLayer(p, dx, dy, 0.17, vec2(1.8, 0.5), 0.75, 0.0, layer + 1.0, col, 0.6, 0.35).rgb;
}

void main() {
  vec2 p = vWorld.xz;
  float dist = distance(cameraPosition, vWorld);

  // Cross-fade the day and top view paint with the camera, rather than
  // morphing one pattern, so nothing swims during the transition. The
  // ground underneath is darker, like a toned canvas between strokes.
  // The day paint is laid out for the low camera only: seen from any
  // higher, its strokes stretch into big smears, so it hands over early.
  float topPaint = smoothstep(0.04, 0.24, uTopView);
  vec3 col = vec3(0.0);
  if (topPaint < 1.0) {
    float d = max(-p.y, 0.6);
    vec2 q = vec2(p.x / d * KU, log(d) * KD);
    col += paintGround(q, 0.0, toned(p)) * (1.0 - topPaint);
  }
  if (topPaint > 0.0) {
    col += paintGround(p * KT, 2.0, toned(p)) * topPaint;
  }

  col = applyHaze(col, dist);
  // The ground takes on the colors painted over it (flowers, grass), so the
  // meadow reads as one wet mass of paint.
  col = wetMix(col, 0.5);
  gl_FragColor = vec4(morphPaint(col, vWorld), 1.0);
}
`;

/**
 * Rolling meadow ground, painted in strokes (blocks of color, then flowers
 * and light) over a darker toned ground, plus the mountains.
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
          ...nightLightUniforms,
          uBrushes: { value: getBrushAtlas() },
          ...wetUniforms,
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

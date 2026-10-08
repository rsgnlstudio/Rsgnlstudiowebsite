"use client";

import { useMemo } from "react";
import { BufferGeometry, Float32BufferAttribute, ShaderMaterial, Vector4 } from "three";
import type { PaletteKey } from "@/config/palette";
import { paletteGLSL, paletteUniformsFor, sharedUniforms } from "../painterly/palette";
import { NIGHT_LIGHT_KEYS, nightLightGLSL, nightLightUniforms } from "../painterly/nightLight";
import { brushGLSL, getBrushAtlas } from "../painterly/brushes";
import { noiseGLSL } from "../painterly/shaderChunks";
import { strokeFieldGLSL } from "../painterly/strokeField";

const COLORS = [
  "mountainNear",
  "mountainFar",
  "mountainShade",
  "haze",
  "skyHorizon",
  "sunGlow",
  ...NIGHT_LIGHT_KEYS,
] as const satisfies readonly PaletteKey[];

/** Ridge layers, nearest first: distance, base height, ridge amplitude. */
const LAYERS = [
  { z: -235, base: 6, amp: 22, freq: 0.012 },
  { z: -300, base: 14, amp: 30, freq: 0.009 },
  { z: -370, base: 22, amp: 42, freq: 0.0065 },
  { z: -450, base: 30, amp: 60, freq: 0.0045 },
] as const;

const vertexShader = /* glsl */ `
attribute float aLayer;
varying vec3 vWorld;
varying float vLayer;
void main() {
  vLayer = aLayer;
  vWorld = position;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
${paletteGLSL(COLORS)}
uniform vec4 uLayers[${LAYERS.length}];
uniform vec3 uSunDir;
uniform float uDusk;
uniform sampler2D uBrushes;
varying vec3 vWorld;
varying float vLayer;
${noiseGLSL}
${nightLightGLSL}
${brushGLSL}

float ridge(float x, vec4 layer) {
  float n = 0.0;
  float amp = 0.55;
  float f = layer.w;
  for (int i = 0; i < 4; i++) {
    float v = 1.0 - abs(vnoise(vec2(x * f, layer.x * 0.37)) * 2.0 - 1.0);
    n += v * v * amp;
    f *= 2.1;
    amp *= 0.45;
  }
  return layer.y + layer.z * n;
}

// The ridge layer being painted, set in main before the stroke search,
// including the skyline around this fragment as a line (gTop + gSlope * dx):
// the strokes nearby only need it locally, and the full ridge is expensive.
vec4 gLayer;
float gDepth;
float gZ;
float gX;
float gTop;
float gSlope;

float ridgeTop(float x) {
  return ridge(x, gLayer) + (vnoise(vec2(x * 0.05, gLayer.x)) - 0.5) * gLayer.z * 0.1;
}

float localTop(float x) {
  return gTop + gSlope * (x - gX);
}

vec3 mountainColor(vec2 p) {
  float top = localTop(p.x);
  vec3 col = mix(uMountainNear, uMountainFar, gDepth);
  // Slopes catch the light near the crest and dissolve into haze below.
  float h = clamp((p.y - (gLayer.y - 25.0)) / (top - gLayer.y + 25.0), 0.0, 1.0);
  col *= 0.9 + 0.12 * smoothstep(0.7, 1.0, h);
  // Violet shadow across the slopes, in big blocks.
  float shade = fbm(p * vec2(0.012, 0.03) + gLayer.x);
  col = mix(col, uMountainShade, smoothstep(0.5, 0.6, shade) * (0.6 - gDepth * 0.3));
  col = mix(col, uHaze, (1.0 - h) * 0.3 + gDepth * 0.12);
  col = mix(col, uSkyHorizon, gDepth * 0.15);

  // Sunset: the ridges toward the sun light up along their crests.
  vec2 toPoint = normalize(vec2(p.x, gZ) - cameraPosition.xz);
  float sunSide = pow(max(dot(toPoint, normalize(uSunDir.xz + 1e-4)), 0.0), 6.0);
  float crest = smoothstep(top - gLayer.z * 0.25, top, p.y);
  return mix(col, uSunGlow * 1.2, crest * sunSide * uDusk * 0.7);
}

vec3 fieldPaint(vec2 c, float layer) { return mountainColor(c); }

// A stroke exists if it starts below the ridge, so the silhouette is the
// edge of the strokes themselves.
float fieldPresent(vec2 c, float layer) { return step(c.y, localTop(c.x) - gLayer.z * 0.03); }

// Down the slopes: follow the ridge's gradient.
vec2 fieldFlow(vec2 p, float layer) {
  return vec2(1.0, clamp(gSlope, -1.2, 1.2) * 0.8);
}

${strokeFieldGLSL}

void main() {
  int index = int(vLayer + 0.5);
  gLayer = uLayers[0];
  for (int i = 1; i < ${LAYERS.length}; i++) if (i == index) gLayer = uLayers[i];
  gZ = vWorld.z;
  gDepth = vLayer / ${(LAYERS.length - 1).toFixed(1)};

  vec2 p = vWorld.xy;
  gX = p.x;
  gTop = ridgeTop(p.x);
  gSlope = (ridgeTop(p.x + 3.0) - ridgeTop(p.x - 3.0)) / 6.0;
  float size = -vWorld.z * 0.022;
  vec2 dx = dFdx(p);
  vec2 dy = dFdy(p);
  float top = gTop;
  vec4 paint = fieldLayer(p, dx, dy, size, vec2(1.9, 0.75), 1.0, 0.0, vLayer * 2.0, mountainColor(p), 0.4, 0.25);
  // Above the ridge only the strokes reaching over it exist: they are the skyline.
  if (p.y > top - gLayer.z * 0.03 && paint.a < 0.45) discard;
  vec3 col = fieldLayer(p, dx, dy, size * 0.5, vec2(1.7, 0.55), 0.5, 0.0, vLayer * 2.0 + 1.0, paint.rgb, 0.5, 0.25).rgb;

  gl_FragColor = vec4(morphPaint(col, vWorld), 1.0);
}
`;

/**
 * Layered ridges fading into haze toward the sky color, painted in strokes
 * that run down the slopes; the strokes' own edges form the skyline.
 */
export function Mountains() {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const layers: number[] = [];
    LAYERS.forEach((layer, i) => {
      const half = Math.abs(layer.z) * 3;
      const y0 = -10;
      const y1 = layer.base + layer.amp * 1.4;
      // Two triangles per layer; far layers first so near ones draw over them.
      positions.push(
        -half, y0, layer.z, half, y0, layer.z, half, y1, layer.z,
        -half, y0, layer.z, half, y1, layer.z, -half, y1, layer.z,
      );
      for (let v = 0; v < 6; v++) layers.push(i);
    });
    const geom = new BufferGeometry();
    geom.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geom.setAttribute("aLayer", new Float32BufferAttribute(layers, 1));
    geom.computeBoundingSphere();
    return geom;
  }, []);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          ...paletteUniformsFor(COLORS),
          uSunDir: sharedUniforms.uSunDir,
          uDusk: sharedUniforms.uDusk,
          ...nightLightUniforms,
          uLayers: {
            value: LAYERS.map((l, i) => new Vector4(i * 13.7 + 2, l.base, l.amp, l.freq)),
          },
          uBrushes: { value: getBrushAtlas() },
        },
      }),
    [],
  );

  return <mesh name="mountains" geometry={geometry} material={material} />;
}

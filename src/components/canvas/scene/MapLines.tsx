"use client";

import { useEffect, useMemo } from "react";
import { AdditiveBlending, BufferGeometry, Float32BufferAttribute, ShaderMaterial, Sphere, Vector3 } from "three";
import { MOUNTAINS_FROM } from "@/config/nightMap";
import type { PaletteKey } from "@/config/palette";
import { mapUniforms } from "../painterly/mapUniforms";
import { buildMapLines, LINE } from "../painterly/nightMap";
import { paletteGLSL, paletteUniformsFor, sharedUniforms } from "../painterly/palette";
import { viewUniforms } from "../painterly/view";

const COLORS = ["mapLine", "mapPath", "cityLight", "contour"] as const satisfies readonly PaletteKey[];

const vertexShader = /* glsl */ `
attribute vec4 aInfo; // kind, path, arc (metres), seed

uniform float uTime;
uniform float uMorph;
uniform float uActivePath;
uniform float uPathReach;
uniform float uPreviewPath;
uniform float uPxPerUnit;
uniform float uPixelRatio;
${paletteGLSL(COLORS)}

varying vec3 vColor;

void main() {
  float show = smoothstep(0.55, 1.0, uMorph);
  float kind = aInfo.x;
  float path = aInfo.y;
  float arc = aInfo.z;
  float seed = aInfo.w;
  if (show <= 0.0) {
    gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    vColor = vec3(0.0);
    return;
  }

  vec3 col;
  float bright;
  float size;
  if (kind < ${LINE.TRAIL}.5) {
    // Trails: faint, the way through the dark.
    col = uMapLine;
    bright = 0.16 + 0.1 * seed;
    size = 0.2;
  } else if (kind < ${LINE.ROAD}.5) {
    col = uCityLight;
    bright = 0.42 + 0.2 * seed;
    size = 0.24;
  } else if (kind < ${LINE.STREET}.5) {
    col = uCityLight;
    bright = 0.16 + 0.3 * seed * seed;
    size = 0.2;
  } else if (kind < ${LINE.NODE}.5) {
    // Bright points at the crossings, some of them flickering slowly.
    col = uCityLight;
    float flicker = 0.85 + 0.15 * sin(uTime * (0.6 + seed * 1.7) + seed * 30.0);
    bright = (1.0 + 1.6 * seed) * flicker;
    size = 0.4;
  } else {
    // Contour lines, fading in toward the top.
    col = uContour;
    bright = (0.45 + 0.4 * seed) * smoothstep(${MOUNTAINS_FROM.toFixed(1)}, ${(MOUNTAINS_FROM + 9).toFixed(1)}, -position.z);
    size = 0.2;
  }

  bool onPath = path > -0.5;
  if (onPath && abs(path - uPreviewPath) < 0.5) {
    col = mix(col, uMapPath, 0.6);
    bright += 0.5;
  }
  if (onPath && abs(path - uActivePath) < 0.5) {
    // The active path glows (HDR, so it blooms), brightest where the panel
    // has got to, with a slow shimmer running along it.
    float walked = 1.0 - smoothstep(uPathReach, uPathReach + 6.0, arc);
    float flow = pow(0.5 + 0.5 * sin((arc - uTime * 5.0) * 0.3), 8.0);
    col = uMapPath;
    bright = 0.7 + 1.5 * walked + 0.9 * flow;
    size = 0.3;
  }

  vec4 view = viewMatrix * vec4(position, 1.0);
  float dist = max(-view.z, 0.1);
  float px = size * uPxPerUnit / dist;
  float minPx = 1.5 * uPixelRatio;
  // Below the minimum size, keep the energy: smaller dots get dimmer.
  vColor = col * bright * show * min(px * px / (minPx * minPx), 1.0);
  gl_PointSize = max(px, minPx);
  gl_Position = projectionMatrix * view;
}
`;

const fragmentShader = /* glsl */ `
varying vec3 vColor;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float a = 1.0 - smoothstep(0.35, 1.0, r);
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor * a, 1.0);
}
`;

/**
 * The lines of the night map as dots of light, in one draw call: faint
 * trails through the woods, the city's street grid with bright crossings and
 * the roads between its lights, and the mountains' contour lines. The active
 * path glows from its clearing up to where the panel has got to. Night only.
 */
export function MapLines() {
  const geometry = useMemo(() => {
    const data = buildMapLines();
    const geom = new BufferGeometry();
    geom.setAttribute("position", new Float32BufferAttribute(data.position, 3));
    geom.setAttribute("aInfo", new Float32BufferAttribute(data.info, 4));
    geom.boundingSphere = new Sphere(new Vector3(0, 0, -45), 140);
    return geom;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          ...paletteUniformsFor(COLORS),
          uTime: sharedUniforms.uTime,
          uMorph: sharedUniforms.uMorph,
          uPxPerUnit: viewUniforms.uPxPerUnit,
          uActivePath: mapUniforms.uActivePath,
          uPathReach: mapUniforms.uPathReach,
          uPreviewPath: mapUniforms.uPreviewPath,
          uPixelRatio: mapUniforms.uPixelRatio,
        },
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        depthTest: false,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  return <points name="map-lines" geometry={geometry} material={material} renderOrder={6} />;
}

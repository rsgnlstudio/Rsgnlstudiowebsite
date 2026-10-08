"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BackSide, type Mesh, ShaderMaterial } from "three";
import type { PaletteKey } from "@/config/palette";
import { paletteGLSL, paletteUniformsFor, sharedUniforms } from "../painterly/palette";
import { brushGLSL, getBrushAtlas } from "../painterly/brushes";
import { noiseGLSL } from "../painterly/shaderChunks";
import { strokeFieldGLSL } from "../painterly/strokeField";

const COLORS = [
  "skyTop",
  "skyMid",
  "skyHorizon",
  "cloudLight",
  "cloudShade",
  "cloudShadow",
  "haze",
  "sun",
  "sunGlow",
  "moon",
  "void",
] as const satisfies readonly PaletteKey[];

const vertexShader = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww; // pin to the far plane
}
`;

const fragmentShader = /* glsl */ `
${paletteGLSL(COLORS)}
uniform float uTime;
uniform float uDusk;
uniform vec3 uSunDir;
uniform float uSunStrength;
uniform vec3 uMoonDir;
uniform float uMoonStrength;
uniform float uDissolve;
uniform sampler2D uBrushes;
varying vec3 vDir;
${noiseGLSL}
${brushGLSL}

float cloudField(vec2 p) {
  return fbm(p * vec2(1.0, 1.9));
}

vec3 skyDir(vec2 azEl) {
  return vec3(sin(azEl.x) * cos(azEl.y), sin(azEl.y), -cos(azEl.x) * cos(azEl.y));
}

// The sky's color in a direction, without the sun and moon discs: what a
// stroke centred there is painted with.
vec3 skyColor(vec3 dir) {
  float el = dir.y;
  float az = atan(dir.x, -dir.z);
  vec3 col = mix(uSkyHorizon, uSkyMid, smoothstep(0.0, 0.2, el));
  col = mix(col, uSkyTop, smoothstep(0.18, 0.62, el));

  // Light from the sun: a wide warm bloom, and at sunset a band of fire
  // along the horizon around it.
  float sunDot = max(dot(dir, uSunDir), 0.0);
  vec2 flatSun = normalize(uSunDir.xz + 1e-4);
  float sunSide = pow(max(dot(normalize(dir.xz + 1e-4), flatSun), 0.0), 3.0);
  col += uSunGlow * (pow(sunDot, 5.0) * 0.3 + pow(sunDot, 60.0) * 0.25) * uSunStrength;
  col = mix(col, uSunGlow * 1.15, uDusk * sunSide * exp(-max(el, 0.0) * 9.0) * 0.75);

  // Moonlight halo.
  float moonDot = max(dot(dir, uMoonDir), 0.0);
  col += uMoon * pow(moonDot, 24.0) * 0.25 * uMoonStrength;

  // Cumulus banks low over the horizon, drifting very slowly.
  vec2 cp = vec2(az * 2.4 + uTime * 0.002, el * 6.5);
  float band = smoothstep(0.0, 0.07, el) * (1.0 - smoothstep(0.16, 0.42, el));
  float n = cloudField(cp);
  float cloud = smoothstep(0.5, 0.53, n * (0.55 + 0.6 * band));
  // Light from above: compare against the field slightly lower down.
  float shade = clamp((n - cloudField(cp + vec2(0.0, -0.12))) * 6.0 + 0.55, 0.0, 1.0);
  vec3 cloudCol = mix(uCloudShadow, uCloudShade, smoothstep(0.1, 0.55, shade));
  cloudCol = mix(cloudCol, uCloudLight, smoothstep(0.5, 0.9, shade));
  // Clouds near the sun catch its light; moonlit edges at night.
  cloudCol += uSunGlow * pow(sunDot, 5.0) * (0.25 + uDusk * 0.8) * uSunStrength;
  cloudCol += uMoon * pow(moonDot, 10.0) * 0.35 * uMoonStrength;
  col = mix(col, cloudCol, cloud);

  // Thin wisps higher up.
  float wisp = smoothstep(0.62, 0.75, strokes(vec2(az * 3.0, el * 14.0) + 3.0, vec2(1.0, 0.12), 6.0))
    * smoothstep(0.2, 0.35, el) * (1.0 - smoothstep(0.5, 0.75, el));
  col = mix(col, uCloudShade, wisp * 0.35);

  // Haze where the sky meets the land.
  return mix(col, uHaze, 1.0 - smoothstep(-0.03, 0.05, el));
}

// Stroke coordinates: azimuth and elevation, scaled.
const float KS = 10.0;

vec3 fieldPaint(vec2 c, float layer) {
  return skyColor(skyDir(c / KS));
}

float fieldPresent(vec2 c, float layer) { return 1.0; }

vec2 fieldFlow(vec2 c, float layer) {
  // Broad sweeps along the horizon, tilting a little higher up.
  float el = c.y / KS;
  float tilt = mix(0.03, 0.22, smoothstep(0.05, 0.5, el)) * (vnoise(c * 0.15) * 2.0 - 0.7);
  return vec2(1.0, tilt);
}

${strokeFieldGLSL}

void main() {
  vec3 dir = normalize(vDir);
  float el = dir.y;
  float az = atan(dir.x, -dir.z);

  // Brushed in two passes: broad strokes, then smaller ones on top. The
  // seam at az = +-PI sits behind the camera.
  vec2 p = vec2(az, el) * KS;
  vec2 dx = dFdx(p);
  vec2 dy = dFdy(p);
  // Long, palette-knife-like strokes along the horizon, melting together.
  vec3 col = fieldLayer(p, dx, dy, 0.75, vec2(2.4, 0.62), 1.0, 0.0, 0.0, skyColor(dir), 0.5, 0.8).rgb;
  col = fieldLayer(p, dx, dy, 0.4, vec2(2.6, 0.45), 0.4, 0.0, 1.0, col, 0.6, 0.8).rgb;

  // Sun and moon discs with soft, round edges and a gentle halo.
  float sunDot = max(dot(dir, uSunDir), 0.0);
  float moonDot = max(dot(dir, uMoonDir), 0.0);
  col += uSunGlow * pow(sunDot, 400.0) * 0.3 * uSunStrength;
  col += uMoon * pow(moonDot, 300.0) * 0.6 * uMoonStrength;
  float sunDisc = smoothstep(0.99865, 0.99925, sunDot);
  // A pale disc behind the haze, just past white so it glows.
  col = mix(col, uSun * 1.15, sunDisc * uSunStrength * 0.9);
  float moonDisc = smoothstep(0.99955, 0.99972, moonDot);
  col = mix(col, uMoon * 2.2, moonDisc * uMoonStrength);

  // Night: the sky gives way to the dark the dust floats in, faintly clouded.
  float fog = fbm(dir.xz * 2.2 + dir.y * 1.3 + uTime * 0.004);
  col = mix(col, uVoid * (0.55 + 0.9 * fog), smoothstep(0.0, 0.75, uDissolve));

  gl_FragColor = vec4(col, 1.0);
}
`;

/**
 * Painted sky dome, brushed in broad strokes: each stroke is one color of
 * the gradient and clouds underneath (from the palette), the sun (sinking
 * behind the mountains as `night` rises, with a sunset glow along the
 * horizon) and the moon. As the day dissolves into dust, it fades to the
 * dark void of the night world.
 */
export function Sky() {
  const mesh = useRef<Mesh>(null);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          ...paletteUniformsFor(COLORS),
          uTime: sharedUniforms.uTime,
          uDusk: sharedUniforms.uDusk,
          uSunDir: sharedUniforms.uSunDir,
          uSunStrength: sharedUniforms.uSunStrength,
          uMoonDir: sharedUniforms.uMoonDir,
          uMoonStrength: sharedUniforms.uMoonStrength,
          uDissolve: sharedUniforms.uDissolve,
          uBrushes: { value: getBrushAtlas() },
        },
        side: BackSide,
        depthWrite: false,
      }),
    [],
  );

  // Keep the dome centred on the camera so it never shows parallax. It is
  // drawn after the opaque world (it sits on the far plane), so the depth
  // test skips its strokes wherever land covers the sky.
  useFrame(({ camera }) => {
    mesh.current?.position.copy(camera.position);
  });

  return (
    <mesh ref={mesh} name="sky" material={material} renderOrder={1} frustumCulled={false}>
      <sphereGeometry args={[500, 48, 24]} />
    </mesh>
  );
}

"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BackSide, type Mesh, ShaderMaterial } from "three";
import type { PaletteKey } from "@/config/palette";
import { paletteGLSL, paletteUniformsFor, sharedUniforms } from "../painterly/palette";
import { noiseGLSL } from "../painterly/shaderChunks";

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
varying vec3 vDir;
${noiseGLSL}

float cloudField(vec2 p) {
  float n = fbm(p * vec2(1.0, 1.9));
  n += (strokes(p * 6.0, vec2(1.0, 0.25), 3.0) - 0.5) * 0.12;
  return n;
}

void main() {
  vec3 dir = normalize(vDir);
  float el = dir.y;
  float az = atan(dir.x, -dir.z);
  vec2 p = vec2(az, el);

  // Gradient, broken up by long diagonal brushstrokes.
  float s = strokes(p * vec2(9.0, 16.0), vec2(1.0, 0.45), 3.5);
  float e = el + (s - 0.5) * 0.07;
  vec3 col = mix(uSkyHorizon, uSkyMid, smoothstep(0.0, 0.2, e));
  col = mix(col, uSkyTop, smoothstep(0.18, 0.62, e));
  col *= 0.95 + 0.1 * strokes(p * vec2(16.0, 30.0), vec2(1.0, 0.6), 4.0);

  // Light from the sun: a wide warm bloom, and at sunset a band of fire
  // along the horizon around it.
  float sunDot = max(dot(dir, uSunDir), 0.0);
  vec2 flatDir = normalize(dir.xz + 1e-4);
  vec2 flatSun = normalize(uSunDir.xz + 1e-4);
  float sunSide = pow(max(dot(flatDir, flatSun), 0.0), 3.0);
  col += uSunGlow * (pow(sunDot, 6.0) * 0.35 + pow(sunDot, 40.0) * 0.6) * uSunStrength;
  col = mix(col, uSunGlow * 1.15, uDusk * sunSide * exp(-max(el, 0.0) * 9.0) * 0.75);

  // Moonlight halo.
  float moonDot = max(dot(dir, uMoonDir), 0.0);
  col += uMoon * (pow(moonDot, 24.0) * 0.25 + pow(moonDot, 300.0) * 0.6) * uMoonStrength;

  // Cumulus banks low over the horizon, drifting very slowly.
  vec2 cp = vec2(az * 2.4 + uTime * 0.002, el * 6.5);
  float band = smoothstep(0.0, 0.07, el) * (1.0 - smoothstep(0.16, 0.42, el));
  float n = cloudField(cp);
  float cloud = smoothstep(0.5, 0.56, n * (0.55 + 0.6 * band));
  // Light from above: compare against the field slightly lower down.
  float below = cloudField(cp + vec2(0.0, -0.12));
  float shade = clamp((n - below) * 6.0 + 0.55, 0.0, 1.0);
  vec3 cloudCol = mix(uCloudShadow, uCloudShade, smoothstep(0.1, 0.55, shade));
  cloudCol = mix(cloudCol, uCloudLight, smoothstep(0.5, 0.9, shade));
  cloudCol *= 0.94 + 0.12 * strokes(cp * 9.0, vec2(1.0, -0.4), 2.0);
  // Clouds near the sun catch its light; moonlit edges at night.
  cloudCol += uSunGlow * pow(sunDot, 5.0) * (0.25 + uDusk * 0.8) * uSunStrength;
  cloudCol += uMoon * pow(moonDot, 10.0) * 0.35 * uMoonStrength;
  col = mix(col, cloudCol, cloud);

  // Thin wisps higher up.
  float wisp = smoothstep(0.62, 0.75, strokes(vec2(az * 3.0, el * 14.0) + 3.0, vec2(1.0, 0.12), 6.0))
    * smoothstep(0.2, 0.35, el) * (1.0 - smoothstep(0.5, 0.75, el));
  col = mix(col, uCloudShade, wisp * 0.35);

  // Haze where the sky meets the land.
  col = mix(col, uHaze, 1.0 - smoothstep(-0.03, 0.05, el));

  // Sun and moon discs with a ragged, painted rim; HDR so they bloom.
  float rim = (vnoise(vec2(az, el) * 180.0) - 0.5) * 0.004;
  float sunDisc = smoothstep(0.9988, 0.9992, sunDot + rim);
  col = mix(col, uSun * 3.0, sunDisc * uSunStrength);
  float moonDisc = smoothstep(0.99955, 0.99972, moonDot + rim * 0.3);
  col = mix(col, uMoon * 2.2, moonDisc * uMoonStrength);

  // Night: the sky gives way to the dark the dust floats in, faintly clouded.
  float fog = fbm(dir.xz * 2.2 + dir.y * 1.3 + uTime * 0.004);
  col = mix(col, uVoid * (0.55 + 0.9 * fog), smoothstep(0.0, 0.75, uDissolve));

  gl_FragColor = vec4(col, 1.0);
}
`;

/**
 * Painted sky dome: gradient and clouds from the palette, the sun (sinking
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
        },
        side: BackSide,
        depthWrite: false,
      }),
    [],
  );

  // Keep the dome centred on the camera so it never shows parallax.
  useFrame(({ camera }) => {
    mesh.current?.position.copy(camera.position);
  });

  return (
    <mesh ref={mesh} name="sky" material={material} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[500, 48, 24]} />
    </mesh>
  );
}

"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  MathUtils,
  type PerspectiveCamera,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
} from "three";
import { qualityPresets } from "@/config/look";
import type { PaletteKey } from "@/config/palette";
import { CURSOR_LIGHT_HEIGHT, nightCamera } from "@/config/scene";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useWindowPointer } from "@/hooks/useWindowPointer";
import { useLookStore } from "@/store/look";
import { DustTrail, dustUniforms } from "../painterly/dust";
import { rayGroundDistance, terrainHeight } from "../painterly/landscape";
import { paletteGLSL, paletteUniformsFor, sharedUniforms } from "../painterly/palette";

const COLORS = ["cursorLight", "dustLit"] as const satisfies readonly PaletteKey[];

const vertexShader = /* glsl */ `
uniform vec3 uLightPos;
uniform float uLightStrength;
varying vec2 vUv;
void main() {
  vec4 view = viewMatrix * vec4(uLightPos, 1.0);
  view.xy += position.xy * 18.0 * uLightStrength;
  gl_Position = projectionMatrix * view;
  vUv = uv;
}
`;

const fragmentShader = /* glsl */ `
${paletteGLSL(COLORS)}
uniform float uLightStrength;
uniform float uLightIntensity;
varying vec2 vUv;
void main() {
  float r = length(vUv - 0.5) * 2.0;
  // A small hot core (HDR, so it blooms) inside a wide, faint halo of lit air.
  float core = exp(-r * r * 260.0);
  float halo = exp(-r * 5.0) * (1.0 - r);
  vec3 col = mix(uCursorLight, uDustLit, 0.4) * (core * 3.5 + halo * 0.07);
  col *= uLightStrength * uLightIntensity / 2.6;
  if (max(col.r, max(col.g, col.b)) < 0.002) discard;
  gl_FragColor = vec4(col, 1.0);
}
`;

const ndc = new Vector3();
const ray = new Vector3();
const hit = new Vector3();
const lastGround = new Vector3();

/**
 * The light of the night world. It hovers above the ground under the cursor
 * (or wanders on its own on touch screens and when the mouse has left),
 * lights the dust around it, and records its wake in the dust trail, which
 * kicks the dust up as it passes. Also sets the focus of the dust to the
 * ground under it. Writes dustUniforms every frame; reads the store with
 * getState().
 */
export function CursorLight() {
  const gl = useThree((s) => s.gl);
  const tier = useLookStore((s) => s.tier);
  const size = qualityPresets[tier].trailSize;

  const reducedMotion = usePrefersReducedMotion();
  const reduced = useRef(reducedMotion);
  useEffect(() => {
    reduced.current = reducedMotion;
  }, [reducedMotion]);

  const trail = useMemo(() => new DustTrail(size), [size]);
  useEffect(() => () => trail.dispose(), [trail]);

  const pointer = useWindowPointer();

  const ground = useRef(new Vector3(...nightCamera.lookAt));
  const wander = useRef(0);

  useFrame((state, delta) => {
    const morph = sharedUniforms.uMorph.value;
    if (morph <= 0) {
      dustUniforms.uLightStrength.value = 0;
      return;
    }
    const dt = Math.min(delta, 0.05);
    const camera = state.camera;
    const look = useLookStore.getState();

    // Target: the ground under the cursor, or a slow wander around the view.
    if (pointer.current.active) {
      camera.updateMatrixWorld();
      ray.copy(ndc.set(pointer.current.position.x, pointer.current.position.y, 0.5).unproject(camera));
      ray.sub(camera.position).normalize();
      const distance = rayGroundDistance(camera.position, ray, 400);
      if (distance < 400) hit.copy(camera.position).addScaledVector(ray, distance);
    } else {
      if (!reduced.current) wander.current += dt;
      const w = wander.current;
      const [cx, , cz] = nightCamera.lookAt;
      // Narrower on portrait screens, so it stays in frame.
      const across = Math.min(1, (camera as PerspectiveCamera).aspect / 1.6);
      const x = cx + (Math.sin(w * 0.21) * 34 + Math.sin(w * 0.53) * 9) * across;
      const z = cz + Math.sin(w * 0.17 + 1.2) * (18 + 14 * (1 - across));
      hit.set(x, terrainHeight(x, z), z);
    }

    // Floaty follow, so the light trails the cursor a little.
    lastGround.copy(ground.current);
    ground.current.lerp(hit, 1 - Math.exp(-dt * 6));
    const g = ground.current;
    const vx = (g.x - lastGround.x) / Math.max(dt, 1e-4);
    const vz = (g.z - lastGround.z) / Math.max(dt, 1e-4);
    const speed = Math.hypot(vx, vz);

    // Comes up early in the morph: the paint takes on its light before the
    // dust condenses under it.
    const strength = MathUtils.smoothstep(morph, 0.1, 0.75);
    dustUniforms.uLightStrength.value = strength;
    dustUniforms.uLightPos.value.set(g.x, g.y + CURSOR_LIGHT_HEIGHT, g.z);
    dustUniforms.uLightIntensity.value = look.lightIntensity;
    dustUniforms.uLightRadius.value = look.lightRadius;
    dustUniforms.uDustSize.value = look.dustSize;
    dustUniforms.uBokeh.value = look.dustBokeh;
    dustUniforms.uKick.value = look.dustKick;
    dustUniforms.uPixelRatio.value = gl.getPixelRatio();
    // Rack focus to the ground under the light, smoothly.
    const focus = camera.position.distanceTo(g);
    dustUniforms.uFocus.value = MathUtils.lerp(dustUniforms.uFocus.value, focus, 1 - Math.exp(-dt * 3));

    // Wake: only movement stirs the dust; the faster, the more.
    const push = Math.min(speed / 60, 1);
    const amount = push * strength * dt * 7;
    trail.update(gl, g.x, g.z, push ? (vx / speed) * push : 0, push ? (vz / speed) * push : 0, amount, Math.exp(-dt * 0.9));
    dustUniforms.uTrail.value = trail.texture;
  });

  const geometry = useMemo(() => new PlaneGeometry(1, 1), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          ...paletteUniformsFor(COLORS),
          uLightPos: dustUniforms.uLightPos,
          uLightStrength: dustUniforms.uLightStrength,
          uLightIntensity: dustUniforms.uLightIntensity,
        },
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        depthTest: false,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  return <mesh name="cursor-light" geometry={geometry} material={material} renderOrder={20} frustumCulled={false} />;
}

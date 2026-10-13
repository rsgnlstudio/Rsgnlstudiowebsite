"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { MathUtils, Matrix4, type Mesh, type PerspectiveCamera, Vector2, Vector3 } from "three";
import { CURSOR_LIGHT_HEIGHT, INTRO_UI_AT, NIGHTINGALE, nightCamera } from "@/config/scene";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useWindowPointer } from "@/hooks/useWindowPointer";
import { overlayOpen, useSceneStore } from "@/store/scene";
import { dustUniforms } from "../painterly/dust";
import { rayGroundDistance, terrainHeight } from "../painterly/landscape";
import { panelFocus } from "../painterly/nightMap";
import {
  createNightingaleGeometry,
  createNightingaleMaterial,
  nightingaleUniforms,
} from "../painterly/nightingale";
import { sharedUniforms } from "../painterly/palette";
import { focusDistance } from "../painterly/view";

/** Spring pulling the bird toward its place on the circle (per second squared). */
const STIFFNESS = 14;
/** Below critical damping, so it swoops a little past its turns. */
const DAMPING = 2 * Math.sqrt(STIFFNESS) * 0.6;
/** Where it waits (and flies in from) before the intro has painted the meadow: off frame, top right. */
const OFF_FRAME = new Vector2(1.5, 0.9);

const ndc = new Vector2();
const ray = new Vector3();
const anchor = new Vector3();
const goal = new Vector3();
const camRight = new Vector3();
const camUp = new Vector3();
const camForward = new Vector3();
const force = new Vector3();
const hit = new Vector3();
const nightPos = new Vector3();
const position = new Vector3();
const heading = new Vector3();
const up = new Vector3();
const side = new Vector3();
const basis = new Matrix4();
const size = new Vector3();
const WORLD_UP = new Vector3(0, 1, 0);

/**
 * The nightingale, and the night's light. By day it flies circles around the
 * cursor a few metres in front of the camera, beating its wings in bursts
 * and banking into its turns. It is the light that follows the cursor at
 * night: as the day turns, it kindles, dives along the cursor's ray down to
 * the light's place above the ground and fades into the light's core. It
 * writes the light's position (dustUniforms.uLightPos) every frame, so the
 * light lights the painting from where the bird is; CursorLight does the
 * rest. Reads the store with getState().
 */
export function Nightingale() {
  const reducedMotion = usePrefersReducedMotion();
  const reduced = useRef(reducedMotion);
  useEffect(() => {
    reduced.current = reducedMotion;
  }, [reducedMotion]);

  const pointer = useWindowPointer();
  const mesh = useRef<Mesh>(null);

  // Flight state (the day bird before it is pulled to the night light).
  const bird = useRef({ pos: new Vector3(), vel: new Vector3(), placed: false });
  const last = useRef(new Vector3());
  const forward = useRef(new Vector3(1, 0, 0));
  const bank = useRef(0);
  const orbit = useRef(0);
  const flap = useRef(0);
  const wander = useRef(0);
  // The night light's ground point, following the cursor floatily.
  const ground = useRef(new Vector3(...nightCamera.lookAt));

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const camera = state.camera as PerspectiveCamera;
    const morph = sharedUniforms.uMorph.value;
    const store = useSceneStore.getState();
    const { intro } = store;
    const calm = reduced.current;
    if (!calm) wander.current += dt;
    const w = wander.current;
    camera.updateMatrixWorld();
    camera.matrixWorld.extractBasis(camRight, camUp, camForward);
    camForward.negate();

    // The cursor, or a slow wander when there is none (touch screens, the
    // mouse has left, or an overlay pushed the stage aside).
    const follow = pointer.current.active && !overlayOpen(store);
    if (follow) ndc.copy(pointer.current.position);
    else ndc.set(0.3 + Math.sin(w * 0.13) * 0.3, 0.1 + Math.sin(w * 0.21 + 0.7) * 0.15);
    const rayTo = (p: Vector2) => ray.set(p.x, p.y, 0.5).unproject(camera).sub(camera.position).normalize();

    // Day: circle a point on the cursor's ray at the focus distance (short
    // of the ground), kept above the meadow.
    const s = NIGHTINGALE;
    const distance = focusDistance(camera);
    const b = bird.current;
    const revealed = intro >= INTRO_UI_AT;
    if (!revealed || !b.placed) {
      rayTo(OFF_FRAME);
      b.pos.copy(camera.position).addScaledVector(ray, distance);
      b.vel.set(0, 0, 0);
      b.placed = revealed;
    }
    rayTo(ndc);
    const reach = Math.min(distance, rayGroundDistance(camera.position, ray, distance) - 1);
    anchor.copy(camera.position).addScaledVector(ray, reach);
    anchor.y = Math.max(anchor.y, terrainHeight(anchor.x, anchor.z) + 0.6);
    if (!calm) orbit.current += dt * s.orbitSpeed;
    const a = orbit.current;
    const r = s.orbitRadius * (1 + 0.25 * Math.sin(a * 0.37));
    // A tilted ellipse in front of and behind the cursor, wobbling up and down.
    goal
      .copy(anchor)
      .addScaledVector(camRight, Math.cos(a) * r)
      .addScaledVector(camForward, Math.sin(a) * r * 0.9)
      .addScaledVector(camUp, (Math.sin(a * 2.1) * 0.25 + Math.sin(a) * 0.2) * r);
    force.subVectors(goal, b.pos).multiplyScalar(STIFFNESS).addScaledVector(b.vel, -DAMPING);
    b.vel.addScaledVector(force, dt);
    b.pos.addScaledVector(b.vel, dt);

    // Night: the light hovers above the ground under the cursor, or wanders
    // around the view. While the night panel is open, it lights what the
    // panel tells of: the open place, or the point on the path it has got to.
    const focus = panelFocus(store.panel, store.pathStation);
    if (focus) {
      hit.set(focus.x, terrainHeight(focus.x, -focus.d), -focus.d);
    } else if (follow) {
      const toGround = rayGroundDistance(camera.position, ray, 400);
      if (toGround < 400) hit.copy(camera.position).addScaledVector(ray, toGround);
    } else {
      const [cx, , cz] = nightCamera.lookAt;
      // Narrower on portrait screens, so it stays in frame.
      const across = Math.min(1, camera.aspect / 1.6);
      const x = cx + (Math.sin(w * 0.21) * 34 + Math.sin(w * 0.53) * 9) * across;
      const z = cz + Math.sin(w * 0.17 + 1.2) * (18 + 14 * (1 - across));
      hit.set(x, terrainHeight(x, z), z);
    }
    ground.current.lerp(hit, 1 - Math.exp(-dt * 6));
    nightPos.copy(ground.current).setY(ground.current.y + CURSOR_LIGHT_HEIGHT);

    // The turn: it dives from its circle to the light's place.
    const dive = MathUtils.smootherstep(morph, s.dive[0], s.dive[1]);
    last.current.copy(position);
    position.lerpVectors(b.pos, nightPos, dive);
    dustUniforms.uLightPos.value.copy(position);

    // Heading along its flight, banking into turns.
    heading.subVectors(position, last.current).divideScalar(Math.max(dt, 1e-4));
    const speed = heading.length();
    if (speed > 0.05) forward.current.lerp(heading.divideScalar(speed), 1 - Math.exp(-dt * 8)).normalize();
    const f = forward.current;
    side.crossVectors(f, WORLD_UP);
    const turn = side.lengthSq() > 1e-4 ? force.dot(side.normalize()) : 0;
    bank.current = MathUtils.damp(bank.current, MathUtils.clamp(-turn * 0.03, -0.9, 0.9), 6, dt);
    up.copy(WORLD_UP).addScaledVector(f, -f.dot(WORLD_UP));
    if (up.lengthSq() < 1e-4) up.copy(camUp);
    up.normalize().applyAxisAngle(f, bank.current);
    side.crossVectors(f, up);
    basis.makeBasis(f, up, side).setPosition(position);

    // Wingbeats in bursts, then short glides; faster climbing.
    const burst = MathUtils.smoothstep(Math.sin(w * 0.9) + Math.sin(w * 2.3) * 0.4 + b.vel.y * 0.6, -0.6, 0.3);
    const beat = calm ? 0.3 : 0.15 + 0.85 * burst;
    flap.current += dt * Math.PI * 2 * s.flapRate * (calm ? 0.25 : 0.6 + 0.4 * burst);
    nightingaleUniforms.uFlap.value = beat * (Math.sin(flap.current) * 0.8 + 0.15);

    // It kindles into the light, then fades into the light's own core.
    nightingaleUniforms.uBirdGlow.value = MathUtils.smoothstep(morph, s.glow[0], s.glow[1]);
    const fade = 1 - MathUtils.smoothstep(morph, s.fade[0], s.fade[1]);
    nightingaleUniforms.uBirdFade.value = fade;

    const m = mesh.current;
    if (!m) return;
    m.visible = revealed && fade > 0;
    // One depth for the whole bird, so depth of field blurs it as one.
    nightingaleUniforms.uBirdDepth.value = size.copy(position).project(camera).z * 0.5 + 0.5;
    m.matrix.copy(basis).scale(size.setScalar(s.size));
    m.matrixWorldNeedsUpdate = true;
  });

  const geometry = useMemo(() => createNightingaleGeometry(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const material = useMemo(() => createNightingaleMaterial(), []);
  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh
      ref={mesh}
      name="nightingale"
      geometry={geometry}
      material={material}
      matrixAutoUpdate={false}
      renderOrder={10}
      frustumCulled={false}
      visible={false}
    />
  );
}

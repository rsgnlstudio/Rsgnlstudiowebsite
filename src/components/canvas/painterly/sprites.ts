import {
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  PlaneGeometry,
} from "three";
import { terrainHeightGLSL } from "./landscape";
import { noiseGLSL, windGLSL } from "./shaderChunks";

/** Per-instance data for ground-standing sprites (flowers, grass, trees). */
export interface SpriteInstances {
  count: number;
  /** Base position on the ground. */
  offset: Float32Array; // vec3
  /** Width, height in world units. A negative width mirrors the sprite. */
  size: Float32Array; // vec2
  /** Static lean in radians. */
  lean: Float32Array;
  /** Atlas cell index. */
  cell: Float32Array;
  /** Palette slot the fragment shader colors the sprite with. */
  tint: Float32Array;
  /** Color variation: hue shift (radians), saturation and value multipliers. */
  variation: Float32Array; // vec3
  /** Wind phase. */
  phase: Float32Array;
}

export function allocateSprites(count: number): SpriteInstances {
  return {
    count,
    offset: new Float32Array(count * 3),
    size: new Float32Array(count * 2),
    lean: new Float32Array(count),
    cell: new Float32Array(count),
    tint: new Float32Array(count),
    variation: new Float32Array(count * 3),
    phase: new Float32Array(count),
  };
}

/**
 * Instanced quad (pivot at the bottom edge) carrying SpriteInstances. Vertical
 * segments let the wind bend it smoothly.
 */
export function createSpriteGeometry(data: SpriteInstances, segments = 4) {
  const base = new PlaneGeometry(1, 1, 1, segments);
  const geometry = new InstancedBufferGeometry();
  geometry.index = base.index;
  geometry.setAttribute("position", base.attributes.position);
  geometry.setAttribute("uv", base.attributes.uv);
  geometry.setAttribute("aOffset", new InstancedBufferAttribute(data.offset, 3));
  geometry.setAttribute("aSize", new InstancedBufferAttribute(data.size, 2));
  geometry.setAttribute("aLean", new InstancedBufferAttribute(data.lean, 1));
  geometry.setAttribute("aCell", new InstancedBufferAttribute(data.cell, 1));
  geometry.setAttribute("aTint", new InstancedBufferAttribute(data.tint, 1));
  geometry.setAttribute("aVar", new InstancedBufferAttribute(data.variation, 3));
  geometry.setAttribute("aPhase", new InstancedBufferAttribute(data.phase, 1));
  geometry.instanceCount = data.count;
  return geometry;
}

/**
 * Vertex shader for SpriteInstances: a cylindrical billboard that turns to
 * face the camera around its vertical axis, bending in the wind with the tip
 * moving most. In the night top view (uTopView -> 1) it tips over to face the
 * camera, lying on the ground like a tree drawn on a map, scaled by
 * uTopScale. Needs uniforms uGrid (atlas cols, rows), uSway, uTime, uWind,
 * uTopView and uTopScale.
 *
 * With the SQUEEZE define, x positions are scaled by uniform uSqueeze and the
 * sprite is re-seated on the terrain (used to pull tree lines into view on
 * narrow screens); `aOffset.y` is then the offset from the ground.
 */
export const spriteVertexShader = /* glsl */ `
attribute vec3 aOffset;
attribute vec2 aSize;
attribute float aLean;
attribute float aCell;
attribute float aTint;
attribute vec3 aVar;
attribute float aPhase;

uniform vec2 uGrid;
uniform float uSway;
uniform float uTime;
uniform float uWind;
uniform float uTopView;
uniform float uTopScale;
#ifdef SQUEEZE
uniform float uSqueeze;
#endif

varying vec2 vUv;
varying vec2 vLocal;
varying float vTint;
varying vec3 vVar;
varying float vDist;

${noiseGLSL}
${windGLSL}
${terrainHeightGLSL}

void main() {
  vec3 base = aOffset;
  #ifdef SQUEEZE
  base.x *= uSqueeze;
  base.y += terrainHeight(base.x, base.z);
  #endif
  vec3 toCam = cameraPosition - base;
  vec2 facing = normalize(toCam.xz + vec2(0.0, 1e-4));
  vec3 right = vec3(facing.y, 0.0, -facing.x);
  vec3 up = vec3(0.0, 1.0, 0.0);
  // Top view: billboard toward the camera's screen axes instead.
  vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 camUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  right = normalize(mix(right, camRight, uTopView));
  up = normalize(mix(up, camUp, uTopView));

  vec2 size = aSize * mix(1.0, uTopScale, uTopView);
  // The crowd right at the day camera's feet clumps into specks from above.
  float atFeet = step(0.0, -base.z) * step(-base.z, 5.0) * step(abs(base.x), 8.0);
  size *= 1.0 - atFeet * smoothstep(0.3, 0.8, uTopView);
  float t = uv.y;
  float bend = aLean + windSway(base, aPhase) * uSway;
  vec2 local = vec2(position.x * size.x, t * size.y);
  local.x += sin(bend) * size.y * t * t;
  local.y -= (1.0 - cos(bend)) * size.y * t * t;
  vec3 world = base + right * local.x + up * local.y;
  // Tipped-over sprites stay above the rolling ground, tips over roots.
  if (uTopView > 0.0) {
    world.y = max(world.y, terrainHeight(world.x, world.z) + (0.1 + 0.4 * t) * uTopView);
  }

  float col = mod(aCell, uGrid.x);
  float row = floor(aCell / uGrid.x);
  vec2 cellUv = mix(vec2(0.01), vec2(0.99), uv);
  vUv = vec2((col + cellUv.x) / uGrid.x, (uGrid.y - 1.0 - row + cellUv.y) / uGrid.y);
  vLocal = uv;
  vTint = aTint;
  vVar = aVar;
  vDist = length(toCam);

  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

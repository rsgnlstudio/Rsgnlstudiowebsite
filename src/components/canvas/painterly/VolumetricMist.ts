import { Effect, EffectAttribute } from "postprocessing";
import { type Camera, Matrix4, Uniform, Vector3, Vector4 } from "three";
import type { PaletteKey } from "@/config/palette";
import { terrainHeight } from "./landscape";
import { paletteGLSL, paletteUniformsFor, sharedUniforms } from "./palette";
import { viewUniforms } from "./view";

/**
 * Banks of mist: x, d (distance into the field), height of the centre above
 * the ground, radius (m) and density. The first ones curl around the flowers
 * by the lens at the edges of the frame; the rest lie low between the tree
 * lines and give the meadow depth.
 */
const BANKS: [x: number, d: number, y: number, radius: number, density: number][] = [
  // By the lens, low at the edges of the frame.
  [-2.9, 3.2, 0.3, 1.3, 0.35],
  [3.1, 3.4, 0.4, 1.4, 0.3],
  // Low in the meadow, along the tree lines and toward the far field.
  [-13, 28, 0.2, 6, 0.1],
  [14, 32, 0.3, 7, 0.1],
  [-20, 55, 0.6, 10, 0.08],
  [22, 62, 0.8, 11, 0.08],
];

const COLORS = ["cloudLight", "cloudShade", "cloudShadow", "haze", "sunGlow"] as const satisfies readonly PaletteKey[];

const fragmentShader = /* glsl */ `
${paletteGLSL(COLORS)}
uniform mat4 uProjInv;
uniform mat4 uCamWorld;
uniform vec3 uCamPos;
uniform vec4 uBanks[${BANKS.length}];
uniform float uDensity[${BANKS.length}];
uniform float uTime;
uniform float uFade;
uniform vec3 uSunDir;
uniform float uSunStrength;

float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), f.x), mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), f.x), mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), f.x), f.y),
    f.z
  );
}

// Billowing cloud density in a bank: a flattened ball, eaten into by
// drifting noise so its edges are wisps, not a shell.
float bankDensity(vec3 p, vec4 bank, int octaves) {
  vec3 q = (p - bank.xyz) / bank.w;
  q.y *= 1.7;
  vec3 n = q * 2.2 + vec3(uTime * 0.02, 0.0, uTime * 0.012);
  float billow = 0.0;
  float amp = 0.55;
  for (int i = 0; i < 3; i++) {
    if (i >= octaves) break;
    billow += noise3(n) * amp;
    n = n * 2.03 + 7.1;
    amp *= 0.5;
  }
  return clamp(1.0 - length(q) + (billow - 0.45) * 1.1, 0.0, 1.0);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  // The view ray, and how far it travels before it hits the scene.
  vec4 view = uProjInv * vec4(uv * 2.0 - 1.0, 1.0, 1.0);
  vec3 viewDir = normalize(view.xyz / view.w);
  float surface = depth >= 0.9999 ? 1e4 : getViewZ(depth) / viewDir.z;
  vec3 dir = normalize((uCamWorld * vec4(viewDir, 0.0)).xyz);

  // A fixed per-pixel offset into the march hides the steps without
  // flickering from frame to frame.
  float jitter = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));

  float transmit = 1.0;
  vec3 light = vec3(0.0);
  float forward = pow(max(dot(dir, uSunDir), 0.0), 6.0);
  for (int i = 0; i < ${BANKS.length}; i++) {
    vec4 bank = uBanks[i];
    float density = uDensity[i] * uFade;
    if (density <= 0.0) continue;
    // Where the ray crosses the bank's bounding sphere, cut off by the scene.
    vec3 oc = uCamPos - bank.xyz;
    float b = dot(oc, dir);
    float c = dot(oc, oc) - bank.w * bank.w;
    float h = b * b - c;
    if (h <= 0.0) continue;
    h = sqrt(h);
    float t0 = max(-b - h, 0.0);
    float t1 = min(-b + h, surface);
    if (t1 <= t0) continue;
    const int STEPS = 8;
    // Far banks are soft anyway: fewer octaves of billow.
    int octaves = bank.w > 4.0 ? 2 : 3;
    float dt = (t1 - t0) / float(STEPS);
    for (int s = 0; s < STEPS; s++) {
      vec3 p = uCamPos + dir * (t0 + (float(s) + jitter) * dt);
      float d = bankDensity(p, bank, octaves);
      if (d <= 0.001) continue;
      // Light reaching this point: the tops of the billows catch the sun,
      // the dense cores and the undersides stay in their own shadow.
      float up = (p.y - bank.y) / bank.w;
      float lit = clamp(0.45 + up * 0.9, 0.0, 1.0) * exp(-d * 1.4);
      vec3 col = mix(uCloudShadow, uCloudShade, lit);
      col = mix(col, uCloudLight, lit * lit);
      col = mix(col, uHaze, 0.25);
      // Silver lining: sunlight scattered forward through thin mist.
      col += uSunGlow * forward * lit * 0.9 * uSunStrength;
      float a = 1.0 - exp(-d * density * dt * 2.4 / bank.w);
      light += transmit * a * col;
      transmit *= 1.0 - a;
      if (transmit < 0.02) break;
    }
  }
  outputColor = vec4(inputColor.rgb * transmit + light, inputColor.a);
}
`;

/**
 * Volumetric mist, raymarched through soft noise-shaped banks against the
 * scene's depth, so it wraps around trees and flowers instead of clipping
 * like a flat card. Lit by the low sun: shadowed where cloud lies between a
 * point and the sun, glowing where the sun shines through. It thins out as
 * the camera rises to the night view and as the day morphs into the night.
 * Runs in its own pass before depth of field, so it blurs with
 * what's behind it.
 */
export class VolumetricMist extends Effect {
  private readonly camera: Camera;

  constructor(camera: Camera) {
    const banks = BANKS.map(([x, d, y, radius]) => new Vector4(x, terrainHeight(x, -d) + y, -d, radius));
    const palette = Object.entries(paletteUniformsFor(COLORS)) as [string, Uniform][];
    super("VolumetricMist", fragmentShader, {
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map<string, Uniform>([
        ...palette,
        ["uProjInv", new Uniform(new Matrix4())],
        ["uCamWorld", new Uniform(new Matrix4())],
        ["uCamPos", new Uniform(new Vector3())],
        ["uBanks", new Uniform(banks)],
        ["uDensity", new Uniform(BANKS.map((bank) => bank[4]))],
        ["uTime", sharedUniforms.uTime as unknown as Uniform],
        ["uFade", new Uniform(1)],
        ["uSunDir", sharedUniforms.uSunDir as unknown as Uniform],
        ["uSunStrength", sharedUniforms.uSunStrength as unknown as Uniform],
      ]),
    });
    this.camera = camera;
  }

  override update() {
    const u = this.uniforms;
    this.camera.updateMatrixWorld();
    u.get("uProjInv")!.value.copy(this.camera.projectionMatrixInverse);
    u.get("uCamWorld")!.value.copy(this.camera.matrixWorld);
    u.get("uCamPos")!.value.setFromMatrixPosition(this.camera.matrixWorld);
    // Gone as the camera rises: from above it would just veil the meadow.
    u.get("uFade")!.value = 1 - smoothstep(viewUniforms.uTopView.value, 0.15, 0.5);
    // And it thins out everywhere at once as the day morphs into the night.
    const density = u.get("uDensity")!.value as number[];
    const clear = 1 - smoothstep(sharedUniforms.uMorph.value, 0.1, 0.6);
    BANKS.forEach((bank, i) => {
      density[i] = bank[4] * clear;
    });
  }
}

function smoothstep(x: number, a: number, b: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

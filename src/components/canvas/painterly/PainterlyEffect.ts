import { Effect } from "postprocessing";
import { Uniform } from "three";

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uGrain;
uniform float uVignette;

float grainHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(grainHash(i), grainHash(i + vec2(1.0, 0.0)), u.x),
    mix(grainHash(i + vec2(0.0, 1.0)), grainHash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 color = inputColor.rgb;
  vec2 px = uv * resolution;

  // Canvas: a faint linen weave and mottled ground under the paint.
  float weave = sin(px.x * 1.9) * sin(px.y * 1.9 + sin(px.x * 0.31) * 1.2);
  float mottle = valueNoise(px / 140.0) - 0.5;
  color *= 1.0 + weave * 0.018 + mottle * 0.05;

  // Fine, slowly animated luminance grain (new pattern ~24 times a second).
  float frame = floor(uTime * 24.0);
  float g = grainHash(px + frame * 17.31) + grainHash(px * 1.37 - frame * 5.7) - 1.0;
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float response = 0.35 + 0.65 * smoothstep(0.0, 0.25, luma) * (1.0 - smoothstep(0.6, 1.2, luma));
  color += g * uGrain * 0.09 * response * (0.4 + sqrt(max(luma, 0.0)));

  // Soft oval vignette.
  vec2 d = (uv - 0.5) * vec2(1.0, 0.85);
  color *= 1.0 - uVignette * smoothstep(0.25, 0.85, dot(d, d) * 2.2);

  outputColor = vec4(max(color, 0.0), inputColor.a);
}
`;

/** Final finish over the painted frame: canvas texture, film grain, vignette. */
export class PainterlyEffect extends Effect {
  constructor() {
    super("PainterlyEffect", fragmentShader, {
      uniforms: new Map<string, Uniform>([
        ["uTime", new Uniform(0)],
        ["uGrain", new Uniform(0.3)],
        ["uVignette", new Uniform(0.3)],
      ]),
    });
  }

  set time(value: number) {
    this.uniforms.get("uTime")!.value = value;
  }

  set grain(value: number) {
    this.uniforms.get("uGrain")!.value = value;
  }

  set vignette(value: number) {
    this.uniforms.get("uVignette")!.value = value;
  }
}

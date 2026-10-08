import { KawaseBlurPass, KernelSize, Pass } from "postprocessing";
import {
  HalfFloatType,
  type Texture,
  Vector2,
  type WebGLRenderer,
  WebGLRenderTarget,
} from "three";

/**
 * The wet canvas: what has been painted so far, softly spread out. Strokes
 * read it at their position and pick up some of the wet paint around them,
 * most where their own paint is thin (edges, dry tails). So neighbouring
 * colors bleed into each other, as they do when a painter works wet in wet,
 * and the scene reads as one painting rather than objects side by side.
 *
 * uWetAmount scales the pickup. Effects sets it from the look, fades it out
 * with the day and keeps it at 0 until the first frame has been captured.
 */
export const wetUniforms = {
  uWet: { value: null as Texture | null },
  uWetAmount: { value: 0 },
  /** Size of the drawing buffer in pixels, to turn gl_FragCoord into uv. */
  uScreen: { value: new Vector2(1, 1) },
};

/**
 * GLSL: wetMix(color, pickup) mixes a color with the wet paint around the
 * fragment. Wet in wet, hues bleed into each other far more than values do,
 * so the pickup takes on the wet paint's color mostly at the stroke's own
 * lightness: edges between hues melt, while light and shadow stay put and
 * nothing turns muddy. Needs the wetUniforms declared (`uniform sampler2D
 * uWet; uniform float uWetAmount; uniform vec2 uScreen;`).
 */
export const wetGLSL = /* glsl */ `
vec3 wetMix(vec3 color, float pickup) {
  vec3 wet = texture2D(uWet, gl_FragCoord.xy / uScreen).rgb;
  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
  float lc = dot(color, LUMA);
  float lw = dot(wet, LUMA);
  vec3 sameValue = wet * clamp((lc + 0.02) / (lw + 0.02), 0.0, 4.0);
  return mix(color, mix(sameValue, wet, 0.3), clamp(pickup, 0.0, 0.9) * uWetAmount);
}
`;

/**
 * Captures the rendered scene right after the render pass, blurred at a
 * quarter of the resolution, for the next frame's strokes. Leaves the frame
 * itself untouched. The one frame of lag doesn't show: the camera barely
 * moves by day.
 */
export class WetCanvasPass extends Pass {
  private readonly blur = new KawaseBlurPass({ kernelSize: KernelSize.LARGE, resolutionScale: 0.5 });
  private readonly target = new WebGLRenderTarget(1, 1, { type: HalfFloatType, depthBuffer: false });
  /** Whether a frame has been captured yet. */
  ready = false;

  constructor() {
    super("WetCanvasPass");
    this.needsSwap = false;
    wetUniforms.uWet.value = this.target.texture;
  }

  override render(renderer: WebGLRenderer, inputBuffer: WebGLRenderTarget) {
    this.blur.render(renderer, inputBuffer, this.target);
    this.ready = true;
  }

  override setSize(width: number, height: number) {
    this.blur.setSize(width, height);
    this.target.setSize(Math.max(1, Math.round(width / 4)), Math.max(1, Math.round(height / 4)));
    wetUniforms.uScreen.value.set(width, height);
  }

  override dispose() {
    this.blur.dispose();
    this.target.dispose();
    if (wetUniforms.uWet.value === this.target.texture) wetUniforms.uWet.value = null;
    super.dispose();
  }
}

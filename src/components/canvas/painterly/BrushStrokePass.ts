import { Pass } from "postprocessing";
import {
  HalfFloatType,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  type WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { paletteGLSL, paletteUniformsFor } from "./palette";
import { mulberry32 } from "./random";
import { noiseGLSL } from "./shaderChunks";

/** One layer of strokes; layers paint coarse to fine. */
export interface StrokeLayer {
  /** Grid spacing between stroke centres, in CSS pixels. */
  spacing: number;
  /** Stroke length and width, relative to the spacing. */
  length: number;
  width: number;
}

/**
 * Coarse to fine. The first layer covers the whole canvas; each finer layer
 * only paints where shapes are too small for the layer before it, so big
 * shapes keep big strokes and small shapes get small ones.
 */
export const STROKE_LAYERS: readonly StrokeLayer[] = [
  { spacing: 40, length: 2.2, width: 1.2 },
  { spacing: 22, length: 2.0, width: 1.05 },
  { spacing: 12, length: 1.8, width: 1.0 },
  { spacing: 6.5, length: 1.5, width: 1.0 },
];

/** Resolution divisor of the feature-size map. */
const SCALE_DIVISOR = 4;
/** Share of the previous frame kept per 60 Hz frame (temporal settling). */
const HISTORY_KEEP = 0.6;

const UNDERPAINT_COLORS = ["underpaint"] as const;

const fullscreenVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// Feature-size map (quarter resolution). rgb: softened color, used for
// stroke color in big shapes and for stroke direction. a: the size in pixels
// of the shape under this point. Rings of growing radius are tested; a ring
// still counts as inside while less than about half of it differs, so a
// point next to a straight edge still belongs to the big shape (its strokes
// reach across the edge) while a small flower is enclosed quickly.
const scaleFragment = /* glsl */ `
uniform sampler2D tSource;
uniform vec2 uTexel;
uniform float uUnit;
varying vec2 vUv;

float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main() {
  vec3 c = texture2D(tSource, vUv).rgb * 0.4;
  c += texture2D(tSource, vUv + vec2(1.5, 0.5) * uTexel).rgb * 0.15;
  c += texture2D(tSource, vUv + vec2(-0.5, 1.5) * uTexel).rgb * 0.15;
  c += texture2D(tSource, vUv + vec2(-1.5, -0.5) * uTexel).rgb * 0.15;
  c += texture2D(tSource, vUv + vec2(0.5, -1.5) * uTexel).rgb * 0.15;

  float norm = 1.0 / (luma(c) + 0.2);
  float size = 0.0;
  float r = 3.0 * uUnit;
  float found = 0.0;
  for (int k = 0; k < 7; k++) {
    float differs = 0.0;
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.7854 + float(k) * 0.39;
      vec3 tap = texture2D(tSource, vUv + vec2(cos(a), sin(a)) * r * uTexel).rgb;
      differs += smoothstep(0.18, 0.34, length(tap - c) * norm);
    }
    // Soft step instead of a hard cut, so the size changes smoothly.
    float inside = 1.0 - smoothstep(0.5, 0.75, differs / 8.0);
    size += found < 0.5 ? r * 0.5 * inside : 0.0;
    found = max(found, step(inside, 0.5));
    r *= 2.0;
  }
  gl_FragColor = vec4(c, size + 1.5 * uUnit);
}
`;

// The canvas before the strokes: a toned ground, heavily blurred so it
// carries the color masses of the scene but no object shapes, which would
// otherwise show through the gaps as hard silhouettes.
const underpaintFragment = /* glsl */ `
${paletteGLSL(UNDERPAINT_COLORS)}
uniform sampler2D tScale;
uniform vec2 uRadius;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tScale, vUv).rgb * 0.2;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7854;
    c += texture2D(tScale, vUv + vec2(cos(a), sin(a)) * uRadius).rgb * 0.06;
    c += texture2D(tScale, vUv + vec2(cos(a + 0.39), sin(a + 0.39)) * uRadius * 2.0).rgb * 0.04;
  }
  gl_FragColor = vec4(mix(c * 0.85, uUnderpaint, 0.18), 1.0);
}
`;

const strokeVertex = /* glsl */ `
uniform sampler2D tSource;
uniform sampler2D tScale;
uniform vec2 uResolution;
uniform float uSpacing;
/** Spacing of the next coarser layer; 0 for the base layer. */
uniform float uCoarser;
uniform float uLength;
uniform float uWidth;

attribute vec2 aCell;
attribute vec4 aRand;

varying vec2 vLocal;
varying vec3 vColor;
varying vec4 vRand;
varying float vAlpha;
varying vec2 vSize;

float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main() {
  vec4 r2 = fract(aRand * 7.31 + aRand.yzwx * 3.17);
  vec2 px = (aCell + 0.5 + (aRand.xy - 0.5) * 0.85) * uSpacing;
  vec2 uv = clamp(px / uResolution, 0.0, 1.0);

  vec4 scale = texture2D(tScale, uv);
  float feature = scale.a;

  // Finer layers fade in only where the shape is too small for the coarser
  // strokes. Fading (not culling) keeps strokes from popping in and out.
  float visible = uCoarser > 0.0
    ? 1.0 - smoothstep(uCoarser * 0.45, uCoarser * 0.85, feature)
    : 1.0;
  if (visible < 0.02) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }

  // Stroke size follows the size of the shape it paints.
  float fit = clamp(feature / (uSpacing * 1.2), 0.65, uCoarser > 0.0 ? 1.25 : 1.7);
  // Bigger strokes, fewer of them: keeps coverage (and overdraw) constant.
  if (fract(aRand.y * 13.1 + aRand.x * 5.3) > 1.3 / (fit * fit)) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }

  // Color: the sharp frame for small strokes, the softened map for large
  // ones, so big strokes don't flicker with every small change underneath.
  vec3 sharp = texture2D(tSource, uv).rgb;
  vec3 c = mix(sharp, scale.rgb, smoothstep(10.0, 40.0, uSpacing * fit));

  // Direction: along edges (from the softened map), a gentle horizontal
  // flow elsewhere. Blended in doubled-angle space so strokes never flip.
  vec2 h = vec2(uSpacing * fit) / uResolution;
  float gx = luma(texture2D(tScale, uv + vec2(h.x, 0.0)).rgb) - luma(texture2D(tScale, uv - vec2(h.x, 0.0)).rgb);
  float gy = luma(texture2D(tScale, uv + vec2(0.0, h.y)).rgb) - luma(texture2D(tScale, uv - vec2(0.0, h.y)).rgb);
  vec2 g = vec2(gx, gy) / (luma(c) + 0.15);
  float flow = 0.25 * sin(uv.x * 4.0 + uv.y * 3.0) + 0.3 * (uv.y - 0.5) + (r2.x - 0.5) * 0.5;
  float edge = atan(g.y, g.x) + 1.5708;
  vec2 d2 = mix(vec2(cos(2.0 * flow), sin(2.0 * flow)), vec2(cos(2.0 * edge), sin(2.0 * edge)),
    smoothstep(0.05, 0.3, length(g)));
  float angle = 0.5 * atan(d2.y, d2.x) + (r2.y - 0.5) * 0.35;

  float grow = mix(0.5, 1.0, visible);
  float len = uSpacing * fit * uLength * (0.75 + 0.5 * r2.z) * grow;
  float wid = uSpacing * fit * uWidth * (0.75 + 0.45 * r2.w) * grow;
  vec2 local = position.xy * vec2(len, wid);
  vec2 p = px + vec2(cos(angle) * local.x - sin(angle) * local.y, sin(angle) * local.x + cos(angle) * local.y);
  gl_Position = vec4(p / uResolution * 2.0 - 1.0, 0.0, 1.0);

  // Broken color: every stroke a touch lighter or darker, warmer or cooler.
  float value = 1.0 + (aRand.z - 0.5) * 0.16;
  vec3 temperature = mix(vec3(0.95, 1.0, 1.06), vec3(1.06, 1.0, 0.94), aRand.w);
  vColor = c * value * temperature;
  vLocal = position.xy + 0.5;
  vRand = r2;
  vAlpha = visible;
  vSize = vec2(len, wid);
}
`;

const strokeFragment = /* glsl */ `
varying vec2 vLocal;
varying vec3 vColor;
varying vec4 vRand;
varying float vAlpha;
varying vec2 vSize;
${noiseGLSL}

void main() {
  float along = vLocal.x;
  float across = vLocal.y * 2.0 - 1.0;

  // Loaded, rounded start; thinning, ragged tail.
  float body = sqrt(smoothstep(0.0, 0.2, along)) * (1.0 - 0.4 * smoothstep(0.45, 1.0, along));
  float ragged = (vnoise(vec2(along * 6.0, vRand.x * 50.0)) - 0.5) * 0.4;
  float halfWidth = 0.92 * body * (1.0 + ragged);
  float alpha = 1.0 - smoothstep(halfWidth - 0.14, halfWidth, abs(across));

  // Bristle streaks running along the stroke, a few pixels apart whatever
  // the brush size, so broad strokes read as a wide brush, not a smooth blob.
  float bristles = max(4.0, vSize.y / 5.0);
  float bristle = vnoise(vec2(along * max(2.2, vSize.x / 40.0) + vRand.y * 13.0, across * bristles + vRand.z * 29.0));
  // Dry brush: the tail breaks up between the bristles.
  float dry = smoothstep(0.55, 1.0, along + (bristle - 0.5) * 0.5);
  alpha *= 1.0 - dry * smoothstep(0.4, 0.7, 1.0 - bristle);
  // Slightly translucent paint, so overlapping strokes of neighbouring
  // shapes mix at their borders instead of cutting each other off.
  alpha *= (1.0 - smoothstep(0.9, 1.0, along)) * vAlpha * (0.8 + 0.15 * vRand.w);
  if (alpha < 0.01) discard;

  // Impasto: ridges catch light, furrows hold shadow.
  gl_FragColor = vec4(vColor * (0.9 + 0.22 * bristle), alpha);
}
`;

// Temporal settling: blends the fresh painting with the previous frame so
// strokes recolor smoothly instead of flickering as the scene moves beneath.
const settleFragment = /* glsl */ `
uniform sampler2D tPaint;
uniform sampler2D tHistory;
uniform float uKeep;
varying vec2 vUv;
void main() {
  vec3 paint = texture2D(tPaint, vUv).rgb;
  vec3 history = texture2D(tHistory, vUv).rgb;
  gl_FragColor = vec4(mix(paint, history, uKeep), 1.0);
}
`;

const copyFragment = /* glsl */ `
uniform sampler2D tSource;
varying vec2 vUv;
void main() {
  gl_FragColor = vec4(texture2D(tSource, vUv).rgb, 1.0);
}
`;

const fullscreen = (fragmentShader: string, uniforms: Record<string, { value: unknown }>) => {
  const mesh = new Mesh(
    new PlaneGeometry(2, 2),
    new ShaderMaterial({
      vertexShader: fullscreenVertex,
      fragmentShader,
      uniforms,
      depthTest: false,
      depthWrite: false,
    }),
  );
  mesh.frustumCulled = false;
  return mesh;
};

const createTarget = () =>
  new WebGLRenderTarget(1, 1, {
    type: HalfFloatType,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: false,
  });

/**
 * Repaints the rendered frame with brushstrokes, the way a painter works a
 * canvas: a toned underpainting, then layers of oriented strokes from broad
 * to fine.
 *
 * 1. A quarter-resolution feature-size map measures, per pixel, how big the
 *    shape under it is.
 * 2. Each stroke takes its color from the frame, runs along the local edges
 *    and is sized to the shape under it. Finer layers only fade in where
 *    shapes are small, so the sky, near blossoms and leaf masses get broad
 *    strokes and the distant field gets fine dabs.
 * 3. The result is blended with the previous frame to settle flicker.
 *
 * Strokes sit on a fixed, jittered screen grid with seeded randomness, so the
 * painting itself is stable from frame to frame.
 */
export class BrushStrokePass extends Pass {
  private readonly layers: { config: StrokeLayer; mesh: Mesh<InstancedBufferGeometry, ShaderMaterial> }[];
  private readonly paintScene = new Scene();
  private readonly scaleQuad: Mesh<PlaneGeometry, ShaderMaterial>;
  private readonly underpaint: Mesh<PlaneGeometry, ShaderMaterial>;
  private readonly settleQuad: Mesh<PlaneGeometry, ShaderMaterial>;
  private readonly copyQuad: Mesh<PlaneGeometry, ShaderMaterial>;
  private readonly scaleTarget = createTarget();
  private readonly paintTarget = createTarget();
  private history = [createTarget(), createTarget()];
  private hasHistory = false;
  private readonly resolution = new Vector2(1, 1);
  private gl: WebGLRenderer | null = null;
  private scale = 1;

  constructor(layers: readonly StrokeLayer[] = STROKE_LAYERS) {
    super("BrushStrokePass", new Scene(), new OrthographicCamera(-1, 1, 1, -1, 0, 1));
    this.needsSwap = true;

    this.scaleQuad = fullscreen(scaleFragment, {
      tSource: { value: null },
      uTexel: { value: new Vector2() },
      uUnit: { value: 1 },
    });
    this.underpaint = fullscreen(underpaintFragment, {
      ...paletteUniformsFor(UNDERPAINT_COLORS),
      tScale: { value: this.scaleTarget.texture },
      uRadius: { value: new Vector2() },
    });
    this.underpaint.renderOrder = 0;
    this.paintScene.add(this.underpaint);
    this.settleQuad = fullscreen(settleFragment, {
      tPaint: { value: this.paintTarget.texture },
      tHistory: { value: null },
      uKeep: { value: 0 },
    });
    this.copyQuad = fullscreen(copyFragment, { tSource: { value: null } });

    this.layers = layers.map((config, index) => {
      const material = new ShaderMaterial({
        vertexShader: strokeVertex,
        fragmentShader: strokeFragment,
        uniforms: {
          tSource: { value: null },
          tScale: { value: this.scaleTarget.texture },
          uResolution: { value: this.resolution },
          uSpacing: { value: config.spacing },
          uCoarser: { value: 0 },
          uLength: { value: config.length },
          uWidth: { value: config.width },
        },
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      const mesh = new Mesh(new InstancedBufferGeometry(), material);
      mesh.frustumCulled = false;
      mesh.renderOrder = index + 1;
      this.paintScene.add(mesh);
      return { config, mesh };
    });
  }

  /** Brushstroke size multiplier. */
  set strokeScale(value: number) {
    if (value === this.scale) return;
    this.scale = value;
    this.rebuild();
  }

  override initialize(renderer: WebGLRenderer) {
    this.gl = renderer;
    this.rebuild();
  }

  override setSize(width: number, height: number) {
    this.resolution.set(Math.max(1, width), Math.max(1, height));
    this.rebuild();
  }

  override render(
    renderer: WebGLRenderer,
    inputBuffer: WebGLRenderTarget,
    outputBuffer: WebGLRenderTarget,
    deltaTime = 1 / 60,
  ) {
    const source = inputBuffer.texture;
    this.scaleQuad.material.uniforms.tSource.value = source;
    for (const { mesh } of this.layers) mesh.material.uniforms.tSource.value = source;

    this.draw(renderer, this.scaleQuad, this.scaleTarget);
    renderer.setRenderTarget(this.paintTarget);
    renderer.render(this.paintScene, this.camera);

    // Settle into the history buffer, then hand that on.
    const [previous, next] = this.history;
    const settle = this.settleQuad.material.uniforms;
    settle.tHistory.value = previous.texture;
    settle.uKeep.value = this.hasHistory ? Math.pow(HISTORY_KEEP, Math.min(deltaTime, 0.1) * 60) : 0;
    this.draw(renderer, this.settleQuad, next);
    this.history = [next, previous];
    this.hasHistory = true;

    this.copyQuad.material.uniforms.tSource.value = next.texture;
    this.draw(renderer, this.copyQuad, this.renderToScreen ? null : outputBuffer);
  }

  override dispose() {
    for (const quad of [this.scaleQuad, this.underpaint, this.settleQuad, this.copyQuad]) {
      quad.geometry.dispose();
      quad.material.dispose();
    }
    for (const { mesh } of this.layers) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    for (const target of [this.scaleTarget, this.paintTarget, ...this.history]) target.dispose();
    super.dispose();
  }

  private draw(renderer: WebGLRenderer, quad: Mesh, target: WebGLRenderTarget | null) {
    this.scene.add(quad);
    renderer.setRenderTarget(target);
    renderer.render(this.scene, this.camera);
    this.scene.remove(quad);
  }

  /** Resizes the buffers and lays out one jittered grid per stroke layer. */
  private rebuild() {
    const pixelRatio = this.gl?.getPixelRatio() ?? 1;
    const { x: width, y: height } = this.resolution;
    // Strokes scale with the viewport a little, so phones still read as painted.
    const cssMin = Math.min(width, height) / pixelRatio;
    const unit = pixelRatio * Math.min(1.25, Math.max(0.65, cssMin / 900)) * this.scale;

    this.scaleTarget.setSize(Math.ceil(width / SCALE_DIVISOR), Math.ceil(height / SCALE_DIVISOR));
    this.paintTarget.setSize(width, height);
    for (const target of this.history) target.setSize(width, height);
    this.hasHistory = false;
    const scaleUniforms = this.scaleQuad.material.uniforms;
    scaleUniforms.uTexel.value.set(1 / width, 1 / height);
    scaleUniforms.uUnit.value = unit;
    this.underpaint.material.uniforms.uRadius.value.set((24 * unit) / width, (24 * unit) / height);

    this.layers.forEach(({ config, mesh }, index) => {
      const spacing = config.spacing * unit;
      const uniforms = mesh.material.uniforms;
      uniforms.uSpacing.value = spacing;
      uniforms.uCoarser.value = index === 0 ? 0 : this.layers[index - 1].config.spacing * unit;
      const cols = Math.ceil(width / spacing) + 2;
      const rows = Math.ceil(height / spacing) + 2;
      const count = cols * rows;

      // Shuffled draw order so overlaps look hand-laid, not row by row.
      const order = new Uint32Array(count);
      for (let i = 0; i < count; i++) order[i] = i;
      const rng = mulberry32(1000 + index * 77);
      for (let i = count - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      const cells = new Float32Array(count * 2);
      const rand = new Float32Array(count * 4);
      for (let i = 0; i < count; i++) {
        const cell = order[i];
        cells[i * 2] = (cell % cols) - 1;
        cells[i * 2 + 1] = Math.floor(cell / cols) - 1;
        for (let k = 0; k < 4; k++) rand[i * 4 + k] = rng();
      }

      const base = new PlaneGeometry(1, 1);
      const geometry = new InstancedBufferGeometry();
      geometry.index = base.index;
      geometry.setAttribute("position", base.attributes.position);
      geometry.setAttribute("aCell", new InstancedBufferAttribute(cells, 2));
      geometry.setAttribute("aRand", new InstancedBufferAttribute(rand, 4));
      geometry.instanceCount = count;
      mesh.geometry.dispose();
      mesh.geometry = geometry;
    });
  }
}

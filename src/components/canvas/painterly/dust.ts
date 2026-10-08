import {
  HalfFloatType,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  type Texture,
  Vector2,
  Vector3,
  Vector4,
  type WebGLRenderer,
  WebGLRenderTarget,
} from "three";

/**
 * World rectangle (x, z) covered by the trail texture: everything the night
 * top view sees, with margin. minX, minZ, width, depth.
 */
export const TRAIL_RECT = new Vector4(-128, -190, 256, 256);

/**
 * State of the night dust world, shared by Dust (the particles) and
 * CursorLight (which writes it every frame).
 */
export const dustUniforms = {
  /** World position of the light that follows the cursor. */
  uLightPos: { value: new Vector3(0, 7, -42) },
  /** 0..1: the light fades in with the dust. */
  uLightStrength: { value: 0 },
  uLightIntensity: { value: 2.6 },
  uLightRadius: { value: 30 },
  /** Wake of the light: r = energy, gb = direction it moved in (x, z). */
  uTrail: { value: null as Texture | null },
  uTrailRect: { value: TRAIL_RECT },
  /** Distance the dust is in focus at: the ground under the light. */
  uFocus: { value: 110 },
  uPixelRatio: { value: 1 },
  uDustSize: { value: 1.15 },
  uBokeh: { value: 1 },
  uKick: { value: 1 },
};

const trailVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const trailFragment = /* glsl */ `
uniform sampler2D uPrev;
uniform vec2 uTexel;
uniform vec2 uPoint;
uniform vec2 uVelocity;
uniform float uRadius;
uniform float uAmount;
uniform float uDecay;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(uPrev, vUv);
  // Spread a little each frame, so the wake widens as it fades.
  vec4 n = texture2D(uPrev, vUv + vec2(uTexel.x, 0.0)) + texture2D(uPrev, vUv - vec2(uTexel.x, 0.0))
    + texture2D(uPrev, vUv + vec2(0.0, uTexel.y)) + texture2D(uPrev, vUv - vec2(0.0, uTexel.y));
  vec4 v = mix(c, n * 0.25, 0.3) * uDecay;
  vec2 d = vUv - uPoint;
  float s = exp(-dot(d, d) / (uRadius * uRadius)) * uAmount;
  v.r = min(v.r + s, 1.5);
  v.gb = clamp(v.gb + uVelocity * s, -1.5, 1.5);
  gl_FragColor = v;
}
`;

/**
 * The wake of the cursor light over the ground: a small ping-pong texture
 * that the moving light splats energy and direction into and that slowly
 * decays and spreads. The dust reads it to rise and drift, and settles back
 * as it fades.
 */
export class DustTrail {
  private targets: [WebGLRenderTarget, WebGLRenderTarget];
  private index = 0;
  private scene = new Scene();
  private camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private material: ShaderMaterial;
  private quad: Mesh;

  constructor(size: number) {
    const target = () =>
      new WebGLRenderTarget(size, size, {
        type: HalfFloatType,
        format: RGBAFormat,
        minFilter: LinearFilter,
        magFilter: LinearFilter,
        depthBuffer: false,
      });
    this.targets = [target(), target()];
    this.material = new ShaderMaterial({
      vertexShader: trailVertex,
      fragmentShader: trailFragment,
      uniforms: {
        uPrev: { value: null },
        uTexel: { value: new Vector2(1 / size, 1 / size) },
        uPoint: { value: new Vector2() },
        uVelocity: { value: new Vector2() },
        uRadius: { value: 0.025 },
        uAmount: { value: 0 },
        uDecay: { value: 1 },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new Mesh(new PlaneGeometry(2, 2), this.material);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  get texture() {
    return this.targets[this.index].texture;
  }

  /**
   * Advances the wake by one frame. `x`, `z` is the ground point under the
   * light, `vx`, `vz` its direction of travel scaled 0..1, `amount` how much
   * energy to splat this frame, `decay` the fraction kept.
   */
  update(gl: WebGLRenderer, x: number, z: number, vx: number, vz: number, amount: number, decay: number) {
    const read = this.targets[this.index];
    const write = this.targets[1 - this.index];
    const u = this.material.uniforms;
    u.uPrev.value = read.texture;
    u.uPoint.value.set((x - TRAIL_RECT.x) / TRAIL_RECT.z, (z - TRAIL_RECT.y) / TRAIL_RECT.w);
    u.uVelocity.value.set(vx, vz);
    u.uAmount.value = amount;
    u.uDecay.value = decay;
    const previous = gl.getRenderTarget();
    gl.setRenderTarget(write);
    gl.render(this.scene, this.camera);
    gl.setRenderTarget(previous);
    this.index = 1 - this.index;
  }

  dispose() {
    this.targets.forEach((t) => t.dispose());
    this.material.dispose();
    this.quad.geometry.dispose();
  }
}

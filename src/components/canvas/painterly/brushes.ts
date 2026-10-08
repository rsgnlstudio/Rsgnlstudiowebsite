import { DataTexture, LinearFilter, LinearMipmapLinearFilter, RGBAFormat } from "three";
import { mulberry32, type Rng, valueNoise } from "./random";

/**
 * The brush library: single brushstrokes, simulated bristle by bristle at
 * startup so the project has no image dependencies. Everything in the day
 * world is built from these strokes (see strokes.ts and strokeField.ts).
 *
 * Each atlas cell holds one stroke in stroke space: x runs along the stroke
 * (0 = where the brush lands, 1 = where it lifts off), y across it. Channels:
 * - R: paint tone, the streaks left by individual bristles (0.5 = neutral)
 * - G: paint height (impasto), for light catching on ridges
 * - B: paint load, 1 where the brush was full, falling as it runs dry
 * - A: opacity. A paint film hides what's beneath in proportion to its
 *   thickness (opacity ~ 1 - exp(-k * thickness), as pigment layers do), so
 *   a stroke is opaque where the brush was loaded and turns translucent
 *   where it thins out: its tail, its edges and dry-brush streaks, where the
 *   paint only catches the raised tooth of the canvas.
 *
 * Rows are brush families, columns variants of the same brush.
 */
export const BRUSH = {
  cols: 8,
  rows: 4,
  /** Cell size in texels: long along the stroke, narrow across. */
  cellW: 256,
  cellH: 64,
} as const;

/** Brush families, one atlas row each. */
export const BRUSH_KIND = {
  /** Flat brush: square end, even width, dry streaky tail. Ground, sky, mountains. */
  flat: 0,
  /** Filbert: rounded tip, widest in the middle. Petals and leaves. */
  filbert: 1,
  /** Round: lands full and tapers to a point. Blades, stems, needles. */
  round: 2,
  /** Dab: a short loaded touch with a ridge of paint. Centres, far flowers, foliage. */
  dab: 3,
} as const;

export type BrushKind = keyof typeof BRUSH_KIND;

/** Atlas cell index of a brush: family row, variant column. */
export function brushCell(kind: BrushKind, variant: number) {
  return BRUSH_KIND[kind] * BRUSH.cols + (Math.floor(variant) % BRUSH.cols);
}

interface BrushProfile {
  /** Stroke width (fraction of the cell height) at u along the stroke. */
  width: (u: number, rng: number) => number;
  /** Pressure at u: how much paint goes down. */
  pressure: (u: number) => number;
  bristles: [min: number, max: number];
  /** How fast bristles run dry, per unit of stroke length. */
  dryRate: [min: number, max: number];
  /** Extra drying for bristles at the edge of the brush. */
  edgeDry: number;
  /** Sideways wobble of each bristle's track, in cell heights. */
  wobble: number;
  /** Paint pushed into ridges along the edges and at the end. */
  ridge: number;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const PROFILES: Record<BrushKind, BrushProfile> = {
  flat: {
    width: (u, r) => 0.66 * (0.85 + 0.15 * smooth(0, 0.08, u)) * (1 + 0.1 * u * r),
    pressure: (u) => smooth(0, 0.04, u) * (1 - 0.3 * smooth(0.7, 1, u)),
    bristles: [55, 80],
    dryRate: [0.6, 2.6],
    edgeDry: 1.6,
    wobble: 0.02,
    ridge: 0.35,
  },
  filbert: {
    width: (u) => 0.74 * Math.pow(Math.max(0, Math.sin(Math.PI * (0.1 + u * 0.88))), 0.6),
    pressure: (u) => smooth(0, 0.06, u) * (1 - 0.3 * smooth(0.75, 1, u)) * (1 - smooth(0.96, 0.99, u)),
    bristles: [50, 75],
    dryRate: [0.3, 1.2],
    edgeDry: 1.2,
    wobble: 0.016,
    ridge: 0.45,
  },
  round: {
    width: (u) => 0.55 * Math.sqrt(smooth(0, 0.12, u)) * Math.pow(1 - u, 0.7),
    pressure: (u) => smooth(0, 0.08, u) * (1 - 0.4 * u),
    bristles: [36, 54],
    dryRate: [0.3, 1.4],
    edgeDry: 2,
    wobble: 0.012,
    ridge: 0.25,
  },
  dab: {
    width: (u, r) => 0.84 * Math.pow(Math.max(0, Math.sin(Math.PI * (0.03 + u * 0.92))), 0.7) * (0.85 + 0.15 * r) * (1 + 0.12 * Math.sin(u * 9 + r * 6)),
    pressure: (u) => (0.75 + 0.5 * smooth(0.55, 0.95, u)) * smooth(0, 0.04, u) * (1 - smooth(0.93, 0.97, u)),
    bristles: [60, 90],
    dryRate: [0.1, 0.5],
    edgeDry: 0.8,
    wobble: 0.03,
    ridge: 0.9,
  },
};

const KINDS = Object.keys(BRUSH_KIND) as BrushKind[];

/** 1D smooth noise for bristle tracks and pressure flutter. */
function noise1(rng: Rng, knots = 12) {
  const v = Array.from({ length: knots + 2 }, () => rng() * 2 - 1);
  return (t: number) => {
    const x = Math.min(0.9999, Math.max(0, t)) * knots;
    const i = Math.floor(x);
    const f = x - i;
    const s = f * f * (3 - 2 * f);
    return v[i] + (v[i + 1] - v[i]) * s;
  };
}

/**
 * Paints one stroke into float buffers by dragging every bristle along the
 * stroke. Each bristle carries its own paint load and tone, runs dry at its
 * own rate (edge bristles first) and wanders slightly, which leaves the
 * streaks, broken dry-brush tail and ragged edge of a real stroke.
 */
function paintStroke(kind: BrushKind, seed: number) {
  const { cellW: W, cellH: H } = BRUSH;
  const profile = PROFILES[kind];
  const rng = mulberry32(seed);
  const height = new Float32Array(W * H);
  const tone = new Float32Array(W * H);
  const load = new Float32Array(W * H);
  const weight = new Float32Array(W * H);

  const widthJitter = rng();
  const count = Math.round(profile.bristles[0] + rng() * (profile.bristles[1] - profile.bristles[0]));
  const flutter = noise1(rng, 6);
  // The whole stroke arcs a little, like a wrist turning.
  const arc = (rng() - 0.5) * 0.08;
  const steps = W * 2;

  for (let b = 0; b < count; b++) {
    // Rest position across the brush, slightly clumped.
    const across = ((b + 0.5 + (rng() - 0.5) * 0.9) / count) * 2 - 1;
    const edge = Math.pow(Math.abs(across), 3);
    const dry = (profile.dryRate[0] + rng() * (profile.dryRate[1] - profile.dryRate[0])) * (1 + edge * profile.edgeDry);
    let ink = 0.75 + rng() * 0.45;
    const bristleTone = rng() * 2 - 1;
    const track = noise1(rng, 5 + Math.floor(rng() * 6));
    const radius = (0.9 + rng() * 1.3) * (H / 64);
    // Some bristles start late or lift early.
    const start = rng() * 0.04 + edge * rng() * 0.08;
    const stop = 1 - rng() * 0.05 - edge * rng() * 0.1;

    for (let s = 0; s < steps; s++) {
      const u = s / (steps - 1);
      if (u < start || u > stop) continue;
      const press = profile.pressure(u) * (0.9 + 0.1 * flutter(u));
      if (ink <= 0.02 || press <= 0) continue;
      const width = profile.width(u, widthJitter);
      const v = 0.5 + arc * Math.sin(Math.PI * u) + (across * width) / 2 + track(u) * profile.wobble;
      const deposit = Math.min(ink, 1) * press;
      ink -= (dry / steps) * press * (0.6 + ink);
      // A bristle skips across the canvas weave as it runs dry.
      if (ink < 0.35 && rng() > ink * 2.5) continue;

      const cx = u * (W - 1);
      const cy = v * (H - 1);
      const r = radius * (0.7 + 0.3 * press);
      const x0 = Math.max(0, Math.floor(cx - r - 1));
      const x1 = Math.min(W - 1, Math.ceil(cx + r + 1));
      const y0 = Math.max(0, Math.floor(cy - r - 1));
      const y1 = Math.min(H - 1, Math.ceil(cy + r + 1));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const d2 = ((x - cx) ** 2 + (y - cy) ** 2) / (r * r);
          if (d2 >= 1) continue;
          const k = (1 - d2) * deposit * (1 / (H / 64)) * 0.5;
          const i = y * W + x;
          height[i] += k;
          tone[i] += bristleTone * k;
          load[i] += Math.min(ink, 1) * k;
          weight[i] += k;
        }
      }
    }
  }

  // Paint pushed aside by the brush piles up along the edges and where the
  // brush lifts off.
  const ridged = new Float32Array(height);
  const reach = Math.max(2, Math.round(H * 0.06));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (height[i] <= 0) continue;
      let lo = Infinity;
      for (let dy = -reach; dy <= reach; dy += reach) {
        for (let dx = -reach; dx <= reach; dx += reach) {
          const xx = Math.min(W - 1, Math.max(0, x + dx));
          const yy = Math.min(H - 1, Math.max(0, y + dy));
          lo = Math.min(lo, height[yy * W + xx]);
        }
      }
      const rim = smooth(0.0, 0.5, height[i] - lo) * (1 - smooth(0, 0.3, lo));
      const lift = smooth(0.7, 0.95, x / W);
      ridged[i] = height[i] + rim * profile.ridge * 0.6 + lift * profile.ridge * 0.25 * height[i];
    }
  }

  return { height: ridged, tone, load, weight };
}

/** Builds the RGBA8 atlas of every brush family and variant. */
export function createBrushAtlasData(seed = 31) {
  const { cols, rows, cellW, cellH } = BRUSH;
  const width = cols * cellW;
  const heightPx = rows * cellH;
  const data = new Uint8Array(width * heightPx * 4);

  KINDS.forEach((kind, row) => {
    for (let col = 0; col < cols; col++) {
      const { height, tone, load, weight } = paintStroke(kind, seed * 1000 + row * 97 + col * 13);
      for (let y = 0; y < cellH; y++) {
        for (let x = 0; x < cellW; x++) {
          const i = y * cellW + x;
          const w = weight[i];
          const h = height[i];
          // Opacity from film thickness. Thin paint only catches the tooth
          // of the canvas (smooth noise, so magnified strokes don't speckle).
          // The film also thins as the brush lifts off toward the end.
          const lift = 1 - 0.55 * smooth(0.55, 1, x / cellW);
          const film = 1 - Math.exp(-1.15 * h * lift);
          const tooth = valueNoise(x / 2.5, (row * cellH + y) / 2.5, seed + col);
          const opacity = film * (1 - (1 - film) * (1 - tooth) * 0.9);
          // Fade to nothing at the cell border so mipmaps don't bleed.
          const border = Math.min(x, cellW - 1 - x, y, cellH - 1 - y);
          const a = opacity * smooth(0, 3, border);
          const t = w > 0 ? 0.5 + 0.5 * Math.max(-1, Math.min(1, (tone[i] / w) * 2.4)) : 0.5;
          const l = w > 0 ? load[i] / w : 0;
          // Atlas rows run top to bottom in the texture's flipY = false layout.
          const px = (row * cellH + y) * width + col * cellW + x;
          data[px * 4] = Math.round(t * 255);
          data[px * 4 + 1] = Math.round(Math.min(1, h * 0.9) * 255);
          data[px * 4 + 2] = Math.round(Math.min(1, l) * 255);
          data[px * 4 + 3] = Math.round(Math.min(1, Math.max(0, a)) * 255);
        }
      }
    }
  });

  return { data, width, height: heightPx };
}

let cached: DataTexture | null = null;

/** The brush atlas texture (created once, shared by every stroke material). */
export function getBrushAtlas() {
  if (cached) return cached;
  const { data, width, height } = createBrushAtlasData();
  const texture = new DataTexture(data, width, height, RGBAFormat);
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  cached = texture;
  return texture;
}

/**
 * GLSL for sampling a brush and turning it into paint. Needs `uniform
 * sampler2D uBrushes;`.
 *
 * brushUv maps stroke-space uv (x along, y across, 0..1) into the atlas cell.
 * paintColor colors a sample: the stroke's color, with streaks from the
 * bristles, the brush running dry into `dry` (the color underneath, or the
 * next paint on a dirty brush), and impasto ridges catching light from the
 * upper left of the canvas.
 */
export const brushGLSL = /* glsl */ `
const vec2 BRUSH_GRID = vec2(${BRUSH.cols}.0, ${BRUSH.rows}.0);
const vec2 BRUSH_TEXEL = vec2(${(1 / (BRUSH.cols * BRUSH.cellW)).toFixed(8)}, ${(1 / (BRUSH.rows * BRUSH.cellH)).toFixed(8)});

vec2 brushUv(float cell, vec2 uv) {
  float col = mod(cell, BRUSH_GRID.x);
  float row = floor(cell / BRUSH_GRID.x);
  vec2 inset = clamp(uv, 0.0, 1.0) * (1.0 - 4.0 * BRUSH_TEXEL * BRUSH_GRID) + 2.0 * BRUSH_TEXEL * BRUSH_GRID;
  return (vec2(col, row) + inset) / BRUSH_GRID;
}


vec3 paintColor(vec4 brush, vec3 color, vec3 dry, float dryness, vec2 slope) {
  float tone = (brush.r - 0.5) * 2.0;
  vec3 c = color * (1.0 + tone * 0.1);
  // Where the brush ran dry the colour underneath (or a second paint on
  // the brush) shows through the streaks.
  c = mix(c, dry, (1.0 - brush.b) * dryness);
  // Impasto: ridges lit from the upper left, troughs in shadow.
  float light = clamp(dot(slope, vec2(-0.6, 0.8)) * 2.5, -1.0, 1.0);
  return c * (1.0 + light * 0.07) + light * 0.015;
}
`;

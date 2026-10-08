import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RGBAFormat,
  type Texture,
} from "three";
import { mulberry32, type Rng } from "./random";

/**
 * Brushstroke textures, generated on a 2D canvas at startup so the project
 * has no image dependencies.
 *
 * The textures are data, not colors: materials color them from the palette.
 * To use hand-painted textures instead, load PNGs with the same channel
 * layout and atlas grid and return them from `getBrushTextures()`.
 *
 * - flowers / flowersSoft: 4x2 atlas of tall cells (head at the top, stem
 *   running to the bottom edge). R = paint value (brush streaks),
 *   G = flower centre mask, B = stem/leaf mask, A = coverage.
 *   Cells: 0 cosmos, 1 daisy, 2 buttercup sprig, 3 lupine spike,
 *   4 wild rose, 5 dab cluster (far field), 6 side-on cosmos, 7 yarrow.
 *   `flowersSoft` is the same atlas, pre-blurred, for flowers near the lens.
 * - grass: 4x1 atlas of tufts growing up from the bottom edge.
 *   R = per-blade tone (0 deep .. 1 light), A = coverage.
 * - conifer: 2x1 atlas of tree silhouettes, base at the bottom edge.
 *   R = paint value, A = coverage.
 * - leaves: 2x1 atlas of pre-blurred foreground branches growing up from
 *   the bottom edge. R = value (dark .. mid), G = light-leaf mask, A = coverage.
 */
export interface BrushTextures {
  flowers: Texture;
  flowersSoft: Texture;
  grass: Texture;
  conifer: Texture;
  leaves: Texture;
}

export const FLOWER_ATLAS = { cols: 4, rows: 2 } as const;
export const GRASS_ATLAS = { cols: 4, rows: 1 } as const;
export const CONIFER_ATLAS = { cols: 2, rows: 1 } as const;
export const LEAF_ATLAS = { cols: 2, rows: 1 } as const;

let cached: BrushTextures | null = null;

export function getBrushTextures(): BrushTextures {
  cached ??= createProceduralBrushTextures();
  return cached;
}

function createProceduralBrushTextures(): BrushTextures {
  const flowerCanvas = drawFlowerAtlas(1024, 1024, 11);
  // Drawn smaller in its cells so the blur has room before the cell edge.
  const softCanvas = drawFlowerAtlas(512, 512, 23, 0.8);
  return {
    flowers: toTexture(read(flowerCanvas)),
    flowersSoft: toTexture(blur(read(softCanvas), 4, FLOWER_ATLAS)),
    grass: toTexture(read(drawGrassAtlas(1024, 512, 5))),
    conifer: toTexture(read(drawConiferAtlas(512, 1024, 7))),
    leaves: toTexture(blur(read(drawLeafAtlas(1024, 512, 3)), 6, LEAF_ATLAS)),
  };
}

// ---------------------------------------------------------------------------
// Brush primitives

type Ctx = CanvasRenderingContext2D;

const rgb = (r: number, g: number, b: number) =>
  `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
const clamp255 = (v: number) => Math.max(0, Math.min(255, v));

interface StrokeOptions {
  x: number;
  y: number;
  length: number;
  width: number;
  angle: number;
  /** Base paint value, 0..255 (R channel). */
  value: number;
  /** G and B channel masks, 0..255. */
  g?: number;
  b?: number;
  /** Value spread of the bristle streaks. */
  contrast?: number;
  /** Tapers both ends (leaf) instead of a round head and pointed tail. */
  pointed?: boolean;
  /** Scratchy dry-brush strands past the tail. */
  dry?: boolean;
}

/**
 * One loaded brushstroke: a ragged tapered shape along +x, filled with a base
 * value and streaked with bristle lines of varying value.
 */
function stroke(ctx: Ctx, rng: Rng, o: StrokeOptions) {
  const { length: L, width: W, g = 0, b = 0, contrast = 70 } = o;
  const steps = 14;
  const profile = (t: number) => {
    if (o.pointed) return Math.pow(Math.sin(Math.PI * t), 0.8);
    return t < 0.18
      ? Math.sqrt(t / 0.18)
      : 1 - Math.pow((t - 0.18) / 0.82, 2.2) * 0.9;
  };

  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.rotate(o.angle);
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const hw = (W / 2) * profile(t) * (0.82 + rng() * 0.3);
    ctx.lineTo(t * L, -hw);
  }
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const hw = (W / 2) * profile(t) * (0.82 + rng() * 0.3);
    ctx.lineTo(t * L, hw);
  }
  ctx.closePath();
  ctx.fillStyle = rgb(clamp255(o.value), g, b);
  ctx.fill();

  ctx.save();
  ctx.clip();
  const bristles = 6 + Math.floor(W / 4);
  for (let i = 0; i < bristles; i++) {
    const off = (rng() - 0.5) * W;
    const v = clamp255(o.value + (rng() - 0.5) * contrast * 2);
    ctx.globalAlpha = 0.35 + rng() * 0.55;
    ctx.strokeStyle = rgb(v, g, b);
    ctx.lineWidth = Math.max(1, W * (0.05 + rng() * 0.12));
    ctx.beginPath();
    const x0 = rng() * L * 0.25;
    const x1 = L * (0.55 + rng() * 0.5);
    ctx.moveTo(x0, off);
    ctx.quadraticCurveTo((x0 + x1) / 2, off + (rng() - 0.5) * W * 0.3, x1, off * (0.6 + rng() * 0.3));
    ctx.stroke();
  }
  ctx.restore();

  if (o.dry) {
    for (let i = 0; i < 4; i++) {
      const off = (rng() - 0.5) * W * 0.5;
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = rgb(clamp255(o.value + (rng() - 0.5) * contrast), g, b);
      ctx.lineWidth = Math.max(1, W * 0.06);
      ctx.beginPath();
      ctx.moveTo(L * 0.7, off);
      ctx.lineTo(L * (1 + rng() * 0.18), off * 0.4);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** A round dab: a short stroke with both ends blunt. */
function dab(ctx: Ctx, rng: Rng, x: number, y: number, r: number, value: number, g = 0, b = 0) {
  stroke(ctx, rng, {
    x: x - r,
    y,
    length: r * 2,
    width: r * (1.3 + rng() * 0.5),
    angle: (rng() - 0.5) * 0.8,
    value,
    g,
    b,
    pointed: true,
    contrast: 50,
  });
}

// ---------------------------------------------------------------------------
// Flowers

function drawStem(ctx: Ctx, rng: Rng, x0: number, y0: number, x1: number, y1: number, w: number) {
  const bend = (rng() - 0.5) * 30;
  const segments = 6;
  let px = x1;
  let py = y1;
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const x = x1 + (x0 - x1) * t + Math.sin(t * Math.PI) * bend;
    const y = y1 + (y0 - y1) * t;
    const len = Math.hypot(x - px, y - py);
    stroke(ctx, rng, {
      x: px,
      y: py,
      length: len * 1.25,
      width: w * (1.1 - t * 0.4),
      angle: Math.atan2(y - py, x - px),
      value: 110 + rng() * 90,
      b: 255,
      contrast: 50,
    });
    px = x;
    py = y;
  }
  // A leaf or two off the stem.
  const leaves = 1 + Math.floor(rng() * 2);
  for (let i = 0; i < leaves; i++) {
    const t = 0.25 + rng() * 0.45;
    const side = rng() < 0.5 ? -1 : 1;
    stroke(ctx, rng, {
      x: x1 + (x0 - x1) * t,
      y: y1 + (y0 - y1) * t,
      length: 40 + rng() * 50,
      width: 10 + rng() * 8,
      angle: -Math.PI / 2 + side * (0.5 + rng() * 0.5),
      value: 80 + rng() * 120,
      b: 255,
      pointed: true,
    });
  }
}

function drawCentre(ctx: Ctx, rng: Rng, cx: number, cy: number, r: number, squash: number) {
  for (let i = 0; i < 7; i++) {
    const a = rng() * Math.PI * 2;
    const d = rng() * r * 0.5;
    dab(ctx, rng, cx + Math.cos(a) * d, cy + Math.sin(a) * d * squash, r * (0.45 + rng() * 0.3), 150 + rng() * 105, 255);
  }
  dab(ctx, rng, cx - r * 0.2, cy + r * 0.25 * squash, r * 0.3, 70, 255);
}

interface RadialOptions {
  petals: number;
  radius: number;
  petalWidth: number;
  squash: number;
  centre: number;
  /** Restricts petals to an arc (for side-on flowers). */
  arc?: [number, number];
}

function drawRadialFlower(ctx: Ctx, rng: Rng, cx: number, cy: number, o: RadialOptions) {
  const [a0, a1] = o.arc ?? [0, Math.PI * 2];
  const full = !o.arc;
  for (let i = 0; i < o.petals; i++) {
    const t = full ? i / o.petals : i / Math.max(1, o.petals - 1);
    const a = a0 + (a1 - a0) * t + (rng() - 0.5) * 0.25;
    const len = o.radius * (0.8 + rng() * 0.25);
    const dx = Math.cos(a);
    const dy = Math.sin(a) * o.squash;
    const angle = Math.atan2(dy, dx);
    const foreshortened = len * Math.hypot(dx, dy);
    // Two overlapping strokes per petal, the inner one darker.
    stroke(ctx, rng, {
      x: cx + dx * o.radius * 0.08,
      y: cy + dy * o.radius * 0.08,
      length: foreshortened,
      width: o.petalWidth * (0.85 + rng() * 0.3),
      angle,
      value: 185 + rng() * 60,
      contrast: 55,
      dry: rng() < 0.5,
    });
    stroke(ctx, rng, {
      x: cx + dx * o.radius * 0.05,
      y: cy + dy * o.radius * 0.05,
      length: foreshortened * 0.5,
      width: o.petalWidth * 0.55,
      angle: angle + (rng() - 0.5) * 0.3,
      value: 120 + rng() * 50,
      contrast: 40,
    });
  }
  if (o.centre > 0) drawCentre(ctx, rng, cx, cy, o.centre, o.squash);
}

function drawFlowerAtlas(width: number, height: number, seed: number, inset = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const rng = mulberry32(seed);
  const cw = width / FLOWER_ATLAS.cols;
  const ch = height / FLOWER_ATLAS.rows;

  for (let cell = 0; cell < 8; cell++) {
    const ox = (cell % FLOWER_ATLAS.cols) * cw;
    const oy = Math.floor(cell / FLOWER_ATLAS.cols) * ch;
    ctx.save();
    ctx.translate(ox, oy);
    // Draw in a 256x512 design space, scaled to the cell.
    ctx.scale(cw / 256, ch / 512);
    ctx.beginPath();
    ctx.rect(4, 4, 248, 504);
    ctx.clip();
    // Shrink toward the stem base so the stem still meets the bottom edge.
    ctx.translate(128, 512);
    ctx.scale(inset, inset);
    ctx.translate(-128, -512);
    const cx = 128;
    const cy = 150;

    switch (cell) {
      case 0: // cosmos
        drawStem(ctx, rng, cx, cy + 20, cx + 6, 512, 11);
        drawRadialFlower(ctx, rng, cx, cy, { petals: 8, radius: 108, petalWidth: 62, squash: 0.82, centre: 26 });
        break;
      case 1: // daisy
        drawStem(ctx, rng, cx, cy + 20, cx - 8, 512, 9);
        drawRadialFlower(ctx, rng, cx, cy, { petals: 17, radius: 100, petalWidth: 24, squash: 0.75, centre: 30 });
        break;
      case 2: {
        // buttercup sprig: three small heads on branching stems
        const heads: [number, number][] = [
          [90, 150],
          [170, 210],
          [120, 290],
        ];
        for (const [x, y] of heads) drawStem(ctx, rng, x, y + 10, 128, 512, 7);
        for (const [x, y] of heads) {
          drawRadialFlower(ctx, rng, x, y, { petals: 5, radius: 46, petalWidth: 40, squash: 0.85, centre: 12 });
        }
        break;
      }
      case 3: // lupine spike
        drawStem(ctx, rng, cx, 340, cx, 512, 12);
        for (let y = 60; y < 360; y += 11) {
          const t = (y - 60) / 300;
          const w = 22 + t * 44;
          for (const side of [-1, 1]) {
            stroke(ctx, rng, {
              x: cx + side * 4,
              y: y + rng() * 6,
              length: w * (0.7 + rng() * 0.5),
              width: 20 + t * 10,
              angle: side < 0 ? Math.PI + 0.35 + rng() * 0.4 : -0.35 - rng() * 0.4,
              value: 120 + rng() * 130,
              contrast: 60,
            });
          }
        }
        break;
      case 4: // wild rose: broad cupped petals
        drawStem(ctx, rng, cx, cy + 20, cx + 10, 512, 11);
        drawRadialFlower(ctx, rng, cx, cy, { petals: 5, radius: 104, petalWidth: 96, squash: 0.68, centre: 22 });
        break;
      case 5: // loose dab cluster for the far field
        drawStem(ctx, rng, cx, 260, cx, 512, 10);
        for (let i = 0; i < 9; i++) {
          dab(ctx, rng, cx + (rng() - 0.5) * 150, 150 + (rng() - 0.5) * 140, 26 + rng() * 22, 160 + rng() * 95);
        }
        break;
      case 6: // side-on cosmos, petals fanned upward
        drawStem(ctx, rng, cx, cy + 40, cx - 6, 512, 11);
        drawRadialFlower(ctx, rng, cx, cy + 40, {
          petals: 7,
          radius: 110,
          petalWidth: 54,
          squash: 0.9,
          centre: 0,
          arc: [-Math.PI * 0.92, -Math.PI * 0.08],
        });
        drawCentre(ctx, rng, cx, cy + 40, 22, 0.5);
        break;
      case 7: // yarrow: a dome of tiny dabs
        drawStem(ctx, rng, cx, 210, cx + 4, 512, 9);
        for (let i = 0; i < 46; i++) {
          const a = rng() * Math.PI;
          const d = Math.sqrt(rng()) * 90;
          dab(ctx, rng, cx + Math.cos(a) * d, 200 - Math.sin(a) * d * 0.6, 9 + rng() * 9, 170 + rng() * 85, rng() < 0.15 ? 255 : 0);
        }
        break;
    }
    ctx.restore();
  }
  return canvas;
}

// ---------------------------------------------------------------------------
// Grass

function drawGrassAtlas(width: number, height: number, seed: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const rng = mulberry32(seed);
  const cw = width / GRASS_ATLAS.cols;

  for (let cell = 0; cell < GRASS_ATLAS.cols; cell++) {
    ctx.save();
    ctx.translate(cell * cw, 0);
    ctx.scale(cw / 256, height / 512);
    ctx.beginPath();
    ctx.rect(2, 2, 252, 510);
    ctx.clip();
    const broad = cell === 3;
    const blades = broad ? 7 : 9 + cell * 3;
    for (let i = 0; i < blades; i++) {
      const x = 128 + (rng() - 0.5) * 120;
      const lean = (rng() - 0.5) * (broad ? 1.1 : 0.7);
      stroke(ctx, rng, {
        x,
        y: 520,
        length: (broad ? 200 : 260) + rng() * 230,
        width: broad ? 34 + rng() * 22 : 9 + rng() * 14,
        angle: -Math.PI / 2 + lean,
        value: 30 + rng() * 225,
        contrast: 40,
        pointed: broad,
        dry: !broad && rng() < 0.4,
      });
    }
    ctx.restore();
  }
  return canvas;
}

// ---------------------------------------------------------------------------
// Conifers

function drawConiferAtlas(width: number, height: number, seed: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const rng = mulberry32(seed);
  const cw = width / CONIFER_ATLAS.cols;

  for (let cell = 0; cell < CONIFER_ATLAS.cols; cell++) {
    ctx.save();
    ctx.translate(cell * cw, 0);
    ctx.scale(cw / 256, height / 1024);
    const cx = 128;
    const top = 30;
    const maxW = cell === 0 ? 118 : 96;
    // Trunk
    stroke(ctx, rng, { x: cx, y: 1030, length: 1000, width: 10, angle: -Math.PI / 2, value: 30, contrast: 20 });
    for (let y = top; y < 1010; y += 9 + rng() * 9) {
      const t = (y - top) / (1010 - top);
      // Tiered silhouette: whorls bulge out in steps.
      const tier = 0.75 + 0.25 * Math.abs(Math.sin(t * 18 + cell));
      const w = maxW * Math.pow(t, 0.85) * tier + 6;
      const strokesPerRow = 2 + Math.floor(t * 3);
      for (let i = 0; i < strokesPerRow; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const droop = 0.15 + rng() * 0.35;
        const light = side < 0 && rng() < 0.18;
        stroke(ctx, rng, {
          x: cx + side * 3,
          y: y + rng() * 6,
          length: w * (0.55 + rng() * 0.5),
          width: 8 + t * 18 + rng() * 8,
          angle: side < 0 ? Math.PI - droop : droop,
          value: light ? 120 + rng() * 100 : 10 + rng() * 60,
          contrast: 35,
          dry: rng() < 0.5,
        });
      }
    }
    ctx.restore();
  }
  return canvas;
}

// ---------------------------------------------------------------------------
// Foreground leaves

function drawBranch(
  ctx: Ctx,
  rng: Rng,
  x0: number,
  y0: number,
  angle: number,
  length: number,
  width: number,
  depth: number,
) {
  const segments = 7;
  let x = x0;
  let y = y0;
  let a = angle;
  const seg = length / segments;
  for (let i = 0; i < segments; i++) {
    a += (rng() - 0.5) * 0.35;
    const w = width * (1 - (i / segments) * 0.6);
    stroke(ctx, rng, { x, y, length: seg * 1.2, width: w, angle: a, value: 25 + rng() * 30, contrast: 20 });
    const nx = x + Math.cos(a) * seg;
    const ny = y + Math.sin(a) * seg;
    // Leaves along this segment.
    const leaves = 2 + Math.floor(rng() * 3) + (i > 2 ? 2 : 0);
    for (let j = 0; j < leaves; j++) {
      const t = rng();
      const lx = x + (nx - x) * t;
      const ly = y + (ny - y) * t;
      const side = rng() < 0.5 ? -1 : 1;
      const la = a + side * (0.5 + rng() * 0.9);
      const light = rng() < 0.1;
      stroke(ctx, rng, {
        x: lx,
        y: ly,
        length: 70 + rng() * 80,
        width: 30 + rng() * 26,
        angle: la,
        value: light ? 200 : 20 + rng() * 150,
        g: light ? 255 : 0,
        pointed: true,
        contrast: 50,
      });
    }
    if (depth > 0 && i > 0 && i < segments - 1 && rng() < 0.45) {
      const side = rng() < 0.5 ? -1 : 1;
      drawBranch(ctx, rng, x, y, a + side * (0.5 + rng() * 0.5), length * 0.45, width * 0.5, depth - 1);
    }
    x = nx;
    y = ny;
  }
  // Terminal leaf cluster.
  for (let j = 0; j < 5; j++) {
    stroke(ctx, rng, {
      x,
      y,
      length: 60 + rng() * 70,
      width: 28 + rng() * 22,
      angle: a + (rng() - 0.5) * 2.2,
      value: 30 + rng() * 150,
      g: rng() < 0.1 ? 255 : 0,
      pointed: true,
    });
  }
}

function drawLeafAtlas(width: number, height: number, seed: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const rng = mulberry32(seed);
  const cw = width / LEAF_ATLAS.cols;

  for (let cell = 0; cell < LEAF_ATLAS.cols; cell++) {
    ctx.save();
    ctx.translate(cell * cw, 0);
    ctx.scale(cw / 512, height / 512);
    ctx.beginPath();
    ctx.rect(24, 24, 464, 488);
    ctx.clip();
    // Keep the leaves well inside the cell so the blur never meets its edge.
    ctx.translate(256, 512);
    ctx.scale(0.78, 0.78);
    ctx.translate(-256, -512);
    if (cell === 0) {
      // A long branch reaching up and across.
      drawBranch(ctx, rng, 240, 520, -Math.PI / 2 + 0.15, 470, 16, 2);
    } else {
      // A dense leafy mass.
      drawBranch(ctx, rng, 200, 520, -Math.PI / 2 - 0.2, 380, 14, 2);
      drawBranch(ctx, rng, 300, 520, -Math.PI / 2 + 0.35, 340, 12, 2);
    }
    ctx.restore();
  }
  return canvas;
}

// ---------------------------------------------------------------------------
// Pixel helpers

function read(canvas: HTMLCanvasElement) {
  return canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Gaussian-ish blur (three box passes) on premultiplied alpha, run per atlas
 * cell so neighbouring cells don't bleed into each other.
 */
function blur(img: ImageData, radius: number, atlas: { cols: number; rows: number }) {
  const { width, height, data } = img;
  const px = new Float32Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const a = data[i * 4 + 3] / 255;
    px[i * 4] = data[i * 4] * a;
    px[i * 4 + 1] = data[i * 4 + 1] * a;
    px[i * 4 + 2] = data[i * 4 + 2] * a;
    px[i * 4 + 3] = a * 255;
  }
  const cw = width / atlas.cols;
  const ch = height / atlas.rows;
  const tmp = new Float32Array(Math.max(cw, ch) * 4);

  const pass = (x0: number, y0: number, len: number, step: number, count: number, stride: number) => {
    for (let line = 0; line < count; line++) {
      const base = ((y0 * width + x0) + line * stride) * 4;
      for (let c = 0; c < 4; c++) {
        let sum = 0;
        for (let k = -radius; k <= radius; k++) {
          sum += px[base + Math.min(len - 1, Math.max(0, k)) * step * 4 + c];
        }
        for (let i = 0; i < len; i++) {
          tmp[i * 4 + c] = sum / (radius * 2 + 1);
          const add = Math.min(len - 1, i + radius + 1);
          const sub = Math.max(0, i - radius);
          sum += px[base + add * step * 4 + c] - px[base + sub * step * 4 + c];
        }
        for (let i = 0; i < len; i++) px[base + i * step * 4 + c] = tmp[i * 4 + c];
      }
    }
  };

  for (let row = 0; row < atlas.rows; row++) {
    for (let col = 0; col < atlas.cols; col++) {
      const x0 = col * cw;
      const y0 = row * ch;
      for (let p = 0; p < 3; p++) {
        pass(x0, y0, cw, 1, ch, width); // horizontal, one line per row
        pass(x0, y0, ch, width, cw, 1); // vertical, one line per column
      }
    }
  }

  for (let i = 0; i < width * height; i++) {
    const a = px[i * 4 + 3] / 255;
    const inv = a > 0.001 ? 1 / a : 0;
    data[i * 4] = clamp255(px[i * 4] * inv);
    data[i * 4 + 1] = clamp255(px[i * 4 + 1] * inv);
    data[i * 4 + 2] = clamp255(px[i * 4 + 2] * inv);
    data[i * 4 + 3] = clamp255(a * 255);
  }
  return img;
}

/** Uploads canvas pixels as a mipmapped data texture (rows flipped for GL). */
function toTexture(img: ImageData) {
  const { width, height, data } = img;
  const flipped = new Uint8Array(data.length);
  const row = width * 4;
  for (let y = 0; y < height; y++) {
    flipped.set(data.subarray(y * row, (y + 1) * row), (height - 1 - y) * row);
  }
  const texture = new DataTexture(flipped, width, height, RGBAFormat);
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

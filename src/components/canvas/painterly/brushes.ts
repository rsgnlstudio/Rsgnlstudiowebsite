import { DataTexture, LinearFilter, LinearMipmapLinearFilter, RGBAFormat } from "three";
import { BRUSH } from "./brushAtlas";
import { loadBrushAtlas } from "./loadBrushAtlas";

export { BRUSH, BRUSH_KIND, type BrushKind, brushCell } from "./brushAtlas";

let cached: DataTexture | null = null;

/**
 * The brush atlas texture (created once, shared by every stroke material).
 * It starts out blank and is filled in once the worker has simulated it;
 * the canvas waits for that (brushAtlasReady) before its first frame.
 */
export function getBrushAtlas() {
  if (cached) return cached;
  const { cols, rows, cellW, cellH } = BRUSH;
  const width = cols * cellW;
  const height = rows * cellH;
  const texture = new DataTexture(new Uint8Array(width * height * 4), width, height, RGBAFormat);
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  cached = texture;
  return texture;
}

/** Resolves once the brush atlas texture holds the simulated brushes. */
export function brushAtlasReady() {
  return loadBrushAtlas().then(({ data }) => {
    const texture = getBrushAtlas();
    if (texture.image.data !== data) {
      texture.image.data = data;
      texture.needsUpdate = true;
    }
  });
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

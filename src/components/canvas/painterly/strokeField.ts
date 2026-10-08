import { BRUSH } from "./brushes";

/**
 * Brushstrokes for big surfaces (sky, ground, mountains), placed in the
 * fragment shader instead of as instances: the surface's 2D coordinates are
 * divided into cells, every cell holds one stroke (a brush from the atlas,
 * turned along a flow direction and arcing a little) and the two topmost
 * strokes covering a fragment are painted over each other, thin paint
 * glazing over what's beneath. Each stroke takes ONE color, sampled at its centre, so a gradient
 * becomes a mosaic of flat strokes, as a painter would block it in.
 *
 * Strokes are anchored to the surface coordinates, so they don't swim when
 * the camera moves.
 *
 * Needs noiseGLSL and brushGLSL first, plus `uniform sampler2D uBrushes;`,
 * and these functions defined by the including shader (`layer` tells the
 * layers of one surface apart):
 *   vec3 fieldPaint(vec2 c, float layer)    color of a stroke centred at c
 *   float fieldPresent(vec2 c, float layer) 1 if a stroke centred at c exists
 *   vec2 fieldFlow(vec2 p, float layer)     stroke direction around p (it is
 *                                           evaluated once per fragment, so
 *                                           it should vary slowly)
 */
export const strokeFieldGLSL = /* glsl */ `
struct FieldStroke {
  float found;
  float order;
  vec2 centre;
  vec2 q;
  vec2 qx;
  vec2 qy;
  float cell;
  vec4 brush;
};

vec2 rotate2(vec2 v, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec2(c * v.x - s * v.y, s * v.x + c * v.y);
}

// The two strokes on top at p (top first). size: cell size; shape: stroke
// length and width in cells; keep: share of cells holding a stroke; row:
// brush family.
void fieldStrokes(vec2 p, vec2 dpdx, vec2 dpdy, float size, vec2 shape, float keep, float row, float layer,
    out FieldStroke top, out FieldStroke below) {
  top.found = 0.0;
  top.order = -1.0;
  below.found = 0.0;
  below.order = -1.0;
  vec2 base = floor(p / size);
  vec2 flow = fieldFlow(p, layer);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 id = base + vec2(float(i), float(j));
      vec2 seed = id + layer * 17.31;
      float order = hash12(seed * 1.37 + 0.5);
      if (order <= below.order || hash12(seed + 11.3) > keep) continue;
      vec2 centre = (id + 0.5 + (vec2(hash12(seed + 3.1), hash12(seed + 7.7)) - 0.5) * 0.9) * size;
      vec2 dir = normalize(rotate2(flow, (hash12(seed + 5.9) - 0.5) * 0.7) + 1e-5);
      vec2 perp = vec2(-dir.y, dir.x);
      float len = shape.x * size * (0.7 + 0.6 * hash12(seed + 2.3));
      float wid = shape.y * size * (0.75 + 0.5 * hash12(seed + 8.1));
      vec2 d = p - centre;
      vec2 q = vec2(dot(d, dir) / len + 0.5, dot(d, perp) / wid + 0.5);
      // A hand never pulls a straight line: the stroke arcs a little.
      q.y += (hash12(seed + 6.6) - 0.5) * 0.9 * (4.0 * q.x * (1.0 - q.x) - 0.5);
      if (q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0) continue;
      if (fieldPresent(centre, layer) < 0.5) continue;
      float cell = row * BRUSH_GRID.x + floor(hash12(seed + 4.4) * BRUSH_GRID.x);
      // Explicit gradients: derivatives inside the loop would be undefined.
      vec2 qx = vec2(dot(dpdx, dir) / len, dot(dpdx, perp) / wid);
      vec2 qy = vec2(dot(dpdy, dir) / len, dot(dpdy, perp) / wid);
      vec4 b = textureGrad(uBrushes, brushUv(cell, q), qx / BRUSH_GRID, qy / BRUSH_GRID);
      if (b.a < 0.02) continue;
      FieldStroke hit = FieldStroke(1.0, order, centre, q, qx, qy, cell, b);
      if (order > top.order) {
        below = top;
        top = hit;
      } else {
        below = hit;
      }
    }
  }
}

// Paints a found stroke over \`under\` (which also shows where it runs dry).
// The paint's opacity comes from its thickness, so thin edges and tails
// glaze over the paint below. relief scales how much the ridges catch light.
vec3 fieldShade(FieldStroke s, vec3 under, float layer, float dryness, float relief) {
  // Paint is never mixed exactly the same twice: each stroke drifts a
  // little in value and warmth, which makes the strokes read.
  float jitter = hash12(s.centre * 3.7 + layer) - 0.5;
  vec3 color = fieldPaint(s.centre, layer) * (1.0 + jitter * 0.1);
  color.rb *= 1.0 + vec2(1.0, -1.0) * (hash12(s.centre * 5.3 + layer) - 0.5) * 0.06;
  vec2 du = vec2(${(1.5 / BRUSH.cellW).toFixed(6)}, 0.0);
  vec2 dv = vec2(0.0, ${(1.5 / BRUSH.cellH).toFixed(6)});
  vec2 gx = s.qx / BRUSH_GRID;
  vec2 gy = s.qy / BRUSH_GRID;
  vec2 grad = 2.0 * vec2(
    textureGrad(uBrushes, brushUv(s.cell, s.q + du), gx, gy).g - s.brush.g,
    textureGrad(uBrushes, brushUv(s.cell, s.q + dv), gx, gy).g - s.brush.g
  );
  vec2 slope = vec2(dot(grad, normalize(s.qx + 1e-6)), dot(grad, normalize(s.qy + 1e-6)));
  vec3 painted = paintColor(s.brush, color, under, dryness, slope * relief);
  return mix(under, painted, clamp(s.brush.a * 1.15, 0.0, 1.0));
}

// One layer of strokes painted over \`under\`: the lower of the two top
// strokes first, then the top one. a = how much paint covers p.
vec4 fieldLayer(vec2 p, vec2 dpdx, vec2 dpdy, float size, vec2 shape, float keep, float row, float layer,
    vec3 under, float dryness, float relief) {
  FieldStroke top;
  FieldStroke below;
  fieldStrokes(p, dpdx, dpdy, size, shape, keep, row, layer, top, below);
  vec3 col = under;
  float cover = 0.0;
  if (below.found > 0.5) {
    col = fieldShade(below, col, layer, dryness, relief);
    cover = below.brush.a;
  }
  if (top.found > 0.5) {
    col = fieldShade(top, col, layer, dryness, relief);
    cover = 1.0 - (1.0 - cover) * (1.0 - top.brush.a);
  }
  return vec4(col, cover);
}
`;

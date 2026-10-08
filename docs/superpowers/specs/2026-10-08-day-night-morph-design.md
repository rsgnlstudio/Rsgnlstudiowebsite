# Day/Night morph: re-shade instead of mask

## Goal

The Day/Night switch currently reveals the dust world through a spatial mask:
`dissolveField(p)` sweeps a noisy front from the horizon toward the camera,
painted fragments are discarded behind it, an HDR ember line burns along it,
and dust specks exist only where it has passed. Every pixel is either paint or
dust, so the switch reads as one world being cut away to show the other.

Replace it with a global transformation of the shading: every pixel changes at
the same time and rate. The painted world is re-lit with the night's light
model (moon base plus the cursor light) and sinks into the void, while the
dust condenses everywhere at once under that same light.

## Constraints

- Both end states stay exactly as they are: at `night = 0` the painted day is
  pixel-identical to now, at `night = 1` the dust night is identical to now.
- Sunset, camera flight to the top view, and the 4 s timing are unchanged.
- `night` remains the single driver; only `updateLight` derives the morph.
- No spatial mask, no front, no `discard` driven by the transition.

## Design

### 1. One global value: `uMorph`

- Delete `painterly/dissolve.ts` (`dissolveGLSL`, `paintDissolveGLSL`) and
  `uDissolve` / `DISSOLVE_DONE`.
- Add `sharedUniforms.uMorph` (0 = painted day, 1 = dust night). `updateLight`
  writes it linearly over `MORPH_RANGE` in `src/config/scene.ts` (replaces
  `DISSOLVE_RANGE`; starting value `[0.12, 0.86]`, tuned during
  implementation).
- Consumers switch from `uDissolve` to `uMorph`, keeping their curves, with
  the old -0.1..1.1 range mapped onto 0..1:
  - `Sky`: fade to `uVoid`.
  - `Effects`: DoF bokeh handover to the dust, vignette, fringe, canvas
    texture, wet blend.
  - `VolumetricMist`: density fades globally with `uMorph` (no per-bank
    front).
  - `CursorLight`: starts when `uMorph > 0`, strength follows it.
  - `PaintedWorld` renders while `uMorph < 1`; `DustWorld` while `uMorph > 0`.

### 2. Night light on the paint

- New shared chunk `painterly/nightLight.ts` (`nightLightGLSL`), extracted from
  `Dust`'s vertex shader: the moonlit base (`uDust * (0.06 + 0.45 * moon) *
  breathe`) and the cursor light falloff (`uLightPos`, `uLightStrength`,
  `uLightIntensity`, `uLightRadius`, `uCursorLight`, `uDustLit`). `Dust` uses
  it and keeps its exact output.
- Every painted material (`strokes.ts` core and fringe, `Terrain`,
  `Mountains`) computes its finished day color as now, then:
  - `night = paint luminance/hue darkened to the moonlit base + cursor light
    falloff on it` (HDR near the light, so it blooms),
  - `col = mix(col, night, smoothstep(0.0, 0.5, uMorph))`,
  - `col = mix(col, uVoid, smoothstep(0.45, 1.0, uMorph))`.
- At `uMorph = 1` the paint equals `uVoid`, the background the dust night sits
  on, so hiding `PaintedWorld` there is invisible.
- Brush, stroke layout, wind and wet canvas code are untouched; at
  `uMorph = 0` the new terms are exactly zero.

### 3. Dust condenses everywhere

- Dust brightness fades in globally: `appear = smoothstep(0.25, 0.85, uMorph)`
  (motes keep a later fade-in), overlapping the paint as it darkens, under the
  same light model.
- Remove the per-speck `release` lift and ember glow (they only made sense
  with a moving front).
- While the paint is drawn it writes depth, and the specks sit on its surface.
  Pull specks slightly toward the camera in view space, scaled by
  `1 - smoothstep(0.9, 1.0, uMorph)`, so the paint doesn't hide them. At
  `uMorph = 1` the offset is zero.

### Cleanup

- Remove the `dustEdge` palette key (used only by the ember edge and the
  release glow) from `palette.ts`, the material key lists and leva.
- Update the CLAUDE.md day/night rule and the README ("Two worlds, one
  dissolve", the intro paragraph, the status list).

## Verification

- `npm run lint`, `npm run typecheck`, `npm run build`.
- With the leva override, screenshot `night` at 0, 0.3, 0.55, 0.7, 0.85 and 1.
- Screenshot `night = 0` and `1` on `main` and compare: they must match.

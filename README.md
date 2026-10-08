# RSGNL Studio Website

The RSGNL Studio website. A 3D nature landscape sits behind the page as a single fixed WebGL canvas, while normal HTML sections scroll on top of it. A Day/Night switch at the top centre turns between two worlds that share one layout: by day a painted, brushstroke meadow; by night the same meadow as fine glowing dust, lit by a light that follows the cursor. During the switch the sun sets, the camera flies up to a top view, and the painting crumbles into dust along burning edges (and settles back on the way home). The whole scene is driven by one `night` value (0 = day, 1 = night). All text stays in the DOM for SEO and accessibility.

## Stack

| Library | Why |
| --- | --- |
| Next.js 16 (App Router, Turbopack) | Routing, server rendering of the DOM content, and a root layout that keeps the canvas mounted across routes |
| React 19 + TypeScript | UI and type safety |
| Tailwind CSS 4 | Utility styling, with design tokens in a CSS-first `@theme` |
| three | WebGL rendering |
| @react-three/fiber | Declarative React renderer for three |
| @react-three/drei | Ready-made R3F helpers (sky, stars, loaders, etc.) |
| @react-three/postprocessing / postprocessing | Post-processing stack (EffectComposer) |
| gsap + ScrollTrigger | Section scroll triggers and future tweens |
| lenis | Smooth scrolling, driven by GSAP's ticker |
| zustand | Small store that bridges DOM and canvas without re-renders |
| leva (dev) | Debug panel, e.g. to scrub `night` by hand |

## Getting started

Prerequisites: Node 22 (see `.nvmrc`) and npm.

```bash
nvm use            # Node 22
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run start      # serve the production build
npm run lint       # ESLint
npm run typecheck  # generate route types, then tsc --noEmit
```

## Architecture

- **The canvas lives in the root layout and the DOM sits on top.** `src/app/layout.tsx` renders `SceneCanvasLoader`, a small client wrapper that loads `SceneCanvas` with `next/dynamic` and `ssr: false`. The canvas is `position: fixed`, full-viewport, behind `<main>`, and has `pointer-events: none`. Because it lives in the layout, it stays mounted when routes change.
- **The zustand store is the only bridge.** `src/store/scene.ts` holds `activeSection`, `sectionProgress`, `scrollProgress`, `timeOfDay`, `night`, `nightOverride`, and `sceneMode`. The DOM writes to it and the canvas reads from it. Per-frame code reads it with `useSceneStore.getState()` inside `useFrame` and never subscribes, so scrolling causes no React re-renders.
- **The section config is the single source of truth.** `src/config/sections.ts` gives each section an `id` and a camera keyframe (`position`, `lookAt`, optional `up`, `fov`). The page renders its `<section>`s from this config, the scroll hook registers one trigger per entry, and the scene reads the same entries through `sectionsByMode` in `src/config/scene.ts`.
- **Scroll drives the store.** A page calls `useSectionScroll(sections)`. This hook creates Lenis (synced with GSAP's ticker and ScrollTrigger), registers one ScrollTrigger per section plus one for the whole page, and writes `activeSection`, `sectionProgress`, and `scrollProgress`. When the page unmounts, or Next hides it with `<Activity>`, the hook kills every trigger and destroys Lenis.
- **The Day/Night switch drives `night` and the camera.** `DayNightSwitch` (top centre, pill shaped) only writes `timeOfDay` to the store. `CameraRig` moves `night` toward it over `DAY_NIGHT_DURATION` (4 s, eased; clicking mid-way turns it around) and blends the camera with the same value, position and rotation together: from the mode's first keyframe in the meadow (day) to `nightCamera` in `src/config/scene.ts`, high above the meadow and looking straight down (night). It also fits the FOV to the aspect ratio and adds idle drift and mouse parallax (off with reduced motion). While `nightOverride` is set, the camera follows the override. Still to come: interpolating the camera between section keyframes using `sectionProgress`.
- **Two worlds, one dissolve.** `PaintedWorld` (terrain, mountains, vegetation) is the day; `DustWorld` (`Dust`, `Fireflies`, `CursorLight`) is the night. `updateLight` turns `night` into `uDissolve`, and both worlds read the same `dissolveField` (`painterly/dissolve.ts`): painted fragments are discarded where the field is below `uDissolve`, with an HDR ember line at the front, and dust exists exactly there, lifting off and glowing as it breaks free. The field takes the horizon first. `DISSOLVE_RANGE` in `src/config/scene.ts` sets when it runs. Each world stops rendering once it is fully gone, and the sky fades to the `void` color.
- **The dust world.** `Dust` is one `points` draw call (about 370k specks on high, 155k on low): the ground with a rippled micro relief, the conifers from the shared `scatterConifers` layout (squatter, so they read as crowns from above), flower clusters in drifts of color and a few motes floating near the camera. Unlit, it is a faint moonlit haze. `CursorLight` hovers above the ground under the cursor (it wanders by itself on touch screens or when the mouse leaves), lights the dust around it in HDR so it blooms, and sets the focus: specks away from it open into dim bokeh discs. Its wake is recorded in a small ping-pong texture (`DustTrail` in `painterly/dust.ts`) that decays and spreads; dust in the wake is swept along, swirls and glows, then settles.
- **The top view.** As the camera rises (`viewUniforms.uTopView`), the plants tip over from facing the camera upright to facing it from above, the mist thins out, and the ground swaps its sideways day strokes for even ones early in the flight (they are laid out for the low camera and would stretch into big smears from higher up), while it all dissolves into dust. Part of the grass and flowers are scattered over the area seen from above (`OVERHEAD` in `painterly/landscape.ts`), and the terrain reaches past the day camera so its edge never shows.
- **The scene is painted, not lit.** Every material is an unlit `ShaderMaterial`. Colors come from `src/config/palette.ts` in three sets: warm day, sunset (dusk) and cold night. `src/components/canvas/painterly/palette.ts` turns them into shared uniforms (`uSkyTop`, `uFlowerPink`, …). `Lights` calls `updateLight(night)` once per frame. That mixes day to dusk over `night` 0–0.5 and dusk to night over 0.5–1, sinks the sun behind the mountains, raises the moon, and turns up the night glow (glowing flowers, fireflies, stars, bloom).
- **The day is built from brushstrokes.** There is no brush filter over the frame: every surface is made of strokes. `painterly/brushes.ts` simulates single strokes bristle by bristle at startup (flat, filbert, round and dab brushes, eight variants each): streaks, paint running dry, impasto ridges, and opacity from the thickness of the paint film, so tails, edges and dry-brush streaks are translucent. Plants are sets of strokes (`painterly/plants.ts` paints a flower as stem, leaves, petals and a centre, a fir as a dark mass, branch jabs and a few lit tips), collected in a `StrokeBuffer` and drawn as instanced ribbons (`painterly/strokes.ts`), one layer per kind. Each stroke follows a smooth cubic Bézier curve (its bend arcs it, its wave turns it into an S), with the ribbon's width always across the curve. `StrokeLayer` draws each layer twice: the solid paint (opaque, writing depth), then the thin paint blended over what's behind. Plants are sorted back to front from the day camera, curve and wave a little, and melt into the ground at the root. Big surfaces (sky, ground, mountains) place strokes in the fragment shader (`painterly/strokeField.ts`): a grid of strokes along a flow direction, each painted in the one color found at its centre, so gradients turn into blocks of paint; the two topmost strokes glaze over each other. Every stroke is anchored to the world and moves only with the wind.
- **Cursor wind (day).** The cursor is the origin of a strong wind. `CursorWind` writes `gustUniforms` (`painterly/gust.ts`): the cursor's screen position and a strength that rises hard while the cursor moves and eases off after. Plants and pollen measure the wind on screen (`cursorGust`), so whatever is drawn around the cursor bends away from it, in gusts that run outward in rings. It is off on touch screens and with reduced motion, and dies down as the camera leaves for the top view. `cursorWind` in the look sets its strength.
- **Wet in wet.** So the day reads as one painting rather than objects side by side, strokes mix into the paint around them. `WetCanvasPass` (first in the effect chain) keeps a blurred copy of each frame; on the next frame every stroke and the ground pick up its color at their position (`wetMix`), most where their own paint is thin or runs dry. They take on the neighbouring hue but mostly keep their own lightness, so edges between colors melt without the picture going muddy. `wetBlend` in the look sets the strength; it fades out as the day dissolves.
- **Post-processing.** After the wet canvas capture (see above), `VolumetricMist` raymarches soft banks of mist against the scene depth (so they wrap around plants instead of clipping), lit by the low sun and thinning out as the day dissolves. Then depth of field focuses on the near meadow, a little below the centre of the frame (a ray march against `terrainHeight` every frame), so the field melts into soft paint behind and the flowers by the lens blur too. The sky only blurs a little, so the sun stays a whole disc. It hands over to the dust's own bokeh as the painting dissolves. Then bloom on the HDR highlights (the sun, backlit petal edges, pollen), then the finish in its own pass (`PainterlyEffect`: chromatic fringe toward the edges, canvas texture by day, grain, a vignette that closes in at night).
- **Depth layers (day).** Background: `Sky` (gradient, painted clouds, a low sun and the moon), `Stars`, `Mountains` (layered ridges fading into haze) and `Conifers`. Midground: `Grass` and `Flowers` on the `Terrain`. Foreground: big flowers planted right by the lens (`NEAR_FLOWERS` in `Flowers`), part of the world so they move with it. Over it all, volumetric mist low between the tree lines and around the flowers at the bottom edges of the frame, and `Pollen`, glowing where the low sun shines through it.
- **Look settings and quality tiers.** `src/config/look.ts` holds the tunable defaults (focus range, blur, grain, vignette, density, wind, cursor wind, glow) and two quality presets. `src/store/look.ts` is the runtime copy, canvas-internal and edited by leva. The tier is detected once (`src/lib/quality.ts`). Phones and weak machines get "low": fewer instances, a lower dpr and a smaller DoF buffer. Use `?quality=low|high` to force a tier.
- **Pages control the scene through `sceneMode`.** A page claims the canvas with `useSceneMode("home")`. On unmount it falls back to `"hidden"`, which stops the frameloop and hides the canvas. A new route that doesn't call `useSceneMode` therefore gets a paused, invisible canvas. To add a mode, extend `SCENE_MODES` and `sectionsByMode` in `src/config/scene.ts`.

## Folder structure

```
src/
  app/                 Routes, root layout (mounts the canvas), global CSS and design tokens
  components/
    canvas/            Canvas setup: SceneCanvas, the client-only loader, frameloop control
      scene/           Scene parts: CameraRig, Sky, Lights, PaintedWorld (Terrain + Mountains,
                       Vegetation: CursorWind, Conifers, Grass, Flowers, Pollen), StrokeLayer,
                       DustWorld (Dust, Fireflies, CursorLight), Stars, Effects
      painterly/       Shared toolkit: palette, light and view uniforms, GLSL chunks, the
                       dissolve, dust uniforms and trail, the cursor gust, the brush simulation, strokes and
                       stroke fields, plant painters, landscape shape and conifer layout,
                       PainterlyEffect, WetCanvasPass, VolumetricMist, RNG
      dev/             Dev-only tools (leva panel), lazy-loaded in development
    nav/               Navigation (the Day/Night switch)
    sections/          DOM sections and per-page scroll controllers (e.g. HomeScroll)
  fonts/               Calendas Plus (woff2) loaded with next/font/local
  config/              Section config (camera keyframes), scene modes and the night camera, palette, look and quality presets
  hooks/               useSectionScroll, useSceneMode, usePrefersReducedMotion, useWindowPointer
  lib/                 GSAP setup (plugin registration), the Lenis + GSAP ticker integration, quality tier detection
  store/               The zustand store bridging DOM and canvas, plus the canvas-internal look store
```

## Dev tooling

- **leva**: loads only when `NODE_ENV === "development"` and is absent from production bundles. Run `npm run dev` and press **2** to show the panel (top right), **1** to hide it. Under **Scene**, turn on **override** and drag **night** to set `night` by hand. **log store** prints the current store state to the console. **Look** has focus range, blur strength, grain, vignette, flower density, wind, cursor wind, glow and fringe, and under **night** the cursor light's intensity and radius, dust size, dust bokeh and how hard the light kicks up the dust. **Palette** has every day, dusk and night color. **reset** restores the defaults from `src/config/look.ts` and `src/config/palette.ts`.

## Status

Built:

- Persistent client-only canvas in the root layout, with a Suspense boundary and dpr set by quality tier
- Zustand store, section config, and scene modes
- Lenis + GSAP ScrollTrigger scroll hook with full cleanup on unmount
- `sceneMode` that pauses the frameloop and hides the canvas when `"hidden"`
- leva panel (night override, look, palettes, reset), dev only, toggled with the 2 and 1 keys
- Calendas Plus as the default typeface (`font-sans` and `font-display`), self-hosted via `next/font/local`
- First viewport (`intro`): meadow with sky, clouds, sun, moon, stars, layered mountains, conifers, grass and flowers down to big flowers by the lens, volumetric mist, pollen and fireflies
- The day painted from simulated brushstrokes: plants as instanced strokes, sky, ground and mountains as stroke fields, translucent thin paint
- Depth of field focused on the near meadow, bloom, then canvas texture, grain and vignette
- Day, dusk and night palettes; a 4 s sunset plus camera flight to the top view, from the Day/Night switch
- A strong wind blowing out from the cursor by day
- Night dust world (ground, trees, flowers, motes) with a cursor light, its wake, and per-speck bokeh; the painting dissolves into it along ember edges
- Aspect-aware camera (FOV, tilt, tree lines pulled in on portrait), idle drift and mouse parallax, reduced-motion support
- High/low quality tiers

Still placeholders:

- Camera interpolation between section keyframes on scroll
- Keyframes for `middle` and `outro`
- The three home sections have no content
- Design token values

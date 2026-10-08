# RSGNL Studio Website

The RSGNL Studio website. A 3D nature landscape sits behind the page as a single fixed WebGL canvas, while normal HTML sections scroll on top of it. As each section becomes active, the camera moves to that section's keyframe. On one section it pulls back and the world turns from day to night. The whole scene is driven by one `night` value (0 = day, 1 = night) plus one camera keyframe per section. All text stays in the DOM for SEO and accessibility.

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
| r3f-perf (dev) | Draw-call, FPS, and GPU stats overlay |

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
- **The zustand store is the only bridge.** `src/store/scene.ts` holds `activeSection`, `sectionProgress`, `scrollProgress`, `night`, `nightOverride`, and `sceneMode`. The DOM writes to it and the canvas reads from it. Per-frame code reads it with `useSceneStore.getState()` inside `useFrame` and never subscribes, so scrolling causes no React re-renders.
- **The section config is the single source of truth.** `src/config/sections.ts` gives each section an `id`, a camera keyframe (`position`, `lookAt`, `fov`), and a target `night` value. The page renders its `<section>`s from this config, the scroll hook registers one trigger per entry, and the scene reads the same entries through `sectionsByMode` in `src/config/scene.ts`.
- **Scroll drives the store.** A page calls `useSectionScroll(sections)`. This hook creates Lenis (synced with GSAP's ticker and ScrollTrigger), registers one ScrollTrigger per section plus one for the whole page, and writes `activeSection`, `sectionProgress`, and `scrollProgress`. When the page unmounts, or Next hides it with `<Activity>`, the hook kills every trigger and destroys Lenis.
- **Camera and `night` follow scroll (partly built).** `CameraRig` places the camera on the mode's first keyframe, fits the FOV to the aspect ratio, computes idle drift and mouse parallax (off with reduced motion), and moves `night` toward the active section's target at a steady pace (about 7 s for a full day to night), so the sunset plays out. It skips `night` while `nightOverride` is set. Still to come: interpolating the camera between keyframes using `sectionProgress`.
- **The scene is painted, not lit.** Every material is an unlit `ShaderMaterial`. Colors come from `src/config/palette.ts` in three sets: warm day, sunset (dusk) and cold night. `src/components/canvas/painterly/palette.ts` turns them into shared uniforms (`uSkyTop`, `uFlowerPink`, …). `Lights` calls `updateLight(night)` once per frame. That mixes day to dusk over `night` 0–0.5 and dusk to night over 0.5–1, sinks the sun behind the mountains, raises the moon, and turns up the night glow (glowing flowers, fireflies, stars, bloom).
- **Every frame is repainted with brushstrokes.** `painterly/BrushStrokePass.ts` runs after depth of field and bloom. It builds a quarter-resolution feature-size map (how big the shape under each pixel is), lays a soft toned underpainting, then paints four layers of oriented strokes from 40 px to 6.5 px, and blends the result with the previous frame to settle flicker. Big shapes (sky, near blossoms, leaf masses) get broad strokes; finer layers fade in only where shapes are small. Stroke colors come from the frame, and strokes reach across object borders so neighbouring shapes blend. Procedural brush textures on the sprites (`painterly/brushTextures.ts`, swappable for hand-painted PNGs) add texture below that.
- **Three depth layers.** Background: `Sky` (gradient, painted clouds, sun and moon), `Stars`, `Mountains` (layered ridges fading into haze) and `Conifers`. Midground: instanced `Grass` and `Flowers` (one draw call each) on the `Terrain`, plus `Fireflies` at night. Foreground: `Foreground`, branches and big flowers locked to the camera in view space and anchored to the frame edges, so they frame every aspect ratio. Its blur is pre-baked into the textures and it writes no depth, so the real depth of field never touches it.
- **Look settings and quality tiers.** `src/config/look.ts` holds the tunable defaults (focus, blur, grain, density, wind, stroke size, glow) and two quality presets. `src/store/look.ts` is the runtime copy, canvas-internal and edited by leva. The tier is detected once (`src/lib/quality.ts`). Phones and weak machines get "low": fewer instances, a lower dpr, a smaller DoF buffer, and three stroke layers instead of four. Use `?quality=low|high` to force a tier.
- **Pages control the scene through `sceneMode`.** A page claims the canvas with `useSceneMode("home")`. On unmount it falls back to `"hidden"`, which stops the frameloop and hides the canvas. A new route that doesn't call `useSceneMode` therefore gets a paused, invisible canvas. To add a mode, extend `SCENE_MODES` and `sectionsByMode` in `src/config/scene.ts`.

## Folder structure

```
src/
  app/                 Routes, root layout (mounts the canvas), global CSS and design tokens
  components/
    canvas/            Canvas setup: SceneCanvas, the client-only loader, frameloop control
      scene/           Scene parts: CameraRig, Sky, Lights, Terrain (+ Mountains), Vegetation
                       (+ Conifers, Grass, Flowers, Fireflies, Foreground), Stars, Effects
      painterly/       Shared toolkit: palette and light uniforms, GLSL chunks, brush textures,
                       instanced sprites, landscape shape, BrushStrokePass, PainterlyEffect, RNG
      dev/             Dev-only tools (leva controls, r3f-perf), lazy-loaded in development
    sections/          DOM sections and per-page scroll controllers (e.g. HomeScroll)
  config/              Section config (camera keyframes, night targets), scene modes, palette, look and quality presets
  hooks/               useSectionScroll, useSceneMode, usePrefersReducedMotion
  lib/                 GSAP setup (plugin registration), the Lenis + GSAP ticker integration, quality tier detection
  store/               The zustand store bridging DOM and canvas, plus the canvas-internal look store
loaders/               Turbopack loader that works around an r3f-perf source-map issue
```

## Dev tooling

Both tools load only when `NODE_ENV === "development"` and are absent from production bundles.

- **leva**: run `npm run dev`. The panel opens in the top-right corner. Under **Scene**, turn on **override** and drag **night** to set `night` by hand. **log store** prints the current store state to the console. **Look** has focus distance and range, blur strength, grain, vignette, flower density, wind, glow, stroke size and a brushstrokes toggle (off shows the raw render). **Palette** has every day, dusk and night color.
- **r3f-perf**: shows in the bottom-right corner of the viewport in dev.

## Status

Built:

- Persistent client-only canvas in the root layout, with a Suspense boundary and dpr set by quality tier
- Zustand store, section config, and scene modes
- Lenis + GSAP ScrollTrigger scroll hook with full cleanup on unmount
- `sceneMode` that pauses the frameloop and hides the canvas when `"hidden"`
- leva controls (night override, look, palettes) and r3f-perf, dev only
- First viewport (`intro`): meadow with sky, clouds, sun, moon, stars, layered mountains, conifers, instanced grass and flowers, fireflies, and a camera-locked foreground
- Depth of field and bloom, then brushstroke repainting (`BrushStrokePass`) with stroke size by object size, then canvas texture, grain and vignette
- Day, dusk and night palettes; a sunset transition driven by `night`, eased from the section config
- Aspect-aware camera (FOV, tilt, tree lines pulled in on portrait), idle drift and mouse parallax, reduced-motion support
- High/low quality tiers

Still placeholders:

- Camera interpolation between section keyframes on scroll
- Keyframes for `middle` and `outro`
- The three home sections have no content
- Design token values

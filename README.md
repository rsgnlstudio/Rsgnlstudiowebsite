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
- **Camera and `night` follow scroll (to be built).** `CameraRig` will interpolate the camera between the active section's keyframe and the next one using `sectionProgress`, and ease `night` toward the active section's target. It skips `night` while `nightOverride` is set. Every scene component reads `night`.
- **Pages control the scene through `sceneMode`.** A page claims the canvas with `useSceneMode("home")`. On unmount it falls back to `"hidden"`, which stops the frameloop and hides the canvas. A new route that doesn't call `useSceneMode` therefore gets a paused, invisible canvas. To add a mode, extend `SCENE_MODES` and `sectionsByMode` in `src/config/scene.ts`.

## Folder structure

```
src/
  app/                 Routes, root layout (mounts the canvas), global CSS and design tokens
  components/
    canvas/            Canvas setup: SceneCanvas, the client-only loader, frameloop control
      scene/           Scene parts: CameraRig, Sky, Lights, Terrain, Vegetation, Stars, Effects
      dev/             Dev-only tools (leva controls, r3f-perf), lazy-loaded in development
    sections/          DOM sections and per-page scroll controllers (e.g. HomeScroll)
  config/              Section config (camera keyframes, night targets) and scene modes
  hooks/               useSectionScroll, useSceneMode, usePrefersReducedMotion
  lib/                 GSAP setup (plugin registration) and the Lenis + GSAP ticker integration
  store/               The zustand store bridging DOM and canvas
loaders/               Turbopack loader that works around an r3f-perf source-map issue
```

## Dev tooling

Both tools load only when `NODE_ENV === "development"` and are absent from production bundles.

- **leva**: run `npm run dev`. The panel opens in the top-right corner. Under **Scene**, turn on **override** and drag **night** to set `night` by hand. **log store** prints the current store state to the console.
- **r3f-perf**: shows in the bottom-right corner of the viewport in dev.

## Status

Scaffolded:

- Persistent client-only canvas in the root layout, with dpr capped at `[1, 1.5]` and a Suspense boundary
- Zustand store, section config, and scene modes
- Lenis + GSAP ScrollTrigger scroll hook with full cleanup on unmount
- `sceneMode` that pauses the frameloop and hides the canvas when `"hidden"`
- leva `night` override and r3f-perf (dev only)
- Placeholder design tokens in `src/app/globals.css`

Still placeholders:

- All scene components (CameraRig, Sky, Lights, Terrain, Vegetation, Stars) are empty
- EffectComposer is mounted with no effects
- Camera keyframes and night targets are rough values
- The three home sections have no content
- `usePrefersReducedMotion` is implemented but not wired in
- Design token values

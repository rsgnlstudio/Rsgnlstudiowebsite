@AGENTS.md

# Project rules

Next.js 16 (App Router, Turbopack, Cache Components) site with a persistent R3F background canvas. See README.md for the full architecture. Keep README.md current whenever the architecture or folder structure changes.

## Commands

- `npm run dev` starts the dev server (press 2 for the leva panel, 1 to hide it)
- `npm run build` creates the production build
- `npm run lint` runs ESLint
- `npm run typecheck` runs `next typegen` then `tsc --noEmit` (`LayoutProps` and `PageProps` are generated types)

Before calling work done, run lint, typecheck, and build.

## Architecture rules

- Mount exactly one `<Canvas>`, in the root layout via `SceneCanvasLoader` (`next/dynamic` with `ssr: false` inside a client component). Never mount a canvas in a page.
- The canvas is fixed, full-viewport, behind `<main>`, with `pointer-events: none`. Text content stays in the DOM, never in WebGL.
- `src/store/scene.ts` (zustand) is the only bridge between DOM and canvas. Don't pass scroll or scene state through props or context.
- In `useFrame`, read the store with `useSceneStore.getState()` or refs. Never use React state or store subscriptions for per-frame values. Use `useSceneStore.subscribe` (outside React) for side effects such as the frameloop.
- `src/config/sections.ts` is the single source of truth for section ids and camera keyframes (`position`, `lookAt`, optional `up`, `fov`). DOM section ids must match it.
- `night` (0 = day, 1 = night) is the one value that drives day/night across all scene components, including the camera flight to the top view (`nightCamera` in `src/config/scene.ts`). Only `CameraRig` writes it, animating toward `timeOfDay` (set by `DayNightSwitch`, not by scroll). Anything that writes `night` must skip while `nightOverride !== null` (the dev leva override).
- The night view looks straight down. Anything placed in the scene must also read from above: sprites follow `uTopView` (see `painterly/sprites.ts`), and vegetation that should show at night must be scattered over `OVERHEAD` too.
- Scroll logic (`useSectionScroll`) is called by pages, never the layout. It must fully clean up: revert its gsap context, remove ScrollTrigger listeners, and destroy Lenis.
- With Cache Components, Next hides pages with `<Activity>` instead of unmounting them. Effect cleanups run on hide, so put page-scoped setup in `useEffect` with cleanup and expect it to re-run when the page is shown again.
- Each page claims the scene with `useSceneMode(mode)`. The default and fallback mode is `"hidden"`, which pauses the frameloop and hides the canvas. To add a mode, extend `SCENE_MODES` and `sectionsByMode` in `src/config/scene.ts`.
- Don't add routes or assume a navigation structure unless asked.
- Never hardcode a color in a shader or material. Add it to `src/config/palette.ts` (day, dusk and night) and read it through `paletteUniformsFor` / `paletteGLSL` from `src/components/canvas/painterly/palette.ts`. `Lights` calls `updateLight(night)` every frame (palette, sun, moon, glow). Anything that should glow at night must output HDR (> 1) color scaled by `uGlow`, so bloom picks it up. 
- Materials are unlit `ShaderMaterial`s. Vegetation is instanced (`painterly/sprites.ts`): one draw call per kind. Don't add per-object meshes for things that repeat.
- Tunable look values live in `src/config/look.ts` (defaults and quality presets) and `src/store/look.ts` (runtime, canvas-internal, edited by leva). Per-frame code reads it with `getState()`. The depth-of-field focus is not a setting: `Effects` focuses on the ground at the centre of the frame.
- `terrainHeight` in `painterly/landscape.ts` has a GLSL twin (`terrainHeightGLSL`). Keep the two in sync.

## Conventions

- Import gsap and ScrollTrigger from `@/lib/gsap` (plugins are registered there), not from `gsap` directly.
- Scene parts go in `src/components/canvas/scene/`, one component per file, as named exports. Shared non-component scene code (shaders, textures, palette uniforms) goes in `src/components/canvas/painterly/`.
- Dev-only code goes in `src/components/canvas/dev/` and must load only through the `NODE_ENV === "development"` lazy import in `SceneCanvas`, so it is tree-shaken from production. `DevTools` renders DOM (the leva panel) next to the canvas, not inside it.
- Pages stay Server Components. Put client-only page wiring in a small component that renders `null` (e.g. `HomeScroll`).
- Styling uses Tailwind utilities. Design tokens live in `@theme` in `src/app/globals.css`. Don't hardcode colors or font sizes in components.
- Use the `@/*` path alias for imports from `src/`.
- `usePrefersReducedMotion` exists for disabling Lenis smoothing and shortening camera moves. Use it when adding motion.

## Known quirks

- `Effects` patches postprocessing's circle-of-confusion shader by string replacement (`patchCircleOfConfusion`). If postprocessing changes that shader, it logs a warning and falls back to the default ramp. Recheck after upgrading.
- `THREE.Clock` deprecation warnings in the console come from @react-three/fiber 9.8 internals, not from our code.

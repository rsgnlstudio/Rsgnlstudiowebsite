# Sanity CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simone edits every text and image of the site in an embedded Sanity Studio at `/studio`; publishing refreshes the site without a deploy.

**Architecture:** `src/content/schema.ts` stays the contract. Sanity holds one document per fixed item (fixed `_id`s from `src/sanity/fixedDocuments.ts`); one GROQ query plus `fromSanity()` reassembles them into `SiteDocuments`. `getSiteContent()` caches with `cacheTag("content")`; a webhook validates fresh content before it revalidates the tag, so invalid content never replaces the last good one.

**Tech Stack:** `sanity` 6.19, `next-sanity` 13.3, `@sanity/client`, `@sanity/image-url`, `styled-components` 6, Next 16.4 (Cache Components), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-17-sanity-cms-design.md`

## Global Constraints

- Project id `qe5pzu2u`, dataset `production`, API version `2026-10-01`, public read, no token for reads.
- `.env.local` only (gitignored): `SANITY_API_WRITE_TOKEN` (transfer script only), `SANITY_REVALIDATE_SECRET` (webhook). Never `NEXT_PUBLIC_` for either.
- Studio `basePath: "/studio"`, English UI (default locale), English field titles; content German.
- Nothing can be created, deleted, duplicated or unpublished in the Studio: every document is fixed; free lists are arrays inside documents.
- The canvas never imports `@/content` or `@/sanity`.
- Read `node_modules/next/dist/docs/` before Next APIs; `revalidateTag` takes two arguments.
- Done = `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all pass.

## Review Focus

1. A published edit leaves a required text empty or a path with one station → webhook answers 422, logs problems, site keeps the last good content (Task 5 test).
2. An image slot without an image, or an image without alt → placeholder renders; alt falls back to `""` only when no image (Task 6 test).
3. Hotspot set on an image shown in a fixed-aspect slot → the focal point stays visible (`objectPosition` from hotspot, Task 6 test).
4. Studio route renders none of the site chrome and the site renders no Studio CSS → separate root layouts (Task 3, checked in the browser).
5. Webhook called without or with a wrong signature → 401, no revalidation (Task 5 test).

---

### Task 1: Sanity config, fixed document registry, query and mapping

**Files:**
- Create: `src/sanity/env.ts`, `src/sanity/client.ts`, `src/sanity/fixedDocuments.ts`, `src/sanity/query.ts`, `src/sanity/fromSanity.ts`, `src/sanity/toSanity.ts`
- Modify: `src/content/schema.ts` (image types)
- Test: `src/sanity/fixedDocuments.test.ts`, `src/sanity/mapping.test.ts`

**Interfaces:**
- Produces:
  - `env.ts`: `projectId = "qe5pzu2u"`, `dataset = "production"`, `apiVersion = "2026-10-01"`.
  - `client.ts`: `client` = `createClient({ projectId, dataset, apiVersion, useCdn: false, perspective: "published" })` from `next-sanity`.
  - `fixedDocuments.ts`: `type FixedDocument = { _id: string; type: SanityType; title: string; configId?: string }`; `SINGLETONS: readonly FixedDocument[]` (`siteSettings`, `studio`, `uiLabels`, `nightIntro`, `servicesOverview`, `results`, `process`, `about`, `testimonials`, `bafa`, `faq`, `contact`, `legal.imprint`); `fixedItems(type: "project" | "area" | "challenge" | "service" | "road"): FixedDocument[]` in config order from `PROJECT_BEDS`, `AREAS`, `CLEARINGS`, `CITY_LIGHTS`, `ROADS`, `_id` = `${type}.${configId}`; `FIXED_TYPES: readonly SanityType[]`.
  - `schema.ts`: `interface ContentImage { asset: { _ref: string }; crop?: { top: number; bottom: number; left: number; right: number }; hotspot?: { x: number; y: number; width: number; height: number }; alt: string; lqip?: string }`; `ProjectMedia` gains `image?: ContentImage`; `About` gains `portrait?: ContentImage`.
  - `query.ts`: `SITE_QUERY` (GROQ string): one object with keys `site, studio, ui, projects, intro, servicesOverview, areas, challenges, services, roads, results, process, about, testimonials, bafa, faq, contact, legal`; singletons by `_id`, lists by `_type`; spread projections (`{...}`), images as `image{..., "lqip": asset->metadata.lqip}`.
  - `fromSanity.ts`: `fromSanity(raw: unknown): SiteDocuments` — recursively drops keys starting with `_` except inside `asset` (`_ref`), sorts fixed lists by config order, assembles `consulting` (`testimonials`/`faq` from those documents' `items`, `servicesIntro` from `servicesOverview.intro`).
  - `toSanity.ts`: `toSanity(docs: SiteDocuments): SanityDocumentStub[]` (`{ _id, _type, ...fields }`), adding `_key` (`k0`, `k1`, …) to every object inside an array.

- [ ] **Step 1: Install** `npm i sanity@^6.19 next-sanity@^13.3 @sanity/client @sanity/image-url styled-components@^6`.
- [ ] **Step 2: Write failing tests.**
  - `fixedDocuments.test.ts`: `fixedItems("service").map(d => d.configId)` equals `CITY_LIGHTS.map(c => c.id)`; all `_id`s across `SINGLETONS` and every `fixedItems` type are unique; `fixedItems("road")[0]._id` starts with `"road."`.
  - `mapping.test.ts`: `fromSanity(rawFrom(toSanity(siteDocuments)))` `toEqual(siteDocuments)`, where `rawFrom` groups the stubs into the `SITE_QUERY` shape (singletons by `_id`, lists by `_type`, lists reversed to prove the reordering); every array object in `toSanity` output has a unique `_key` within its array.
- [ ] **Step 3:** Run `npm test` → both files FAIL (modules missing).
- [ ] **Step 4:** Implement the modules above.
- [ ] **Step 5:** `npm test` → PASS; `npm run typecheck` → PASS.
- [ ] **Step 6:** Commit "Add the Sanity client, fixed document registry and content mapping".

### Task 2: Studio schema, structure and locked actions

**Files:**
- Create: `src/sanity/schemaTypes/fields.ts` (helpers), one file per document type in `src/sanity/schemaTypes/` (`siteSettings`, `studio`, `uiLabels`, `project`, `nightIntro`, `servicesOverview`, `area`, `challenge`, `service`, `road`, `results`, `process`, `about`, `testimonials`, `bafa`, `faq`, `contact`, `legalPage`), shared objects (`twoLines`, `textBlock`, `contentImage`), `src/sanity/schemaTypes/index.ts`, `src/sanity/structure.ts`, `sanity.config.ts`, `sanity.cli.ts`
- Test: `src/sanity/schemaTypes/schema.test.ts`

**Interfaces:**
- Consumes: `fixedItems`, `SINGLETONS`, `FIXED_TYPES` (Task 1).
- Produces: `sanity.config.ts` default export (`"use client"`, `basePath: "/studio"`, `structureTool({ structure })`, `visionTool()` omitted, `schema.types`, `document.newDocumentOptions: () => []`, `document.actions` filtered to `publish`, `discardChanges`, `restore`); `schemaTypes: SchemaTypeDefinition[]`.

Rules for the types: field names = the TS keys in `schema.ts`; `required()` for every non-optional TS field; `text` (rows 4) for long texts, `string` otherwise; `id` field `readOnly`; `bafa.enabledUntil` is `date`; `challenge.stations` custom validation: exactly 2 when `PATHS.find(p => p.id === id)?.services`, else may be empty; `testimonials.items` `max(TESTIMONIAL_HOMES.length)`; `contentImage` = image with `hotspot: true` and `alt` (`required` only when `asset` is set); descriptions carry the hints from `schema.ts` comments; icons from `@sanity/icons/<Name>` subpaths. Structure: Settings (Site settings, UI labels) · Day: art studio (Entry & hints, Projects → `fixedItems("project")`) · Night: consulting (Intro, Areas, Challenges, Services overview, Services, Roads, Results, Process, About, Testimonials, BAFA, FAQ, Contact) · Legal (Imprint); each item `S.document().schemaType(type).documentId(_id)`.

- [ ] **Step 1: Failing test** `schema.test.ts`: every `FIXED_TYPES` entry has a schema type; for each `SiteDocuments` key path, the matching schema type has a field of that name (walk `toSanity(siteDocuments)` field names against the schema's field names, recursively for objects and array members).
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement types, structure, configs.
- [ ] **Step 4:** `npm test`, `npm run typecheck`, `npm run lint` → PASS.
- [ ] **Step 5:** Commit "Add the Studio schema and structure".

### Task 3: Studio route and split root layouts

**Files:**
- Move: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/imprint/` → `src/app/(site)/`; `globals.css` import path follows.
- Create: `src/app/studio/[[...tool]]/layout.tsx` (own `<html lang="en"><body>`), `src/app/studio/[[...tool]]/page.tsx` (`NextStudio config={config}`, re-export `metadata`, `viewport` from `next-sanity/studio`; no `dynamic` export — not allowed with Cache Components).

- [ ] **Step 1:** Move files, add the route.
- [ ] **Step 2:** `npm run typecheck`, `npm run build` → PASS.
- [ ] **Step 3:** `npm run dev`, open `/studio`: Studio login/desk appears, no canvas, no cursor dot, no footer; `/` unchanged. Screenshot to `.context/studio.png`.
- [ ] **Step 4:** Commit "Mount the Studio at /studio in its own root layout".

### Task 4: Transfer the content

**Files:**
- Create: `scripts/transfer-content.ts` (deleted in Task 7)
- Create: `.env.local` (not committed) with `SANITY_API_WRITE_TOKEN=<token from the user>` and `SANITY_REVALIDATE_SECRET=<openssl rand -hex 32>`

- [ ] **Step 1:** Script: `toSanity(siteDocuments)` → one transaction of `createOrReplace` with `client.withConfig({ token })`; prints the document count.
- [ ] **Step 2:** Run `npx -y tsx --env-file=.env.local --tsconfig tsconfig.json scripts/transfer-content.ts` → prints the count (13 singletons + 5 projects + areas + challenges + services + roads).
- [ ] **Step 3:** Verify with the published query: `fromSanity(await client.fetch(SITE_QUERY))` `toEqual(siteDocuments)` (one-off check in the script, `--verify` flag).
- [ ] **Step 4:** Deploy the schema: `npx sanity schema deploy`.
- [ ] **Step 5:** Commit the script "Transfer the seed content to Sanity".

### Task 5: Read from Sanity, guarded revalidation

**Files:**
- Modify: `src/content/index.ts`
- Create: `src/app/api/revalidate/route.ts`, `src/sanity/revalidate.ts`
- Test: `src/sanity/revalidate.test.ts`

**Interfaces:**
- Produces: `getSiteContent()` = `"use cache"`, `cacheLife("max")`, `cacheTag("content")`, `fromSanity(await client.fetch(SITE_QUERY))`, throws on `validateContent` problems (fails the build; at runtime only reached after the webhook approved the content). `handleWebhook(input: { isValidSignature: boolean | null; fetchContent: () => Promise<SiteDocuments>; revalidate: () => void }): Promise<{ status: 200 | 401 | 422; problems?: string[] }>`.
- Route: `POST` → `parseBody(req, process.env.SANITY_REVALIDATE_SECRET, true)` → `handleWebhook` with `revalidate: () => revalidateTag("content", { expire: 0 })`; 422 logs the problems with `console.error`.

- [ ] **Step 1: Failing tests** `revalidate.test.ts`: invalid signature → 401, `revalidate` not called; content with a challenge removed → 422 with `'consulting.challenges: missing "owner"'`, not revalidated; valid content → 200, revalidated once.
- [ ] **Step 2:** `npm test` → FAIL. **Step 3:** implement. **Step 4:** `npm test` → PASS; `npm run build` → PASS (build reads Sanity).
- [ ] **Step 5:** Commit "Read content from Sanity and revalidate on publish".

### Task 6: Images

**Files:**
- Create: `src/sanity/image.ts` (`urlFor` via `@sanity/image-url` with `projectId`, `dataset`; `imageLoader(image)` → next/image loader `({ width, quality }) => urlFor(image).width(width).quality(quality ?? 75).auto("format").url()`; `focalPoint(image): string` → `"x% y%"` from hotspot, `"50% 50%"` without), `src/components/ui/ContentImage.tsx` (`next/image` `fill`, `sizes` prop, `object-cover`, `objectPosition` from `focalPoint`, blur from `lqip`)
- Modify: `src/components/day/ProjectOverlay.tsx` (render `ContentImage` in the slot when `m.image`, else the placeholder; `sizes` "(min-width: 768px) 50vw, 100vw", landscape "100vw"), `src/components/night/panels/AboutPanel.tsx` (portrait in the 4:5 box when set)
- Test: `src/sanity/image.test.ts`

- [ ] **Step 1: Failing tests:** `focalPoint({ hotspot: { x: 0.25, y: 0.8, … } })` = `"25% 80%"`; without hotspot `"50% 50%"`; `imageLoader(img)({ src: "", width: 640 })` contains `w=640` and `auto=format` and the asset id from `image-<id>-<w>x<h>-jpg`.
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** In the Studio upload a test image to one project and the portrait, publish, check the overlay and About panel; then remove the test images and publish again.
- [ ] **Step 6:** Commit "Render project media and the portrait from Sanity".

### Task 7: Remove the seed, docs

**Files:**
- Move: `src/content/data/` → `src/content/fixtures/` (test fixture only; comment says so; nothing outside `*.test.ts` may import it — add an ESLint `no-restricted-imports` rule for non-test files)
- Delete: `scripts/transfer-content.ts`, `toSanity.ts` stays only if tests use it (they do: mapping and schema tests)
- Modify: tests' imports, `README.md` (content from Sanity, `/studio`, env vars, webhook setup, inviting an editor), `CLAUDE.md` (content layer rule: values in Sanity, fixed ids; "root layout" → "the site's root layout `src/app/(site)/layout.tsx`"; Studio rules)

- [ ] **Step 1:** Move and update; `npm run lint`, `typecheck`, `test`, `build` → PASS.
- [ ] **Step 2:** Commit "Make Sanity the only content source".

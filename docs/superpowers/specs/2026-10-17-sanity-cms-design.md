# Sanity as the CMS

## Intent

Simone (the studio's owner, not a developer) edits every text and image on the
site herself, without a developer and without a redeploy. The site already reads
all copy through a typed content layer (`src/content`) whose types were written
as "one type per future Sanity document"; this project swaps the local seed data
for a Sanity dataset and gives Simone a Studio to edit it.

## Goals

- An embedded Sanity Studio at the route `/studio` of the Next app
  (today `https://rsgnl-website.vercel.app/studio`, later the real domain).
  Studio UI in English (Sanity's default locale; no locale plugin). Field
  titles and descriptions in English; the content itself stays German.
- Everything in `SiteDocuments` (`src/content/schema.ts`) is editable: site
  settings, the day studio, the five projects, the consulting night map, the UI
  labels, the imprint.
- Images become editable: per project a list of media (image, alt text, aspect
  `landscape | portrait`), and a portrait photo of Simone in the About panel.
  Empty image slots keep rendering today's placeholders.
- Publishing is enough: on Publish, a Sanity webhook calls the site, which
  revalidates the `content` cache tag; the change is live within seconds.
- All current copy is transferred into the `production` dataset and published.
  After that Sanity is the only source of content; the seed files in
  `src/content/data` are removed.

## Non-goals

- No live preview, Presentation tool, draft mode or visual editing.
- No Portable Text: long texts stay plain multi-line text (`text` fields)
  rendered by `RichText` (line breaks, e-mail links), as today.
- No localization; German content only.
- No new routes besides `/studio` and the webhook endpoint.

## Anti-goals (a failure even if it works)

- Simone can add or delete a service, a project bed, or any other item whose
  place is fixed in the scene (`src/config/flowers.ts`, `src/config/nightMap.ts`).
  Those exist exactly once each; she edits their copy only.
- A publish in the Studio breaks the live site (blank page, crash, missing text).
- The Studio's styles, scripts or the site's chrome (canvas, cursor dot,
  footer, wordmark, ContentProvider) leak into each other.
- The write token ends up in git or in the client bundle.
- The canvas starts importing content or Sanity code.

## Constraints

- Sanity project `qe5pzu2u`, dataset `production` (public read; currently
  empty apart from system documents). CORS origins already exist for
  `http://localhost:3000`, `http://localhost:3333` and
  `https://rsgnl-website.vercel.app`, all with credentials.
- Next 16.4 with Cache Components, React 19.3. Current versions: `sanity` 6.19,
  `next-sanity` 13.3 (peer `next ^16`, `react ^19.2.3`, `styled-components ^6.1`).
  Read `node_modules/next/dist/docs/` before relying on Next APIs (AGENTS.md).
- The write token is given by the user. It goes only into `.env.local`
  (gitignored by `.env*`) as `SANITY_API_WRITE_TOKEN`, used only by the
  one-off transfer script. The site reads the public dataset without a token.
- Project rules in CLAUDE.md stay in force; update CLAUDE.md and README.md where
  they change (content layer, root layout, commands).
- Before calling it done: `npm run lint`, `typecheck`, `test`, `build`.

## Decided

**The TypeScript schema stays the contract.** `src/content/schema.ts` keeps
describing what components receive; components keep using `useContent()` /
`getSiteContent()` unchanged, apart from the new image fields. One GROQ query
(or a few, in parallel) reassembles the Sanity documents into exactly the
`SiteDocuments` shape, and `validateContent` keeps running on the result.

**Fixed items vs. free lists.**

- Fixed, one document each with a fixed `_id`, never created, deleted or
  duplicated from the Studio: site settings, studio (day), UI labels,
  consulting intro, results, process, about, BAFA, contact, imprint, plus one
  document per project bed, area, challenge, service and road, keyed by the
  config id (e.g. `project.painting`, `service.strategy`,
  `road.leadership-strategy`). The config id is stored in an `id` field shown
  read-only. Use Studio's singleton support (`defineSingleton` /
  `S.listItem().singleton(id)`, Studio ≥ 6.17) or equivalent structure and
  document actions so "create", "delete" and "duplicate" are unavailable for
  these.
- Free lists Simone can add to, remove from and reorder: FAQ items,
  testimonials (validated to at most `TESTIMONIAL_HOMES.length`), About
  stations, process steps and formats, results points, intro lines, service
  `extra` blocks and research points, imprint sections, project media.
- Challenge `stations` stay exactly two when the path has services (as
  `validateContent` demands); enforce in Studio validation.

**Studio structure** (English titles), grouped the way Simone thinks about the site:
Settings (site settings, UI labels) · Day: art studio (entry & hints, the five
projects) · Night: consulting (intro, areas, challenges, services, roads,
results, process, about, testimonials, BAFA, FAQ, contact) · Legal (imprint).
Items in each fixed group are listed in config order with their German title as
the preview.

**Studio validation mirrors the site.** Every field that is required in the TS
type is `required()` in the schema, so a document with a missing required text
can't be published. `bafa.enabledUntil` is a `date` field. Field descriptions
carry the hints that live in the TS comments today (e.g. the BAFA midnight-CET
note, "line then detail" for two-line texts).

**Route layout.** The Studio must not render inside the site's chrome. Split
the app into two root layouts with route groups: the site (`/`, `/imprint`)
under `src/app/(site)/layout.tsx` (today's root layout, unchanged in what it
mounts), and the Studio under `src/app/studio/[[...tool]]/` with its own
minimal root layout rendering `NextStudio`. Moving between them is a full page
load, which is fine. CLAUDE.md's "root layout" wording for the canvas becomes
"the site's root layout".

**Fetching and caching.** `getSiteContent()` keeps `"use cache"`,
`cacheLife("days")` and `cacheTag("content")`, and fetches from Sanity
(published perspective, no token). A webhook endpoint (`/api/revalidate`,
verified with `SANITY_REVALIDATE_SECRET` via `next-sanity/webhook`'s
`parseBody`) calls `revalidateTag("content")` on any create/update/delete of
the site's document types. Config (project id, dataset, API version) lives in
one small module; project id and dataset are not secret.

**Broken content never takes the site down.** Studio validation is the first
line. If `validateContent` still finds problems on fetched content, the build
fails as today; at runtime (after a webhook) the site must keep serving the last
good content rather than an error page, and log the problems.

**Images.** Sanity `image` fields with `hotspot: true` and an `alt` text
(German), required once an image is set (slots start empty after the transfer; builder's call). Rendered with `next/image` (remote pattern `cdn.sanity.io`) or the
Sanity image URL builder, sized for their slot (project grid: landscape full
width / portrait half; About: portrait 4:5). The query includes `lqip` and
dimensions for blur placeholders. Image types are added to `schema.ts`
(e.g. `ProjectMedia` gains an optional `image`, `About` gains an optional
`portrait`); placeholders render while they're empty.

**Transfer.** A one-off script maps today's `siteDocuments` to Sanity documents
(fixed `_id`s, `_key`s on array items), writes them with `createOrReplace` in
one transaction to published IDs, using the write token from `.env.local`.
Run it, check the result against the seed (the site renders the same text as
before), then delete `src/content/data` and the script. Tests that used the
seed data get small fixtures instead.

**Webhook setup.** Creating the webhook and setting env vars on Vercel needs
the user's dashboards: the builder generates the secret, adds it to
`.env.local`, and hands the user exact steps (webhook URL, filter, projection,
secret; Vercel env vars). Until the webhook exists, content still refreshes on
the next deploy.

**Access.** Simone is invited to the Sanity project as an Editor by the user;
the README says how.

## Left to the builder

- Exact document type names, field names and the GROQ query, as long as the
  result matches `SiteDocuments`.
- One document per fixed item vs. grouping (e.g. all challenges in one
  document with a fixed-length array), if singleton-per-item turns out clumsy
  in the Studio; the anti-goals decide.
- How the embedded Studio route coexists with Cache Components (route config,
  `NextStudio` setup per current next-sanity docs).
- How "keep serving the last good content" is achieved with `"use cache"`.
- Where Sanity code lives (suggestion: `src/sanity/` for config, schema types
  and structure; `sanity.config.ts` / `sanity.cli.ts` at the repo root).
- Whether to deploy the schema (`sanity schema deploy`) for the MCP/Content Lake
  tooling.

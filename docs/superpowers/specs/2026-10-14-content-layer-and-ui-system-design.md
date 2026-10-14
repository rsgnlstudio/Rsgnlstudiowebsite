# Content layer and shared UI system

Date: 2026-10-14
Status: approved design, awaiting spec review

## Goal

Prepare the site for Sanity without adding it yet. All copy (both sites, UI labels, legal pages, site settings) flows through one typed, async content layer shaped like future Sanity documents, and the hand-repeated UI patterns become shared components. No visual or behavioural change.

## Decisions

- Editors will manage all copy in Sanity. Layout (map positions, bed ellipses, flowers, camera) stays in code and links to content by id.
- German only; no locale parameter.
- Content reaches components through an async getter called in Server Components and a client `ContentProvider` (approach A). Context is allowed for content: the rule against context covers scroll and scene state only.
- The canvas never reads content. The one value it needs (testimonial count) is written to the scene store.

## Out of scope

Sanity packages, schemas, Studio, GROQ, draft mode, any visual change, new routes.

## 1. Content model

`src/content/schema.ts` holds plain TS types, one per future Sanity document, named and shaped to translate 1:1:

- `SiteSettings`: `name`, `metadata` (`title`, `description`), `contactEmail`, `footer` labels.
- `Studio`: `entry` (title, text, loading, enter with/without sound, "oder"), `dayHint` (`mouse`, `touch`), `switch` (`day`, `night`, group label).
- `Project` (array): `id` (= project bed id in `config/flowers.ts`), `title`, `teaser`, `body` (blocks; placeholders today).
- `Consulting`: `intro`, `areas[]`, `challenges[]`, `services[]`, `roads[]`, `results`, `process`, `about`, `testimonials[]`, `bafa` (`title`, `text`, `enabledUntil` ISO date, `faqNote`, `defaultNote`), `faq[]`, `contact`, `servicesIntro`.
- `UiLabels`: nav, footer, map, path, categories, blocks, related, close, menu, sound.
- `LegalPage` (array): `slug`, `title`, `metaTitle`, `sections[]` (`heading`, `body`, `muted?`).

Rules:

- Records keyed by id become arrays of objects with an `id` field (Sanity stores arrays). `byId(list, id)` helpers in `selectors.ts` keep lookups short. Ids are typed with the id unions from `config/nightMap.ts` / `config/flowers.ts`.
- Long texts stay plain strings and render through `RichText`, so moving to Portable Text later changes one component.
- `BAFA_ENABLED` is removed from `config/nightMap.ts`; `bafaEnabled(content, now)` derives it from `bafa.enabledUntil`. The canvas (`painterly/nightMap.ts`, lantern) reads it from the store (`bafaEnabled`), written by the client content bridge.
- `src/content/data/*.ts` holds today's copy in these shapes (site, studio, projects, consulting, ui, legal). It is the seed data for Sanity.
- `src/content/index.ts`: `getSiteContent(): Promise<SiteContent>`, the only entry point. Later its body becomes a GROQ fetch with `"use cache"` and tag revalidation.
- `src/content/ContentProvider.tsx` (client): provides `SiteContent` and writes the canvas-facing values (`testimonialCount`, `bafaEnabled`) to the scene store. `useContent()` reads it.
- `config/flowers.ts` loses `title`/`teaser`; `PROJECT_BEDS` keeps id and layout only.

## 2. Shared UI components (`src/components/ui/`)

| Component | Replaces |
| --- | --- |
| `Button` / `ButtonLink` (existing) | unchanged |
| `TextLink` (`variant: "underline" \| "quiet"`; renders `next/link`, `<a>` or `<button>`) | `PanelLink`, footer `link` class (its buttons become `TextLink` with `variant="quiet"`), imprint back link, contact mail/tel links |
| `Icon` | hand-sized lucide icons (`size-[1.125rem]`, `strokeWidth 1.5`, `aria-hidden`) |
| `PreviewCard` (`tone`) | `FlowerHoverLabel` card, `MapPlaces` hover card and touch card surface |
| `BottomHint` | `DayHint` and the `NightIntro` hint |
| `useSceneTone()` | the day/night tone class and transition duration repeated in `TopNav`, `SoundToggle`, `MobileMenu`, `SiteBrand` |
| `Disclosure` | FAQ items and the collapsible research block |
| Typography: `Eyebrow`, `Heading`, `Intro`, `Block`, `Highlight`, `RichText` | night-only `PanelParts`; also used by `ProjectOverlay` and `LegalPage` |

Also:

- The night section links are defined once in `config/navigation.ts` (used by `NightNavLinks`, `MobileMenu`, `SiteFooter`); labels come from content by key.
- `openPanel` moves to `store/scene.ts`.

## 3. Folder structure

```
src/
  app/                 routes; Server Components fetch content and render <ContentProvider>
  content/             schema.ts, data/, index.ts, ContentProvider.tsx, selectors.ts
  config/              layout and behaviour only
  components/
    ui/                shared primitives
    layout/            SiteBrand, SiteFooter, CursorDot, LegalPage
    nav/               TopNav, NavItems, MobileMenu, DayNightSwitch, NightNavLinks, SoundToggle
    overlay/           SlidePanel, EntryScreen
    day/               DayHint, FlowerHoverLabel, ProjectOverlay, HomeScroll, Section
    night/             NightIntro, MapPlaces, NightPanel, PathStory, panels/ (one file per kind)
    canvas/            unchanged except reading testimonial count / BAFA from the store
```

The root layout fetches content once and wraps everything in `ContentProvider` (layout and page share it; `SiteBrand`/`SiteFooter` live in the layout). Pages stay Server Components. The imprint page reads its `LegalPage` document and renders the generic `LegalPage` component; metadata comes from content via `generateMetadata`.

README.md and CLAUDE.md get a Content section (the content layer, where copy goes, how Sanity plugs in); rules that name `src/content/consulting.ts` are updated.

## Verification

`npm run lint`, `npm run typecheck`, `npm run build`, then a browser pass comparing before and after: entry screen, day (hint, bed hover label, project overlay), night (intro, map previews, every panel kind, path story scroll), mobile menu, footer, imprint.

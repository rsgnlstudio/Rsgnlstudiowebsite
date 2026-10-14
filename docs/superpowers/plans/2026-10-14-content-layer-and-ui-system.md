# Content Layer and Shared UI System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route all copy through one typed, async content layer shaped like future Sanity documents, and replace hand-repeated UI patterns with shared components, without changing how the site looks or behaves.

**Architecture:** `src/content/` holds document types (`schema.ts`), seed data (`data/`), pure selectors and a validator, and `getSiteContent()` (cached with `"use cache"`). The root layout awaits it and renders a client `ContentProvider`; client components read copy with `useContent()`. The canvas never reads content: the provider writes `testimonialCount` and `bafaActive` to the scene store. Shared primitives live in `src/components/ui/` and `src/hooks/useSceneTone.ts`.

**Tech Stack:** Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind 4, zustand, lucide-react, Vitest (new, dev only).

**Spec:** `docs/superpowers/specs/2026-10-14-content-layer-and-ui-system-design.md`

## Global Constraints

- No visual or behavioural change. Every migrated component keeps its exact classes unless a step says otherwise.
- German only; no locale parameter.
- Layout (positions, bed ellipses, flowers, camera, map geometry) stays in `src/config/`; content links to it by id only.
- The canvas (`src/components/canvas/**`) never imports from `@/content`.
- Content may be passed through React context (`ContentProvider`); scroll and scene state still may not.
- Use the `@/*` alias for imports from `src/`. Import gsap from `@/lib/gsap`.
- Every button is `Button`/`ButtonLink`; text-style links/buttons are `TextLink`/`TextButton`. No hardcoded colors or font sizes outside tokens.
- Pages stay Server Components. Client wiring stays in small client components.
- No Sanity packages, schemas, Studio or GROQ.
- Before calling a task done: `npm run lint`, `npm run typecheck`, `npm test`. Before the final task is done, also `npm run build` and a browser pass.

## Review Focus

1. **Content missing an id the layout expects** (a challenge, service, road, area or project deleted in the CMS later): the build should fail with a message naming the missing id, not render `undefined` or crash in the browser. Pinned in Task 2 (`validateContent` tests).
2. **BAFA end date**: on 31.12.2026 at 23:59 German time the lantern and every BAFA hint still show; from 1.1.2027 00:00 they are gone. Pinned in Task 1 (`bafaActive` tests).
3. **Testimonial count vs fireflies**: with fewer testimonials than `TESTIMONIAL_HOMES`, extra fireflies stay hidden and unreachable; more testimonials than homes is a content error. Pinned in Task 2 (validator) and Task 3 (store default 0 → fireflies hidden until the provider writes).
4. **Booking mail with umlauts/quotes in the challenge line**: the `mailto:` stays valid (encoded subject and body). Pinned in Task 1 (`bookingHref` test).
5. **Hover previews for every place kind** (path, service, results with and without active path, contact, about, bafa, testimonial) return the same text as before. Pinned in Task 1 (`placePreview` tests).

---

## File map

Create:
- `vitest.config.ts`: test runner with the `@/` alias.
- `src/content/schema.ts`: document types.
- `src/content/selectors.ts` (+ `selectors.test.ts`): `byId`, `firstSentence`, `bafaActive`, `bookingHref`, `placePreview`.
- `src/content/validate.ts` (+ `validate.test.ts`): `validateContent`.
- `src/content/data/site.ts`, `studio.ts`, `projects.ts`, `consulting.ts`, `ui.ts`, `legal.ts`: seed data.
- `src/content/index.ts`: `getSiteContent()`, `getLegalPage(slug)`.
- `src/content/ContentProvider.tsx`: provider, `useContent()`.
- `src/config/navigation.ts`: `NIGHT_SECTIONS`.
- `src/hooks/useSceneTone.ts`.
- `src/components/ui/Icon.tsx`, `TextLink.tsx`, `PreviewCard.tsx`, `BottomHint.tsx`, `Disclosure.tsx`, `Typography.tsx`, `RichText.tsx`.
- `src/components/night/panels/*.tsx`: one file per panel kind, plus `PanelEnd.tsx`.
- `src/components/layout/LegalPage.tsx`.

Move (git mv, then edit):
- `components/nav/SiteBrand.tsx`, `nav/SiteFooter.tsx`, `cursor/CursorDot.tsx` → `components/layout/`
- `components/sections/SlidePanel.tsx`, `sections/EntryScreen.tsx` → `components/overlay/`
- `components/sections/{DayHint,FlowerHoverLabel,ProjectOverlay,HomeScroll,Section}.tsx` → `components/day/`

Delete: `src/content/consulting.ts`, `src/content/studio.ts`, `src/config/site.ts` (its `PAGE_IN`/`PAGE_OUT` move to `src/config/navigation.ts`), `src/components/night/PanelContent.tsx`, `src/components/night/PanelParts.tsx`.

Modify: `src/store/scene.ts`, `src/config/flowers.ts`, `src/config/nightMap.ts`, `src/components/canvas/scene/NightMap.tsx`, `src/components/canvas/painterly/nightMap.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/imprint/page.tsx`, every component under `nav/` and `night/`, `README.md`, `CLAUDE.md`, `package.json`.

## Old → new content mapping (used by Tasks 5 to 8)

`c` is `useContent()` in client components, or `await getSiteContent()` on the server.

| Old | New |
| --- | --- |
| `INTRO` | `c.consulting.intro` |
| `AREA_TITLES[id]` | `byId(c.consulting.areas, id).title` |
| `CHALLENGES[id]` | `byId(c.consulting.challenges, id)` |
| `SERVICES[id]` | `byId(c.consulting.services, id)` |
| `ROAD_TEXTS[id]` | `byId(c.consulting.roads, id)` |
| `RESULTS`, `PROCESS`, `ABOUT`, `CONTACT`, `FAQ` | `c.consulting.results` / `.process` / `.about` / `.contact` / `.faq` |
| `TESTIMONIALS` | `c.consulting.testimonials` |
| `BAFA_TEXT.title` / `.text` | `c.consulting.bafa.title` / `.text` |
| `FAQ_BAFA_NOTE` | `c.consulting.bafa.faqNote` |
| `UI.path.bafaDefault` | `c.consulting.bafa.pathNote` |
| `BAFA_ENABLED` | `c.bafaActive` (DOM) / `useSceneStore.getState().bafaActive` (canvas) |
| `UI` | `c.ui` |
| `UI.servicesIntro` | `c.consulting.servicesIntro` |
| `DAY_HINT` | `c.studio.dayHint` |
| `SITE_NAME`, `CONTACT_EMAIL` | `c.site.name`, `c.site.contactEmail` |
| `IMPRINT_HREF` | `IMPRINT_HREF` from `@/config/navigation` |
| `PAGE_IN`, `PAGE_OUT` | same names from `@/config/navigation` |
| `bed.title`, `bed.teaser` | `byId(c.projects, bed.id).title` / `.teaser` |
| `firstSentence`, `bookingHref` | from `@/content/selectors` (`bookingHref(c.consulting.contact, challenge)`) |
| `openPanel` (PanelParts) | `openPanel` from `@/store/scene` |
| `NIGHT_LINKS` / footer `SECTIONS` | `NIGHT_SECTIONS` from `@/config/navigation`, label `c.ui.nav[s.key]` |

---

### Task 1: Test runner, document types, selectors

**Files:**
- Create: `vitest.config.ts`, `src/content/schema.ts`, `src/content/selectors.ts`, `src/content/selectors.test.ts`
- Modify: `package.json` (devDependency `vitest`, script `test`)

**Interfaces:**
- Produces: all types in `schema.ts` (`SiteContent`, `SiteSettings`, `Studio`, `Project`, `ProjectMedia`, `Consulting`, `Area`, `Challenge`, `Service`, `ServiceExtra`, `Road`, `Results`, `Process`, `About`, `Testimonial`, `Bafa`, `FaqItem`, `Contact`, `ConsultingIntro`, `UiLabels`, `LegalPage`, `LegalSection`, `TwoLines`, `TextBlock`, `SiteDocuments`), and from `selectors.ts`: `byId<T extends { id: string }>(list: readonly T[], id: T["id"]): T`, `firstSentence(text: string): string`, `bafaActive(bafa: Pick<Bafa, "enabledUntil">, now: Date): boolean`, `bookingHref(contact: Pick<Contact, "email" | "mailSubject" | "mailChallenge">, challenge?: string): string`, `placePreview(place: Place, content: SiteContent, activePath: ChallengeId | null): TwoLines`.

- [ ] **Step 1: Install Vitest and add the script**

Run: `npm install --save-dev vitest@^3`
Then in `package.json` scripts add `"test": "vitest run"`.

Create `vitest.config.ts`:

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
```

- [ ] **Step 2: Write `src/content/schema.ts`**

```ts
import type { ProjectBedId } from "@/config/flowers";
import type { AreaId, ChallengeId, RoadId, ServiceId } from "@/config/nightMap";

/**
 * The site's content, one type per future Sanity document. Ids link a
 * document to its place in the layout (src/config/flowers.ts,
 * src/config/nightMap.ts); everything else is copy. Lists, not maps:
 * Sanity stores arrays. Long texts are plain strings rendered with
 * `RichText`, so they can become Portable Text in one place.
 */

/** A two-line text: the situation, then its plain classification. */
export interface TwoLines {
  line: string;
  detail: string;
}

export interface TextBlock {
  title: string;
  text: string;
}

/** `siteSettings`: the same on every page. */
export interface SiteSettings {
  /** The wordmark (a stand-in for the logo). */
  name: string;
  metadata: { title: string; description: string };
  /** The studio's address, in the day footer and the imprint. */
  contactEmail: string;
}

/** `studio`: the day (the art studio over the meadow). */
export interface Studio {
  entry: {
    title: string;
    text: string;
    loading: string;
    withSound: string;
    withoutSound: string;
    or: string;
  };
  /** The hint at the bottom centre by day: one line for the mouse, one for touch. */
  dayHint: { mouse: string; touch: string };
  /** The Day/Night switch. */
  timeOfDay: { label: string; day: string; night: string };
}

/** A media slot of a project; `landscape` spans the full width, two `portrait`s share a row. */
export interface ProjectMedia {
  aspect: "landscape" | "portrait";
}

/** `project`: what a project flower bed opens. */
export interface Project {
  id: ProjectBedId;
  title: string;
  /** Shown next to the cursor while the bed is hovered, and under the overlay's title. */
  teaser: string;
  media: readonly ProjectMedia[];
}

export interface ConsultingIntro {
  lines: readonly string[];
  transition: string;
  statement: string;
  hint: string;
  skip: string;
}

export interface Area {
  id: AreaId;
  title: string;
}

export interface Challenge extends TwoLines {
  id: ChallengeId;
  noticed?: string;
  behind?: string;
  support?: string;
  /** The two services on its path, in the words of this challenge. */
  stations?: readonly [TwoLines, TwoLines];
  /** What changes at the end of the path (the mountains' preview). */
  result: TwoLines;
  /** A note on the BAFA subsidy for this path. */
  bafaNote?: string;
}

export type ServiceExtra =
  | ({ kind: "text" } & TextBlock)
  | { kind: "research"; title: string; points: readonly TextBlock[]; source?: string };

export interface Service {
  id: ServiceId;
  title: string;
  /** Hover preview: a line, then the plain terms. */
  preview: TwoLines;
  about: string;
  /** Further blocks after "Worum es geht". */
  extra?: readonly ServiceExtra[];
  forWhom?: string;
  benefit?: string;
  /** A format shown first and highlighted. */
  highlight?: TextBlock;
  /** Title of `book`; defaults to the label "Was du buchen kannst". */
  bookTitle?: string;
  book: string;
  methods?: string;
}

export interface Road {
  id: RoadId;
  noticed: string;
  why: string;
  /** The connection in one sentence (bold; also the hover preview). */
  link: string;
  support: string;
}

export interface Results {
  title: string;
  preview: TwoLines;
  intro: string;
  emphasis: string;
  points: readonly string[];
}

export interface Process {
  title: string;
  intro: string;
  steps: readonly TwoLines[];
  formats: readonly { title: string; text: string; note?: string; highlight?: boolean }[];
  costs: string;
}

export interface About {
  name: string;
  role: string;
  intro: string;
  approach: string;
  approachTags: string;
  stations: readonly { years: string; text: string }[];
  education: string;
  more: string;
}

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  company: string;
}

export interface Bafa {
  title: string;
  text: string;
  /** Last day of the subsidy (ISO date, inclusive, German time). */
  enabledUntil: string;
  /** Added to FAQ answers marked `bafa`. */
  faqNote: string;
  /** On a subsidised path without its own `bafaNote`. */
  pathNote: string;
}

export interface FaqItem {
  question: string;
  answer: string;
  /** The subsidy note is added while it runs. */
  bafa?: boolean;
}

export interface Contact {
  preview: string;
  title: string;
  text: string;
  cta: string;
  email: string;
  phone: string;
  mailSubject: string;
  mailChallenge: string;
  newsletter: string;
}

/** `consulting`: the night map's copy, keyed by the ids of src/config/nightMap.ts. */
export interface Consulting {
  intro: ConsultingIntro;
  areas: readonly Area[];
  challenges: readonly Challenge[];
  services: readonly Service[];
  servicesIntro: string;
  roads: readonly Road[];
  results: Results;
  process: Process;
  about: About;
  /** At most one per TESTIMONIAL_HOMES entry (one firefly each); only with written consent. */
  testimonials: readonly Testimonial[];
  bafa: Bafa;
  faq: readonly FaqItem[];
  contact: Contact;
}

/** `uiLabels`: navigation, categories and block titles. */
export interface UiLabels {
  nav: {
    main: string;
    services: string;
    process: string;
    about: string;
    contact: string;
    contactShort: string;
    menu: string;
    closeMenu: string;
    sound: string;
  };
  footer: { label: string; faq: string; contact: string; imprint: string };
  map: { label: string; challenges: string; more: string; tapToOpen: string };
  path: {
    station: string;
    more: string;
    bafaLink: string;
    results: string;
    yourClearing: string;
    roads: string;
    sources: string;
  };
  categories: {
    challenge: string;
    service: string;
    road: string;
    results: string;
    process: string;
    about: string;
    testimonial: string;
    bafa: string;
    faq: string;
    contact: string;
    services: string;
  };
  blocks: {
    noticed: string;
    behind: string;
    support: string;
    about: string;
    forWhom: string;
    benefit: string;
    book: string;
    methods: string;
    roadNoticed: string;
    roadWhy: string;
    roadSupport: string;
    approach: string;
    stations: string;
    education: string;
    more: string;
    formats: string;
    costs: string;
    steps: string;
  };
  related: string;
  close: string;
  back: string;
}

export interface LegalSection {
  heading: string;
  /** Line breaks become `<br>`; e-mail addresses become links. */
  body: string;
  /** Set as an address (`<address>`). */
  address?: boolean;
  /** Quieter (placeholder or boilerplate text). */
  muted?: boolean;
}

/** `legalPage`: the imprint and any later legal page. */
export interface LegalPage {
  slug: string;
  title: string;
  metaTitle: string;
  sections: readonly LegalSection[];
}

/** Every document, as the CMS will deliver them. */
export interface SiteDocuments {
  site: SiteSettings;
  studio: Studio;
  projects: readonly Project[];
  consulting: Consulting;
  ui: UiLabels;
  legal: readonly LegalPage[];
}

/** What `getSiteContent()` returns: the documents plus values derived from them. */
export interface SiteContent extends SiteDocuments {
  /** The BAFA subsidy still runs (from `consulting.bafa.enabledUntil`). */
  bafaActive: boolean;
}
```

- [ ] **Step 3: Write the failing selector tests**

`src/content/selectors.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { PLACES } from "@/config/nightMap";
import { siteDocuments } from "@/content/data";
import { bafaActive, bookingHref, byId, firstSentence, placePreview } from "@/content/selectors";
import type { SiteContent } from "@/content/schema";

const content: SiteContent = { ...siteDocuments, bafaActive: true };
const place = (id: string) => PLACES.find((p) => p.id === id)!;

describe("byId", () => {
  it("finds an entry", () => {
    expect(byId([{ id: "a", n: 1 }, { id: "b", n: 2 }], "b").n).toBe(2);
  });
  it("throws with the missing id", () => {
    expect(() => byId([{ id: "a" }], "z" as "a")).toThrow(/"z"/);
  });
});

describe("firstSentence", () => {
  it("cuts after the first sentence", () => {
    expect(firstSentence("Eins. Zwei.")).toBe("Eins.");
  });
  it("keeps a text without a full stop", () => {
    expect(firstSentence("Ohne Punkt")).toBe("Ohne Punkt");
  });
});

describe("bafaActive", () => {
  const bafa = { enabledUntil: "2026-12-31" };
  it("runs through the last day, German time", () => {
    expect(bafaActive(bafa, new Date("2026-12-31T22:59:00Z"))).toBe(true); // 23:59 CET
  });
  it("ends at midnight German time", () => {
    expect(bafaActive(bafa, new Date("2026-12-31T23:00:00Z"))).toBe(false); // 00:00 CET
  });
});

describe("bookingHref", () => {
  const contact = { email: "a@b.de", mailSubject: "Kennenlerngespräch", mailChallenge: "Meine Herausforderung:" };
  it("encodes the subject", () => {
    expect(bookingHref(contact)).toBe("mailto:a@b.de?subject=Kennenlerngespr%C3%A4ch");
  });
  it("adds the challenge as the body", () => {
    expect(bookingHref(contact, "„Ohne mich“ & mehr")).toBe(
      `mailto:a@b.de?subject=Kennenlerngespr%C3%A4ch&body=${encodeURIComponent("Meine Herausforderung: „Ohne mich“ & mehr\n\n")}`,
    );
  });
});

describe("placePreview", () => {
  it("shows a challenge's two lines", () => {
    const owner = byId(content.consulting.challenges, "owner");
    expect(placePreview(place("clearing:owner"), content, null)).toEqual({ line: owner.line, detail: owner.detail });
  });
  it("shows a service's title and line", () => {
    const s = byId(content.consulting.services, "strategy");
    expect(placePreview(place("service:strategy"), content, null)).toEqual({ line: s.title, detail: s.preview.line });
  });
  it("shows the general results without an active path", () => {
    expect(placePreview(place("summit"), content, null)).toEqual(content.consulting.results.preview);
  });
  it("shows the active path's result", () => {
    expect(placePreview(place("summit"), content, "team")).toEqual(byId(content.consulting.challenges, "team").result);
  });
  it("shows contact, about and bafa", () => {
    expect(placePreview(place("goal"), content, null)).toEqual({
      line: content.consulting.contact.preview,
      detail: content.ui.nav.contact,
    });
    expect(placePreview(place("meadow"), content, null)).toEqual({
      line: content.consulting.about.name,
      detail: content.consulting.about.role,
    });
    expect(placePreview(place("lantern"), content, null)).toEqual({ line: content.consulting.bafa.title, detail: "" });
  });
  it("quotes a testimonial's first sentence", () => {
    expect(placePreview(place("testimonial:0"), content, null)).toEqual({
      line: `„${firstSentence(content.consulting.testimonials[0].quote)}“`,
      detail: content.ui.categories.testimonial,
    });
  });
  it("is empty for a testimonial without content", () => {
    expect(placePreview(place("testimonial:2"), content, null)).toEqual({ line: "„“", detail: content.ui.categories.testimonial });
  });
});
```

In this task, write the file **without** the `PLACES` / `siteDocuments` / `SiteContent` imports, the `content` and `place` constants, and the `placePreview` block: they need the seed data from Task 2, which adds them (Task 2 Step 1).

- [ ] **Step 4: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL, `Cannot find module '@/content/selectors'`.

- [ ] **Step 5: Write `src/content/selectors.ts`**

```ts
import type { ChallengeId, Place } from "@/config/nightMap";
import type { Bafa, Contact, SiteContent, TwoLines } from "@/content/schema";

/** The entry with this id; throws if the content lacks it (`validateContent` catches that at build). */
export function byId<T extends { id: string }>(list: readonly T[], id: T["id"]): T {
  const found = list.find((item) => item.id === id);
  if (!found) throw new Error(`Content is missing the entry "${id}".`);
  return found;
}

/** The first sentence of a text, e.g. a quote for its hover preview. */
export const firstSentence = (text: string) => text.match(/^.*?[.!?](\s|$)/)?.[0].trim() ?? text;

/** Whether the BAFA subsidy runs at `now`: through the whole last day, German time (CET in winter). */
export function bafaActive(bafa: Pick<Bafa, "enabledUntil">, now: Date) {
  const DAY = 24 * 60 * 60 * 1000;
  return now.getTime() < Date.parse(`${bafa.enabledUntil}T00:00:00+01:00`) + DAY;
}

/** The mail that stands in for the calendar until a booking tool is chosen. */
export function bookingHref(contact: Pick<Contact, "email" | "mailSubject" | "mailChallenge">, challenge?: string) {
  const subject = encodeURIComponent(contact.mailSubject);
  const body = challenge ? `&body=${encodeURIComponent(`${contact.mailChallenge} ${challenge}\n\n`)}` : "";
  return `mailto:${contact.email}?subject=${subject}${body}`;
}

/** The hover preview of a place on the night map: one or two lines. */
export function placePreview(place: Place, content: SiteContent, activePath: ChallengeId | null): TwoLines {
  const { consulting, ui } = content;
  const p = place.panel;
  switch (p.kind) {
    case "path": {
      const c = byId(consulting.challenges, p.id);
      return { line: c.line, detail: c.detail };
    }
    case "service": {
      const s = byId(consulting.services, p.id);
      return { line: s.title, detail: s.preview.line };
    }
    case "results":
      return activePath ? byId(consulting.challenges, activePath).result : consulting.results.preview;
    case "contact":
      return { line: consulting.contact.preview, detail: ui.nav.contact };
    case "about":
      return { line: consulting.about.name, detail: consulting.about.role };
    case "bafa":
      return { line: consulting.bafa.title, detail: "" };
    case "testimonial":
      return {
        line: `„${firstSentence(consulting.testimonials[p.index]?.quote ?? "")}“`,
        detail: ui.categories.testimonial,
      };
    default:
      return { line: "", detail: "" };
  }
}
```

Note: the end is midnight after the last day, CET (`2026-12-31T23:00:00Z`).

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test`
Expected: PASS for `byId`, `firstSentence`, `bafaActive`, `bookingHref`.

- [ ] **Step 7: Lint, typecheck, commit**

Run: `npm run lint && npm run typecheck`

```bash
git add package.json package-lock.json vitest.config.ts src/content/schema.ts src/content/selectors.ts src/content/selectors.test.ts
git commit -m "Add content document types, selectors and Vitest"
```

---

### Task 2: Seed data, validator, `getSiteContent()`

**Files:**
- Create: `src/content/data/{site,studio,projects,consulting,ui,legal,index}.ts`, `src/content/validate.ts`, `src/content/validate.test.ts`, `src/content/index.ts`
- Modify: `src/content/selectors.test.ts` (add the `placePreview` block and its imports, as written in Task 1 Step 3)

**Interfaces:**
- Consumes: types from Task 1.
- Produces: `siteDocuments: SiteDocuments` (from `@/content/data`), `validateContent(docs: SiteDocuments): string[]`, `getSiteContent(): Promise<SiteContent>`, `getLegalPage(slug: string): Promise<LegalPage>`.

- [ ] **Step 1: Write the failing tests**

Add the `placePreview` block and its imports/constants (`PLACES`, `siteDocuments`, `SiteContent`, `content`, `place`) to `src/content/selectors.test.ts`, exactly as shown in Task 1 Step 3.

`src/content/validate.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { TESTIMONIAL_HOMES } from "@/config/nightMap";
import { siteDocuments } from "@/content/data";
import { validateContent } from "@/content/validate";

describe("validateContent", () => {
  it("accepts the seed data", () => {
    expect(validateContent(siteDocuments)).toEqual([]);
  });
  it("names a missing challenge", () => {
    const docs = {
      ...siteDocuments,
      consulting: { ...siteDocuments.consulting, challenges: siteDocuments.consulting.challenges.filter((c) => c.id !== "owner") },
    };
    expect(validateContent(docs)).toContain('consulting.challenges: missing "owner"');
  });
  it("names a missing project", () => {
    const docs = { ...siteDocuments, projects: siteDocuments.projects.filter((p) => p.id !== "shop") };
    expect(validateContent(docs)).toContain('projects: missing "shop"');
  });
  it("needs stations on a path through two services", () => {
    const docs = {
      ...siteDocuments,
      consulting: {
        ...siteDocuments.consulting,
        challenges: siteDocuments.consulting.challenges.map((c) => (c.id === "team" ? { ...c, stations: undefined } : c)),
      },
    };
    expect(validateContent(docs)).toContain('consulting.challenges: "team" needs two stations');
  });
  it("allows no more testimonials than fireflies", () => {
    const extra = Array.from({ length: TESTIMONIAL_HOMES.length + 1 }, () => siteDocuments.consulting.testimonials[0]);
    const docs = { ...siteDocuments, consulting: { ...siteDocuments.consulting, testimonials: extra } };
    expect(validateContent(docs)).toContain(`consulting.testimonials: at most ${TESTIMONIAL_HOMES.length}`);
  });
  it("needs the imprint", () => {
    expect(validateContent({ ...siteDocuments, legal: [] })).toContain('legal: missing "imprint"');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test`
Expected: FAIL, `Cannot find module '@/content/data'`.

- [ ] **Step 3: Write the seed data**

Move every string verbatim from the old sources. Do not reword anything.

`src/content/data/site.ts`:

```ts
import type { SiteSettings } from "@/content/schema";

/** Placeholders for now; replace the address with the real one. */
export const site: SiteSettings = {
  name: "rsgnl",
  metadata: { title: "RSGNL Studio", description: "RSGNL Studio" },
  contactEmail: "hello@rsgnl.studio",
};
```

`src/content/data/studio.ts`:

```ts
import type { Studio } from "@/content/schema";

export const studio: Studio = {
  entry: {
    title: "Willkommen auf der Wiese",
    text: "Eine gemalte Welt, die auf deinen Cursor antwortet, mit Klang, der live entsteht, während du dich bewegst. Am schönsten mit Ton, am besten mit Kopfhörern.",
    loading: "Lädt",
    withSound: "Mit Ton eintreten",
    withoutSound: "Ohne Ton eintreten",
    or: "oder",
  },
  dayHint: {
    mouse: "Fahr über die Blumen. Jedes Beet ist ein Projekt, ein Klick öffnet es.",
    touch: "Tipp auf die Blumen. Jedes Beet ist ein Projekt, ein Tipp öffnet es.",
  },
  timeOfDay: { label: "Tageszeit", day: "Kunst", night: "Consulting" },
};
```

`src/content/data/projects.ts` (titles and teasers from `PROJECT_BEDS` in `src/config/flowers.ts`; media matches today's placeholder grid: one landscape, two portraits):

```ts
import type { Project, ProjectMedia } from "@/content/schema";

/** Placeholder media until the real project content exists. */
const PLACEHOLDER: readonly ProjectMedia[] = [{ aspect: "landscape" }, { aspect: "portrait" }, { aspect: "portrait" }];

export const projects: readonly Project[] = [
  { id: "about", title: "Vita & Über mich", teaser: "Platzhalter: eine kurze Zeile über Simone.", media: PLACEHOLDER },
  { id: "illustration", title: "Illustrationen & Digitalkunst", teaser: "Platzhalter: eine kurze Zeile zu diesem Portfolio.", media: PLACEHOLDER },
  { id: "painting", title: "Malerei", teaser: "Platzhalter: eine kurze Zeile zu diesem Portfolio.", media: PLACEHOLDER },
  { id: "writing", title: "Texte & Gegenständliches", teaser: "Platzhalter: eine kurze Zeile zu diesem Portfolio.", media: PLACEHOLDER },
  { id: "shop", title: "Shop", teaser: "Platzhalter: eine kurze Zeile zum Shop.", media: PLACEHOLDER },
];
```

`src/content/data/consulting.ts`: copy `src/content/consulting.ts` and reshape it, keeping every string identical:
- Header comment: keep the briefing note ("after the briefing … German, addressed with du …").
- `export const consulting: Consulting = { intro, areas, challenges, services, servicesIntro, roads, results, process, about, testimonials, bafa, faq, contact }`.
- `intro`: `INTRO` as is.
- `areas`: `[{ id: "team", title: "Du und dein Team" }, { id: "business", title: "Dein Betrieb" }, { id: "market", title: "Dein Markt" }]`.
- `challenges`: each `CHALLENGES` entry becomes `{ id: "<key>", ...entry }`, in the key order `owner, team, structures, scaling, visibility, ideation, clarify`.
- `services`: each `SERVICES` entry becomes `{ id: "<key>", ...entry }` in the key order `strategy, leadership, bizdev, innovation, brand, change`. In `change.extra`, the research block becomes `{ kind: "research", title: "Was die Forschung sagt", points: [...], source: "..." }` (drop `text: ""` and `collapsible`), and "Die gute Nachricht" becomes `{ kind: "text", title, text }`. Put `extra` right after `about` (render order is fixed by the panel, not by key order).
- `servicesIntro`: `UI.servicesIntro`.
- `roads`: each `ROAD_TEXTS` entry becomes `{ id: "<key>", ...entry }` in the same order.
- `results`, `process`, `about`: as `RESULTS`, `PROCESS`, `ABOUT`. In `process.formats`, the first entry keeps `note` and `highlight: true`.
- `testimonials`: `TESTIMONIALS` (keep the "Name folgt" comment).
- `bafa`: `{ title: BAFA_TEXT.title, text: BAFA_TEXT.text, enabledUntil: "2026-12-31", faqNote: FAQ_BAFA_NOTE, pathNote: UI.path.bafaDefault }`.
- `faq`: `FAQ`.
- `contact`: `CONTACT` (keep the "Placeholders" comments).

`src/content/data/ui.ts`: `export const ui: UiLabels = { ...UI from consulting.ts }` with these changes: drop `servicesIntro` and `path.bafaDefault` (moved); add `nav.main: "Hauptnavigation"` and `back: "Zurück"`.

`src/content/data/legal.ts` (from `src/app/imprint/page.tsx`, verbatim):

```ts
import type { LegalPage } from "@/content/schema";
import { site } from "./site";

/** Placeholder content. Replace every value with the real details before launch. */
export const legal: readonly LegalPage[] = [
  {
    slug: "imprint",
    title: "Impressum",
    metaTitle: "Impressum · RSGNL Studio",
    sections: [
      {
        heading: "Angaben gemäß § 5 DDG",
        body: "RSGNL Studio\nVorname Nachname\nMusterstraße 1\n12345 Musterstadt\nDeutschland",
        address: true,
      },
      { heading: "Kontakt", body: `Telefon: +49 000 0000000\nE-Mail: ${site.contactEmail}` },
      { heading: "Umsatzsteuer-ID", body: "Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: DE000000000" },
      { heading: "Verantwortlich für den Inhalt", body: "nach § 18 Abs. 2 MStV: Vorname Nachname, Anschrift wie oben" },
      {
        heading: "Haftung für Inhalte",
        body: "Platzhaltertext. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
        muted: true,
      },
      {
        heading: "Haftung für Links",
        body: "Platzhaltertext. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
        muted: true,
      },
      {
        heading: "Urheberrecht",
        body: "Platzhaltertext. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam.",
        muted: true,
      },
    ],
  },
];
```

`src/content/data/index.ts`:

```ts
import type { SiteDocuments } from "@/content/schema";
import { consulting } from "./consulting";
import { legal } from "./legal";
import { projects } from "./projects";
import { site } from "./site";
import { studio } from "./studio";
import { ui } from "./ui";

/** The site's content as local seed data, until it comes from Sanity. */
export const siteDocuments: SiteDocuments = { site, studio, projects, consulting, ui, legal };
```

- [ ] **Step 4: Write `src/content/validate.ts`**

```ts
import { PROJECT_BEDS } from "@/config/flowers";
import { AREAS, CITY_LIGHTS, CLEARINGS, PATHS, ROADS, TESTIMONIAL_HOMES } from "@/config/nightMap";
import type { SiteDocuments } from "@/content/schema";

const missing = (where: string, have: readonly { id: string }[], want: readonly { id: string }[]) =>
  want.filter((w) => !have.some((h) => h.id === w.id)).map((w) => `${where}: missing "${w.id}"`);

/**
 * What the content lacks for the layout, as readable problems (empty when
 * complete). Every place in the layout needs its copy; the CMS can't know
 * the layout, so this check stands between them.
 */
export function validateContent(docs: SiteDocuments): string[] {
  const { consulting } = docs;
  const problems = [
    ...missing("projects", docs.projects, PROJECT_BEDS),
    ...missing("consulting.areas", consulting.areas, AREAS),
    ...missing("consulting.challenges", consulting.challenges, CLEARINGS),
    ...missing("consulting.services", consulting.services, CITY_LIGHTS),
    ...missing("consulting.roads", consulting.roads, ROADS),
  ];
  for (const path of PATHS) {
    const challenge = consulting.challenges.find((c) => c.id === path.id);
    if (challenge && path.services && challenge.stations?.length !== 2) {
      problems.push(`consulting.challenges: "${path.id}" needs two stations`);
    }
  }
  if (consulting.testimonials.length > TESTIMONIAL_HOMES.length) {
    problems.push(`consulting.testimonials: at most ${TESTIMONIAL_HOMES.length}`);
  }
  if (!docs.legal.some((page) => page.slug === "imprint")) problems.push('legal: missing "imprint"');
  return problems;
}
```

- [ ] **Step 5: Write `src/content/index.ts`**

Read `node_modules/next/dist/docs/01-app/03-api-reference/directives/use-cache.md` and `.../04-functions/cacheLife.md` first to confirm the API.

```ts
import { cacheLife, cacheTag } from "next/cache";
import { siteDocuments } from "@/content/data";
import type { LegalPage, SiteContent } from "@/content/schema";
import { bafaActive } from "@/content/selectors";
import { validateContent } from "@/content/validate";

/**
 * The site's content: the only way copy gets into the site. Today it is
 * the local seed data (src/content/data); with Sanity this becomes a GROQ
 * query, revalidated by the `content` tag. Cached for a day at most, so the
 * BAFA subsidy ends on time. Incomplete content fails the build.
 */
export async function getSiteContent(): Promise<SiteContent> {
  "use cache";
  cacheLife("days");
  cacheTag("content");
  const problems = validateContent(siteDocuments);
  if (problems.length) throw new Error(`Incomplete content:\n${problems.join("\n")}`);
  return { ...siteDocuments, bafaActive: bafaActive(siteDocuments.consulting.bafa, new Date()) };
}

/** A legal page (e.g. the imprint) by its slug. */
export async function getLegalPage(slug: string): Promise<LegalPage> {
  const page = (await getSiteContent()).legal.find((p) => p.slug === slug);
  if (!page) throw new Error(`No legal page "${slug}".`);
  return page;
}
```

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: PASS (all selector and validator tests).

- [ ] **Step 7: Lint, typecheck, commit**

Run: `npm run lint && npm run typecheck`

```bash
git add src/content
git commit -m "Add seed content, its validator and getSiteContent"
```

---

### Task 3: Provider, store bridge, canvas decoupling, navigation config

**Files:**
- Create: `src/content/ContentProvider.tsx`, `src/config/navigation.ts`
- Modify: `src/store/scene.ts`, `src/app/layout.tsx`, `src/components/canvas/scene/NightMap.tsx`, `src/components/canvas/painterly/nightMap.ts`, `src/config/nightMap.ts`, `src/config/site.ts` (delete), every importer of `@/config/site`

**Interfaces:**
- Consumes: `getSiteContent`, `SiteContent`.
- Produces: `ContentProvider({ content, children })`, `useContent(): SiteContent`; store fields `testimonialCount: number`, `bafaActive: boolean`, action `setContentFlags(flags: { testimonialCount: number; bafaActive: boolean })`, export `openPanel(panel: NightPanel): void`; `NIGHT_SECTIONS`, `IMPRINT_HREF`, `PAGE_IN`, `PAGE_OUT` from `@/config/navigation`.

- [ ] **Step 1: Store fields and `openPanel`**

In `src/store/scene.ts` add to `SceneState` (after `placeScreen`):

```ts
  /** How many testimonials exist (fireflies beyond it stay dark). Written by ContentProvider. */
  testimonialCount: number;
  /** The BAFA subsidy runs (the lantern shows). Written by ContentProvider. */
  bafaActive: boolean;
```

and the action:

```ts
  setContentFlags: (flags: { testimonialCount: number; bafaActive: boolean }) => void;
```

Initial values `testimonialCount: 0, bafaActive: false`; implementation `setContentFlags: (flags) => set(flags)`. Below the store add:

```ts
/** Opens a night panel (or another one); the map follows. */
export const openPanel = (panel: NightPanel) => useSceneStore.getState().setPanel(panel);
```

- [ ] **Step 2: `src/content/ContentProvider.tsx`**

```tsx
"use client";

import { createContext, type ReactNode, use, useLayoutEffect } from "react";
import type { SiteContent } from "@/content/schema";
import { useSceneStore } from "@/store/scene";

const ContentContext = createContext<SiteContent | null>(null);

/**
 * Hands the site's content (fetched on the server by `getSiteContent`) to
 * client components, and the few values the canvas needs to the store
 * (the canvas never reads content). Mounted once in the root layout.
 */
export function ContentProvider({ content, children }: { content: SiteContent; children: ReactNode }) {
  useLayoutEffect(() => {
    useSceneStore.getState().setContentFlags({
      testimonialCount: content.consulting.testimonials.length,
      bafaActive: content.bafaActive,
    });
  }, [content]);
  return <ContentContext value={content}>{children}</ContentContext>;
}

/** The site's content, in a client component. */
export function useContent(): SiteContent {
  const content = use(ContentContext);
  if (!content) throw new Error("useContent needs a ContentProvider.");
  return content;
}
```

- [ ] **Step 3: Root layout**

`src/app/layout.tsx` becomes async, fetches content, takes metadata from it, and wraps the body's children:

```tsx
import type { Metadata } from "next";
import { SceneCanvasLoader } from "@/components/canvas/SceneCanvasLoader";
import { CursorDot } from "@/components/cursor/CursorDot";
import { SiteBrand } from "@/components/nav/SiteBrand";
import { SiteFooter } from "@/components/nav/SiteFooter";
import { getSiteContent } from "@/content";
import { ContentProvider } from "@/content/ContentProvider";
import { calendas } from "@/fonts/calendas";
import { dmSans } from "@/fonts/dmSans";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getSiteContent();
  return { title: site.metadata.title, description: site.metadata.description };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const content = await getSiteContent();
  return (
    <html lang="de" className={`${calendas.variable} ${dmSans.variable}`}>
      <body className="bg-background font-sans text-foreground antialiased">
        <ContentProvider content={content}>
          {/* Persistent 3D background; survives route changes. */}
          <SceneCanvasLoader />
          <main className="relative z-10">{children}</main>
          {/* The wordmark and the footer, the same on every page. */}
          <SiteBrand />
          <SiteFooter />
          {/* The mouse cursor, a dot, on every page. */}
          <CursorDot />
        </ContentProvider>
      </body>
    </html>
  );
}
```

(Import paths of `CursorDot`, `SiteBrand`, `SiteFooter` change in Task 5.)

- [ ] **Step 4: Canvas reads flags from the store**

`src/components/canvas/scene/NightMap.tsx`: remove `import { TESTIMONIALS } from "@/content/consulting";`; in the `useFrame` destructuring add `testimonialCount, bafaActive`; pass `bafaActive` to `updatePlaceWorld(sharedUniforms.uTime.value, activePath, bafaActive)`; replace `place.panel.index < TESTIMONIALS.length` with `place.panel.index < testimonialCount`.

`src/components/canvas/painterly/nightMap.ts`: remove `BAFA_ENABLED` from the import; change the signature to `updatePlaceWorld(time: number, activePath: ChallengeId | null, bafaActive: boolean)` and `lantern = bafaActive && !!path?.bafa && path.stations.length > 2;`. Update its doc comment to mention `bafaActive` (from the store).

`src/config/nightMap.ts`: delete `BAFA_ENABLED` and its comment.

- [ ] **Step 5: `src/config/navigation.ts`, delete `src/config/site.ts`**

```ts
import type { NightPanel } from "@/config/nightMap";
import type { UiLabels } from "@/content/schema";

/** The imprint page. */
export const IMPRINT_HREF = "/imprint";

/**
 * View transition types for links between the home page and a sub-page
 * (`transitionTypes` on `<Link>`). The sub-page slides in from the right
 * over the home page like the project overlay, and slides back out; the
 * animations live in `globals.css`.
 */
export const PAGE_IN = "page-in";
export const PAGE_OUT = "page-out";

/**
 * The consulting site's sections, each opening the night panel: in the top
 * navigation from lg up, the footer from md to lg, the mobile menu below md.
 * Labels are `ui.nav[key]`.
 */
export const NIGHT_SECTIONS = [
  { key: "services", panel: { kind: "services" } },
  { key: "process", panel: { kind: "process" } },
  { key: "about", panel: { kind: "about" } },
] as const satisfies readonly { key: keyof UiLabels["nav"]; panel: NightPanel }[];
```

`git rm src/config/site.ts`. In `SiteBrand`, `SiteFooter`, `src/app/imprint/page.tsx`, switch `PAGE_IN`/`PAGE_OUT`/`IMPRINT_HREF` imports to `@/config/navigation`; replace `SITE_NAME` with `useContent().site.name` (SiteBrand) and `CONTACT_EMAIL` with `useContent().site.contactEmail` (SiteFooter) or `(await getSiteContent()).site.contactEmail` (imprint, made `async`).

- [ ] **Step 6: Verify**

Run: `npm test && npm run lint && npm run typecheck`
Expected: all pass. `grep -rn "@/content" src/components/canvas` prints nothing.

- [ ] **Step 7: Commit**

```bash
git add -A src
git commit -m "Provide content from the root layout; the canvas reads its flags from the store"
```

---

### Task 4: Shared UI primitives

**Files:**
- Create: `src/hooks/useSceneTone.ts`, `src/components/ui/{Icon,TextLink,PreviewCard,BottomHint,Disclosure,Typography,RichText}.tsx`

**Interfaces:**
- Produces (exact):
  - `useSceneTone(): { night: boolean; duration: number; glass: string; menu: string; style: CSSProperties }`
  - `Icon({ icon, size?: "sm" | "md", className? })`
  - `textLinkClass(variant: "underline" | "quiet" | "subtle")`, `TextLink(props: LinkProps & AnchorProps & { variant? })`, `TextButton(props: ButtonHTMLAttributes & { variant? })`
  - `previewSurface(tone: "day" | "dusk" | "night" | "night-strong"): string`, `PreviewCard({ tone, className?, children, ...div props })`
  - `BottomHint({ shown, className?, children })`
  - `Disclosure({ summary, variant: "faq" | "more", className?, children })`
  - `Eyebrow`, `Heading({ as?: "h1" | "h2" | "h3", size: "display" | "title" | "heading" | "lead", italic?, id?, className?, children })`, `Intro({ text?, detail? })`, `Block({ title, text?, children? })`, `Highlight({ title, children })`
  - `RichText({ text })`

- [ ] **Step 1: `src/hooks/useSceneTone.ts`**

```ts
"use client";

import type { CSSProperties } from "react";
import { DAY_NIGHT_DURATION, DAY_NIGHT_DURATION_REDUCED } from "@/config/scene";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useSceneStore } from "@/store/scene";

/**
 * The colors of the chrome over the scene, crossing over with the
 * Day/Night switch: `glass` for the frosted pill and round buttons, `menu`
 * for the mobile menu's sheet, and `style`, the crossover's duration
 * (shorter with reduced motion), for the element that transitions them.
 */
export function useSceneTone() {
  const night = useSceneStore((s) => s.timeOfDay === "night");
  const reducedMotion = usePrefersReducedMotion();
  const duration = reducedMotion ? DAY_NIGHT_DURATION_REDUCED : DAY_NIGHT_DURATION;
  return {
    night,
    duration,
    glass: night ? "bg-on-day/30 text-on-night" : "bg-on-night/30 text-on-day",
    menu: night ? "bg-panel-night/90 text-on-night" : "bg-on-night/90 text-on-day",
    style: { transitionDuration: `${duration}s` } satisfies CSSProperties,
  };
}
```

- [ ] **Step 2: `src/components/ui/Icon.tsx`**

```tsx
import type { LucideIcon } from "lucide-react";

const SIZES = { sm: "size-4", md: "size-[1.125rem]" } as const;

/** A lucide icon at the site's sizes and stroke, hidden from screen readers. `className` adds placement and state only. */
export function Icon({ icon: Glyph, size = "md", className = "" }: { icon: LucideIcon; size?: keyof typeof SIZES; className?: string }) {
  return <Glyph aria-hidden strokeWidth={1.5} className={`${SIZES[size]} ${className}`} />;
}
```

- [ ] **Step 3: `src/components/ui/TextLink.tsx`**

```tsx
import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

/**
 * How a link set as text looks.
 * - `underline`: in running text and panels; the underline darkens on hover.
 * - `quiet`: small links over the scene (the footer); full strength on hover.
 * - `subtle`: a quiet way back (the imprint's "Zurück").
 */
export type TextLinkVariant = "underline" | "quiet" | "subtle";

const BASE = "cursor-pointer focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-current";
const VARIANTS: Record<TextLinkVariant, string> = {
  underline:
    "underline decoration-current/30 underline-offset-4 transition-[text-decoration-color] duration-700 ease-smooth hover:decoration-current",
  quiet: "opacity-60 transition-opacity duration-700 ease-smooth hover:opacity-100",
  subtle: "opacity-55 transition-opacity duration-700 ease-smooth hover:opacity-80",
};

export const textLinkClass = (variant: TextLinkVariant = "underline") => `${BASE} ${VARIANTS[variant]}`;

/** A text link (`next/link`; also for `mailto:` and `tel:`). `className` adds placement and state only. */
export function TextLink({ variant, className = "", ...props }: ComponentProps<typeof Link> & { variant?: TextLinkVariant }) {
  return <Link className={`${textLinkClass(variant)} ${className}`} {...props} />;
}

/** A button set as a text link (e.g. opening a panel). */
export function TextButton({
  variant,
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: TextLinkVariant }) {
  return <button type={type} className={`${textLinkClass(variant)} ${className}`} {...props} />;
}
```

- [ ] **Step 4: `src/components/ui/PreviewCard.tsx`**

```tsx
import type { HTMLAttributes } from "react";

/**
 * The frosted card of a preview (a hovered bed's label, a map place's
 * preview, the touch card). Tones: `day` over the day, `dusk` the day's
 * label by night, `night` over the map, `night-strong` the touch card.
 */
export type PreviewTone = "day" | "dusk" | "night" | "night-strong";

const TONES: Record<PreviewTone, string> = {
  day: "bg-on-night/75 text-on-day",
  dusk: "bg-on-day/75 text-on-night",
  night: "bg-panel-night/75 text-on-night",
  "night-strong": "bg-panel-night/90 text-on-night",
};

export const previewSurface = (tone: PreviewTone) =>
  `rounded-2xl border border-current/10 px-5 py-4 backdrop-blur-md ${TONES[tone]}`;

/** A preview card; `className` adds placement, width and transitions. */
export function PreviewCard({ tone, className = "", ...props }: HTMLAttributes<HTMLDivElement> & { tone: PreviewTone }) {
  return <div className={`${previewSurface(tone)} ${className}`} {...props} />;
}
```

- [ ] **Step 5: `src/components/ui/BottomHint.tsx`**

```tsx
import type { ReactNode } from "react";

/**
 * The line at the bottom centre telling what to do (by day the beds, by
 * night the clearings). It rises and fades in while `shown`. `className`
 * sets its color.
 */
export function BottomHint({ shown, className = "", children }: { shown: boolean; className?: string; children: ReactNode }) {
  return (
    <p
      aria-hidden={!shown}
      className={`pointer-events-none fixed bottom-24 left-1/2 z-20 w-max max-w-[calc(100vw-2*var(--spacing-gutter))] -translate-x-1/2 text-center font-display text-body italic transition-[opacity,translate] duration-1500 ease-reveal md:bottom-edge ${className} ${
        shown ? "translate-y-0 opacity-80" : "translate-y-2 opacity-0"
      }`}
    >
      {children}
    </p>
  );
}
```

- [ ] **Step 6: `src/components/ui/Disclosure.tsx`**

```tsx
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

/**
 * A `<details>` that opens softly.
 * - `faq`: a question with a chevron, opening its answer (`faq-item` in globals.css).
 * - `more`: a quiet "read more" line (e.g. the research behind a service).
 * Named groups: the dialog around a panel is a `group` and open too.
 */
export function Disclosure({
  summary,
  variant,
  className = "",
  children,
}: {
  summary: ReactNode;
  variant: "faq" | "more";
  className?: string;
  children: ReactNode;
}) {
  if (variant === "more") {
    return (
      <details className={`group/details ${className}`}>
        <summary className="cursor-pointer text-body opacity-60 transition-opacity duration-700 ease-smooth hover:opacity-90">
          {summary}
        </summary>
        {children}
      </details>
    );
  }
  return (
    <details className={`group/faq faq-item border-b border-current/10 pb-3 ${className}`}>
      <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-2 text-body transition-opacity duration-700 ease-smooth hover:opacity-80 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-current [&::-webkit-details-marker]:hidden">
        {summary}
        <Icon
          icon={ChevronDown}
          className="mt-[0.2em] shrink-0 opacity-70 transition-transform duration-700 ease-reveal group-open/faq:rotate-180"
        />
      </summary>
      {children}
    </details>
  );
}
```

- [ ] **Step 7: `src/components/ui/RichText.tsx`**

```tsx
import { Fragment } from "react";

const EMAIL = /([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/;

/**
 * A long text from the content, inline (inside a `<p>` or `<address>`):
 * line breaks become `<br>`, e-mail addresses links. The one place that
 * turns content text into markup, so it can render Portable Text later.
 */
export function RichText({ text }: { text: string }) {
  return text.split("\n").map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {line.split(EMAIL).map((part, j) =>
        j % 2 === 1 ? (
          <a key={j} href={`mailto:${part}`} className="underline underline-offset-4">
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </Fragment>
  ));
}
```

(The imprint's mail link is `underline underline-offset-4` today, so this keeps it identical.)

- [ ] **Step 8: `src/components/ui/Typography.tsx`**

Generalised from `night/PanelParts.tsx` (same classes):

```tsx
import type { ReactNode } from "react";
import { RichText } from "@/components/ui/RichText";

/** The small line above a heading, e.g. "Leistung". */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="font-display text-body italic opacity-60">{children}</p>;
}

const HEADING_SIZES = {
  /** A page's title (the imprint). */
  display: "text-display",
  /** A panel's or overlay's title: a heading on small screens, display from md. */
  title: "text-heading md:text-display",
  heading: "text-heading",
  lead: "text-lead",
} as const;

/** A heading in the display face. `className` adds placement and measure only. */
export function Heading({
  as: Tag = "h2",
  size,
  italic,
  id,
  className = "",
  children,
}: {
  as?: "h1" | "h2" | "h3";
  size: keyof typeof HEADING_SIZES;
  italic?: boolean;
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag id={id} className={`font-display ${HEADING_SIZES[size]} ${italic ? "italic" : ""} ${className}`}>
      {children}
    </Tag>
  );
}

/** Two to three sentences under a heading; `detail` is the plain second line, smaller and quieter. */
export function Intro({ text, detail }: { text?: string | null; detail?: string }) {
  return (
    <div className="mt-5 max-w-prose">
      {text && (
        <p className="text-body opacity-85">
          <RichText text={text} />
        </p>
      )}
      {detail && <p className="mt-1 text-body italic opacity-55">{detail}</p>}
    </div>
  );
}

/** A content block with its subheading: `text` from the content, or `children` for lists. */
export function Block({ title, text, children }: { title: string; text?: string; children?: ReactNode }) {
  return (
    <section className="mt-10 max-w-prose">
      <h3 className="font-display text-lead">{title}</h3>
      <div className="mt-3 text-body opacity-90">{text ? <RichText text={text} /> : children}</div>
    </section>
  );
}

/** A highlighted passage (e.g. an entry format, or the subsidy): set apart by its title's color, not by a box. */
export function Highlight({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="mt-10 max-w-prose">
      <p className="font-display text-lead italic text-city-light">{title}</p>
      <div className="mt-1 text-body opacity-90">{children}</div>
    </aside>
  );
}
```

- [ ] **Step 9: Verify and commit**

Run: `npm test && npm run lint && npm run typecheck`
Expected: pass (the primitives are unused until Task 5; that is fine for lint).

```bash
git add src/hooks/useSceneTone.ts src/components/ui
git commit -m "Add shared UI primitives: Icon, TextLink, PreviewCard, BottomHint, Disclosure, Typography, RichText"
```

---

### Task 5: Site chrome (layout and nav)

**Files:**
- Move: `components/nav/SiteBrand.tsx`, `components/nav/SiteFooter.tsx`, `components/cursor/CursorDot.tsx` → `components/layout/` (`git mv`)
- Modify: those three, `components/nav/{TopNav,MobileMenu,NavItems,NightNavLinks,DayNightSwitch,SoundToggle}.tsx`, `src/app/layout.tsx` imports

**Interfaces:**
- Consumes: `useContent`, `useSceneTone`, `Icon`, `TextLink`, `TextButton`, `NIGHT_SECTIONS`, `openPanel`, `IMPRINT_HREF`, `PAGE_IN`, `PAGE_OUT`.

- [ ] **Step 1: Move files, fix imports**

```bash
mkdir -p src/components/layout
git mv src/components/nav/SiteBrand.tsx src/components/layout/SiteBrand.tsx
git mv src/components/nav/SiteFooter.tsx src/components/layout/SiteFooter.tsx
git mv src/components/cursor/CursorDot.tsx src/components/layout/CursorDot.tsx
```

Update `src/app/layout.tsx` imports to `@/components/layout/...`.

- [ ] **Step 2: `useSceneTone` in TopNav, SoundToggle, MobileMenu, SiteBrand**

- `TopNav`: replace the `timeOfDay`/`reducedMotion`/`duration` lines with `const tone = useSceneTone();`; the pill's ternary becomes `${tone.glass}`, `style={tone.style}`; `aria-label={useContent().ui.nav.main}`.
- `SoundToggle`: same (`tone.glass`, `tone.style`); its icon becomes `<Icon icon={enabled ? Volume2 : VolumeX} className="opacity-55 transition-opacity duration-700 ease-smooth group-hover:opacity-80 group-aria-pressed:opacity-100" />`; `UI.nav.sound` → `ui.nav.sound`.
- `MobileMenu`: `const tone = useSceneTone();` replaces `timeOfDay`, `reducedMotion`, `duration`; `night` → `tone.night`; burger button class `tone.glass`, `style={tone.style}`; sheet ternary `night ? "bg-panel-night/90 text-on-night" : "bg-on-night/90 text-on-day"` → `tone.menu`; `aria-label="Hauptnavigation"` → `ui.nav.main`; icons through `Icon`; `NIGHT_LINKS.map` → `NIGHT_SECTIONS.map((s) => <Button key={s.key} … onClick={() => openPanel(s.panel)}>{ui.nav[s.key]}</Button>)`; import `openPanel` from `@/store/scene`.
- `SiteBrand`: `const tone = useSceneTone();` gives `duration`; keep `onNight` logic (it also checks `onMap`); `SITE_NAME` → `useContent().site.name`.

- [ ] **Step 3: NightNavLinks, DayNightSwitch, NavItems**

- `NightNavLinks.tsx`: delete `NIGHT_LINKS` and the local `open`; map `NIGHT_SECTIONS` with labels `ui.nav[s.key]` and `openPanel`. `NightCta`: icon via `<Icon icon={CalendarDays} className="hidden sm:block" />`; labels from `ui.nav`.
- `DayNightSwitch.tsx`: `ITEMS` keeps only icons (`{ day: Sun, night: Moon }`); labels `studio.timeOfDay[time]`, group label `studio.timeOfDay.label`; icon `<Icon icon={ITEMS[time]} size="sm" className="hidden sm:block" />`.
- `NavItems.tsx`: unchanged except imports if any moved.

- [ ] **Step 4: SiteFooter**

- Delete `link` and `SECTIONS`. Links: `<TextLink variant="quiet" className="pointer-events-auto" …>`; buttons: `<TextButton variant="quiet" className="pointer-events-auto hidden md:block lg:hidden" onClick={() => openPanel(s.panel)}>{ui.nav[s.key]}</TextButton>` for `NIGHT_SECTIONS`, and `TextButton variant="quiet" className="pointer-events-auto"` for FAQ and contact.
- The day set's mail link: `<TextLink variant="quiet" className="pointer-events-auto" href={`mailto:${site.contactEmail}`}>`.
- Labels from `ui.footer`. `openPanel` from `@/store/scene`.

Check the rendered class list of one footer link equals the old `link` string (same tokens, order may differ).

- [ ] **Step 5: Verify and commit**

Run: `npm test && npm run lint && npm run typecheck`
Run: `grep -rn "content/consulting\|content/studio\|config/site" src/components/nav src/components/layout` → nothing.

```bash
git add -A src
git commit -m "Move the site chrome to layout/, read its copy from content, share its tone"
```

---

### Task 6: Day and overlays

**Files:**
- Move: `components/sections/SlidePanel.tsx`, `EntryScreen.tsx` → `components/overlay/`; `DayHint`, `FlowerHoverLabel`, `ProjectOverlay`, `HomeScroll`, `Section` → `components/day/` (`git mv`; then `rmdir src/components/sections`)
- Modify: those files, `src/config/flowers.ts`, `src/app/page.tsx`, `src/components/night/NightPanel.tsx` (SlidePanel import)

- [ ] **Step 1: Move files, fix imports**

```bash
mkdir -p src/components/overlay src/components/day
git mv src/components/sections/SlidePanel.tsx src/components/overlay/SlidePanel.tsx
git mv src/components/sections/EntryScreen.tsx src/components/overlay/EntryScreen.tsx
for f in DayHint FlowerHoverLabel ProjectOverlay HomeScroll Section; do git mv src/components/sections/$f.tsx src/components/day/$f.tsx; done
```

Update imports in `src/app/page.tsx`, `NightPanel.tsx` (`@/components/overlay/SlidePanel`) and `ProjectOverlay.tsx` (`./SlidePanel` → `@/components/overlay/SlidePanel`).

- [ ] **Step 2: `config/flowers.ts` keeps layout only**

Remove `title` and `teaser` from every `PROJECT_BEDS` entry and from its `satisfies` type (`readonly FlowerBed[]`). Rewrite its doc comment: "The beds that lead somewhere … their copy (title, teaser, media) is the `project` document with the same id (src/content)."

- [ ] **Step 3: SlidePanel**

`closeLabel` becomes required (drop the `"Schließen"` default); its close icon becomes `<Icon icon={X} />`. Both callers pass `closeLabel={ui.close}`.

- [ ] **Step 4: DayHint and FlowerHoverLabel**

- `DayHint`: return `<BottomHint shown={shown} className="text-foreground">…spans with studio.dayHint.mouse / .touch…</BottomHint>`.
- `FlowerHoverLabel`: map `PROJECT_BEDS` as before, take `const project = byId(projects, bed.id)`; card becomes `<PreviewCard key={bed.id} tone={timeOfDay === "night" ? "dusk" : "day"} className={`col-start-1 row-start-1 w-max max-w-72 self-start transition-[opacity,translate] duration-700 ease-reveal ${bed.id === hovered ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}>` with `project.title` / `project.teaser`.

- [ ] **Step 5: ProjectOverlay**

```tsx
"use client";

import { useState } from "react";
import { SlidePanel } from "@/components/overlay/SlidePanel";
import { Heading } from "@/components/ui/Typography";
import { useContent } from "@/content/ContentProvider";
import type { ProjectMedia } from "@/content/schema";
import { useSceneStore } from "@/store/scene";

const ASPECT: Record<ProjectMedia["aspect"], string> = {
  landscape: "aspect-video md:col-span-2",
  portrait: "aspect-4/5",
};

/**
 * The project a flower bed opens (`openBed`, set by the canvas on a click or
 * tap), in the day's slide panel (`SlidePanel`): over two thirds of the
 * screen on desktop, a sheet on mobile. Its copy is the `project` document
 * with the bed's id. Keeps the last project rendered while the panel slides out.
 */
export function ProjectOverlay() {
  const { projects, ui } = useContent();
  const openBed = useSceneStore((s) => s.openBed);

  const [shown, setShown] = useState(openBed);
  if (openBed && openBed !== shown) setShown(openBed);
  const project = projects.find((p) => p.id === shown);

  return (
    <SlidePanel
      open={openBed !== null}
      onClose={() => useSceneStore.getState().setOpenBed(null)}
      labelledBy="project-title"
      tone="day"
      closeLabel={ui.close}
    >
      {project && (
        <article className="px-gutter pt-24 pb-section md:px-edge">
          <Heading id="project-title" size="title" italic>
            {project.title}
          </Heading>
          <p className="mt-4 max-w-prose text-body opacity-70">{project.teaser}</p>
          {/* Placeholders until the real media exist. */}
          <div className="mt-12 grid gap-gutter md:grid-cols-2">
            {project.media.map((m, i) => (
              <div key={i} className={`bg-current/5 ${ASPECT[m.aspect]}`} />
            ))}
          </div>
        </article>
      )}
    </SlidePanel>
  );
}
```

Layout check: before, the two portraits were side by side only from md (`md:grid-cols-2`) and the landscape full width; this grid gives the same at every width (below md all stack in one column, as before).

- [ ] **Step 6: EntryScreen**

Replace the six hardcoded strings with `studio.entry.title`, `.text`, `.loading`, `.withSound`, `.or`, `.withoutSound`; icons via `Icon` (the "without" icon keeps `className="opacity-75"`).

- [ ] **Step 7: Verify and commit**

Run: `npm test && npm run lint && npm run typecheck`

```bash
git add -A src
git commit -m "Group the day and the overlays; projects read from content"
```

---

### Task 7: Night map and panels

**Files:**
- Create: `src/components/night/panels/{PanelEnd,ServicePanel,ServicesPanel,ResultsPanel,ProcessPanel,AboutPanel,TestimonialPanel,BafaPanel,FaqPanel,ContactPanel,PanelContent}.tsx`
- Move: `src/components/night/PathStory.tsx` → `src/components/night/panels/PathStory.tsx`
- Delete: `src/components/night/PanelContent.tsx`, `src/components/night/PanelParts.tsx`
- Modify: `MapPlaces.tsx`, `NightIntro.tsx`, `NightPanel.tsx`

**Interfaces:**
- Consumes: `useContent`, `byId`, `placePreview`, `bookingHref`, typography, `Disclosure`, `TextButton`, `TextLink`, `Icon`, `PreviewCard`/`previewSurface`, `BottomHint`, `openPanel`.
- Produces: `PanelContent({ panel }: { panel: NightPanel })` from `@/components/night/panels/PanelContent`; `PANEL_TITLE_ID = "night-panel-title"` exported from `panels/PanelEnd.tsx`.

- [ ] **Step 1: `panels/PanelEnd.tsx`** (shared panel pieces: the title id, `PanelLink`, `Cta`, `PanelEnd`)

```tsx
"use client";

import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { TextButton } from "@/components/ui/TextLink";
import { Eyebrow } from "@/components/ui/Typography";
import type { NightPanel } from "@/config/nightMap";
import { useContent } from "@/content/ContentProvider";
import { bookingHref } from "@/content/selectors";
import { openPanel } from "@/store/scene";

/** id of the element that names the night panel (its heading). */
export const PANEL_TITLE_ID = "night-panel-title";

/** A link to another panel, e.g. from a service to its challenge. */
export function PanelLink({ to, children }: { to: NightPanel; children: ReactNode }) {
  return (
    <TextButton onClick={() => openPanel(to)} className="group inline-flex items-center gap-2 text-left text-body">
      {children}
      <Icon icon={ArrowRight} size="sm" className="shrink-0 transition-transform duration-700 ease-smooth group-hover:translate-x-0.5" />
    </TextButton>
  );
}

/** "Termin vereinbaren": opens the contact panel; inside it (`book`), it books directly. */
export function Cta({ book, challenge }: { book?: boolean; challenge?: string }) {
  const { contact } = useContent().consulting;
  if (book) {
    return (
      <ButtonLink variant="primary" href={bookingHref(contact, challenge)}>
        <span>{contact.cta}</span>
        <Icon icon={ArrowUpRight} />
      </ButtonLink>
    );
  }
  return (
    <Button variant="primary" onClick={() => openPanel({ kind: "contact" })}>
      <span>{contact.cta}</span>
      <Icon icon={ArrowRight} />
    </Button>
  );
}

/** The end of every panel: the action, then one or two related panels. */
export function PanelEnd({
  related,
  book,
  challenge,
}: {
  related?: { to: NightPanel; label: string }[];
  book?: boolean;
  challenge?: string;
}) {
  const { ui } = useContent();
  return (
    <footer className="mt-14">
      <Cta book={book} challenge={challenge} />
      {related && related.length > 0 && (
        <nav aria-label={ui.related} className="mt-12">
          <Eyebrow>{ui.related}</Eyebrow>
          <ul className="mt-3 grid gap-2">
            {related.map((r) => (
              <li key={r.label}>
                <PanelLink to={r.to}>{r.label}</PanelLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </footer>
  );
}
```

The old `PanelLink` had `transition-[text-decoration-color] … hover:decoration-current` and `underline decoration-current/30 underline-offset-4`; `TextButton` (`underline` variant) carries exactly those.

- [ ] **Step 2: One file per panel**

Move each function from the old `PanelContent.tsx` into its own file under `panels/`, with these mechanical replacements (same JSX structure and classes otherwise):
- `const c = useContent();` at the top; constants per the mapping table.
- `<Category>` → `<Eyebrow>`.
- `<Heading>{x}</Heading>` (panel title) → `<Heading id={PANEL_TITLE_ID} size="title" className="mt-3 max-w-[22ch]">{x}</Heading>`.
- `<Intro detail={d}>{t}</Intro>` → `<Intro text={t} detail={d} />`.
- `<Block title={T}>{stringValue}</Block>` → `<Block title={T} text={stringValue} />`; blocks with JSX children keep `children`.
- `BAFA_ENABLED` → `c.bafaActive`; `FAQ_BAFA_NOTE` → `c.consulting.bafa.faqNote`.
- `ServicePanel`: `s.extra?.map` switches on `block.kind`: `"research"` → `<Disclosure key={block.title} variant="more" className="mt-10 max-w-prose" summary={block.title}>` with the old `<ul>` of points and the sources line; `"text"` → `<Block key={block.title} title={block.title} text={block.text} />`. The road list reads `byId(c.consulting.roads, r.id)`. Related: `pathsThrough(id).slice(0, 2).map((p) => ({ to: { kind: "path" as const, id: p.id }, label: byId(c.consulting.challenges, p.id).line }))`.
- `FaqPanel`: each item → `<Disclosure key={item.question} variant="faq" summary={item.question}><p className="pr-12 pb-2 text-body opacity-80">{item.answer}{item.bafa && c.bafaActive && ` ${c.consulting.bafa.faqNote}`}</p></Disclosure>`.
- `ContactPanel`: the two mail/phone `<a>` → `<TextLink href=…>` (default `underline` variant; the old classes `underline decoration-current/30 underline-offset-4 hover:decoration-current` are a subset of it).
- `TestimonialPanel`: `id="night-panel-title"` → `id={PANEL_TITLE_ID}`.
- `ServicesPanel`: iterate `CITY_LIGHTS` (order of the map) and read `byId(c.consulting.services, light.id)`; intro `c.consulting.servicesIntro`.

`panels/PanelContent.tsx` holds only the `switch` (same as before), importing the panel files.

- [ ] **Step 3: PathStory**

`git mv src/components/night/PathStory.tsx src/components/night/panels/PathStory.tsx`. Apply the same replacements. `Step` uses `Eyebrow`; `StepHeading` → `<Heading as="h3" size="heading" className="mt-3 max-w-[26ch]">`. The first step's heading is the panel title (`id={PANEL_TITLE_ID}`, `size="title"`, `className="mt-3 max-w-[22ch]"`). `bafa = c.bafaActive && path.bafa`; `challenge.bafaNote ?? c.consulting.bafa.pathNote`. `roadOf` stays; `road = byId(c.consulting.roads, roadOf(a, b))`. Services: `byId(c.consulting.services, path.services[which])`.

- [ ] **Step 4: NightPanel, NightIntro, MapPlaces**

- `NightPanel`: import `PanelContent` from `./panels/PanelContent`, `PANEL_TITLE_ID` for `labelledBy`, `closeLabel={useContent().ui.close}`.
- `NightIntro`: `INTRO` → `useContent().consulting.intro`; the hint `<p>` becomes `<BottomHint shown={hint} className="text-on-night">{intro.hint}</BottomHint>`.
- `MapPlaces`: delete the local `previewOf` and `exists`; use `placePreview(place, content, activePath)`; `exists` becomes `place.panel.kind !== "testimonial" || place.panel.index < content.consulting.testimonials.length`; `AREA_TITLES[area.id]` → `byId(content.consulting.areas, area.id).title`; `GROUPS` moves inside the component (labels from `ui`). The hover card `<div>` becomes `<PreviewCard tone="night" aria-hidden className="pointer-events-none absolute top-0 w-max max-w-80 -translate-y-1/2 transition-[opacity,translate] duration-700 ease-reveal …">`; the touch card `<button>` uses `previewSurface("night-strong")` in its className in place of its old surface classes; its arrow → `<Icon icon={ArrowUpRight} />`.

- [ ] **Step 5: Delete old files, verify, commit**

```bash
git rm src/components/night/PanelContent.tsx src/components/night/PanelParts.tsx
```

Run: `npm test && npm run lint && npm run typecheck`
Run: `grep -rn "content/consulting" src` → only `src/content/consulting.ts` itself.

```bash
git add -A src
git commit -m "Split the night panels into one file each; the map and panels read from content"
```

---

### Task 8: Imprint as a legal page

**Files:**
- Create: `src/components/layout/LegalPage.tsx`
- Modify: `src/app/imprint/page.tsx`

- [ ] **Step 1: `LegalPage.tsx`** (server component; same markup and classes as today's imprint)

```tsx
import { ArrowLeft } from "lucide-react";
import { ViewTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { RichText } from "@/components/ui/RichText";
import { TextLink } from "@/components/ui/TextLink";
import { Heading } from "@/components/ui/Typography";
import { PAGE_IN, PAGE_OUT } from "@/config/navigation";
import type { LegalPage as LegalPageDoc } from "@/content/schema";

/**
 * A legal page (the imprint): a title and sections, in the project
 * overlay's colors. It slides in from the right like the overlay
 * (`page-slide` in globals.css). The canvas stays hidden (no scene mode).
 */
export function LegalPage({ page, back }: { page: LegalPageDoc; back: string }) {
  return (
    <ViewTransition
      enter={{ [PAGE_IN]: "page-slide", default: "none" }}
      exit={{ [PAGE_OUT]: "page-slide", default: "none" }}
      default="none"
    >
      <div className="min-h-dvh bg-on-night text-on-day">
        <article className="mx-auto max-w-2xl px-gutter py-section">
          <TextLink href="/" transitionTypes={[PAGE_OUT]} variant="subtle" className="group inline-flex items-center gap-1.5 text-body">
            <Icon icon={ArrowLeft} className="transition-transform duration-700 ease-smooth group-hover:-translate-x-0.5" />
            {back}
          </TextLink>

          <Heading as="h1" size="display" className="mt-12">
            {page.title}
          </Heading>

          {page.sections.map((section, i) => (
            <section key={section.heading} className={i === 0 ? "mt-16" : "mt-12"}>
              <Heading size="heading">{section.heading}</Heading>
              {section.address ? (
                <address className="mt-4 text-body not-italic">
                  <RichText text={section.body} />
                </address>
              ) : (
                <p className={`mt-4 text-body ${section.muted ? "opacity-70" : ""}`}>
                  <RichText text={section.body} />
                </p>
              )}
            </section>
          ))}
        </article>
      </div>
    </ViewTransition>
  );
}
```

Note: `TextLink` passes `transitionTypes` through to `next/link`.

- [ ] **Step 2: `src/app/imprint/page.tsx`**

```tsx
import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";
import { getLegalPage, getSiteContent } from "@/content";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getLegalPage("imprint")).metaTitle };
}

export default async function ImprintPage() {
  const [page, { ui }] = await Promise.all([getLegalPage("imprint"), getSiteContent()]);
  return <LegalPage page={page} back={ui.back} />;
}
```

- [ ] **Step 3: Verify and commit**

Run: `npm test && npm run lint && npm run typecheck`

```bash
git add -A src
git commit -m "Render the imprint from its legal page document"
```

---

### Task 9: Remove old content, docs, full verification

**Files:**
- Delete: `src/content/consulting.ts`, `src/content/studio.ts`
- Modify: `README.md`, `CLAUDE.md`

- [ ] **Step 1: Delete the old modules**

```bash
git rm src/content/consulting.ts src/content/studio.ts
```

Run: `grep -rn "content/consulting\|content/studio\|config/site\|PanelParts\|components/sections\|BAFA_ENABLED" src` → nothing.

- [ ] **Step 2: README.md**

- Folder tree: replace the `content/` line with `content/  The content layer: document types (schema.ts), seed data (data/), getSiteContent(), ContentProvider/useContent, selectors and validateContent`; replace `sections/`, `cursor/` lines with `layout/`, `overlay/`, `day/`; add `night/panels/` and `ui/` (shared primitives); add `config/navigation.ts`.
- Night map paragraph: `src/content/consulting.ts holds all copy` → `the consulting document (src/content/data/consulting.ts) holds all copy`; `BAFA_ENABLED` → `bafa.enabledUntil`.
- New section **Content** after Architecture: the flow (`getSiteContent()` in the root layout → `ContentProvider` → `useContent()`; canvas flags via the store); where to add copy (a field in `schema.ts`, the value in `data/`, never in components); layout ids vs content (`validateContent` fails the build on gaps); **Adding Sanity**: turn each type in `schema.ts` into a schema, import `data/` as seed documents, replace the body of `getSiteContent()` with a GROQ query (keep `"use cache"`, `cacheTag("content")`, revalidate the tag from a webhook), and swap `RichText` for a Portable Text renderer.
- Stack table: add Vitest (tests for the content layer).
- Getting started: add `npm test`.

- [ ] **Step 3: CLAUDE.md**

- Commands: add `` - `npm test` runs Vitest (content layer) ``; "Before calling work done, run lint, typecheck, test, and build."
- Replace in the night-map rule: `` `src/content/consulting.ts` of its copy `` → `` the `consulting` document in `src/content` of its copy ``.
- Add a rule: "All copy comes from the content layer (`src/content`): types in `schema.ts`, values in `data/`, read with `useContent()` in client components or `getSiteContent()` on the server. Never hardcode copy in components. The canvas never imports `@/content`; values it needs go through the store (`ContentProvider` writes them). Layout stays in `src/config` and links to content by id; `validateContent` must pass."
- Conventions: add "Shared UI lives in `src/components/ui/` (`Button`, `TextLink`/`TextButton`, `Icon`, `PreviewCard`, `BottomHint`, `Disclosure`, `Typography`, `RichText`). Use them instead of repeating their classes; add a variant there rather than styling locally. The chrome's day/night colors come from `useSceneTone()`."
- Update `PanelParts`/`sections` mentions if any.

- [ ] **Step 4: Full verification**

Run: `npm test && npm run lint && npm run typecheck && npm run build`
Expected: all pass; the build log shows `/` and `/imprint` prerendered.

- [ ] **Step 5: Browser pass**

Run `npm run dev` and compare against `main` (screenshots saved under `.context/`):
1. Entry screen: copy, both buttons, loading line.
2. Day: hint at the bottom, hover a bed (label card), click a bed (overlay title, teaser, media grid, close button).
3. Switch to night: intro lines, skip button, hint; hover a clearing, a service, summit, goal, meadow, a firefly (previews); click a clearing and scroll the path story (light and camera follow; BAFA highlight shows); open every panel kind from the nav and footer (services, process, about, FAQ with opening answers and BAFA note, contact with mail/phone links, results, testimonial, bafa via lantern).
4. Mobile width (390px): burger menu by day and by night, touch card on a place.
5. Imprint: back link, address line breaks, mail link, muted sections, page slide in and out.
6. Console: no new errors or warnings.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Remove the old content modules; document the content layer"
```

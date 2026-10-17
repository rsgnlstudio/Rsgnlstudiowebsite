import type { ProjectBedId } from "@/config/flowers";
import type { AreaId, ChallengeId, RoadId, ServiceId } from "@/config/nightMap";

/**
 * The site's content, as `getSiteContent` assembles it from the Sanity
 * documents (src/sanity/fixedDocuments.ts). Ids link a
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

/** An image from Sanity: the asset, the editor's crop and focal point (`hotspot`), alt text, a blur placeholder. */
export interface ContentImage {
  asset: { _ref: string };
  crop?: { top: number; bottom: number; left: number; right: number };
  hotspot?: { x: number; y: number; width: number; height: number };
  alt: string;
  lqip?: string;
}

/** A media slot of a project; `landscape` spans the full width, two `portrait`s share a row. Empty until an image is set. */
export interface ProjectMedia {
  aspect: "landscape" | "portrait";
  image?: ContentImage;
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
  /** The photo of Simone (4:5); the face should be easy to see. */
  portrait?: ContentImage;
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
  /** Last day of the subsidy (YYYY-MM-DD, inclusive). It ends at midnight CET (UTC+1, German winter time), so use a date outside summer time. */
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

/** What `getSiteContent()` returns: the documents. Anything that depends on the time (the BAFA cutoff) is decided on the client, so it never lags a cache. */
export type SiteContent = SiteDocuments;

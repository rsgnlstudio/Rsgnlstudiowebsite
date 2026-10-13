import type { FlowerKind, PetalTint } from "@/components/canvas/painterly/plants";

/**
 * The flower beds of the day meadow, laid out after the site's flower plan:
 * every section of the site is a group of one kind of flower, and a few wild
 * flowers grow in drifts between them. The beds stand where the plan puts
 * them as seen from the day camera (see src/config/sections.ts).
 *
 * Each bed is one or more ellipses on the ground (`areas`): x and d
 * (distance into the field) of the middle, the radii across (rx) and into
 * the field (rd) in metres, and an optional turn (radians) in the ground
 * plane. `plants` is how many plants grow in it on the high quality tier;
 * `flowers` are its species (FLOWER_SPECIES in painterly/plants.ts) by
 * weight, with an optional fixed petal color.
 */
export interface BedArea {
  x: number;
  d: number;
  rx: number;
  rd: number;
  turn?: number;
}

export interface FlowerBed {
  id: string;
  areas: readonly BedArea[];
  plants: number;
  flowers: readonly { kind: FlowerKind; weight: number; tint?: PetalTint }[];
}

/**
 * The beds that lead somewhere: as a group they glow softly, light up when
 * hovered and open their section in the overlay (`ProjectOverlay`) on click
 * or tap, keyed by `id`. `title` and `teaser` show in the label next to the
 * cursor while hovered and head the overlay (the teasers are placeholders).
 * Imprint and contact live in the top navigation, so their flowers
 * (marsh marigold, pot marigold) grow in MEADOW_BEDS without a link.
 */
export const PROJECT_BEDS = [
  {
    id: "about",
    title: "Vita & Über mich",
    teaser: "Platzhalter: eine kurze Zeile über Simone.",
    // Schleierkraut, a white veil to the left.
    areas: [{ x: -3.2, d: 7, rx: 1.15, rd: 1.7 }],
    plants: 34,
    flowers: [{ kind: "gypsophila", weight: 1 }],
  },
  {
    id: "illustration",
    title: "Illustrationen & Digitalkunst",
    teaser: "Platzhalter: eine kurze Zeile zu diesem Portfolio.",
    // Mohnblumen, in front and reaching back between the others.
    areas: [
      { x: -1.45, d: 5.5, rx: 1.2, rd: 1.4 },
      { x: -1.75, d: 9.3, rx: 0.85, rd: 2.2 },
    ],
    plants: 46,
    flowers: [{ kind: "poppy", weight: 1 }],
  },
  {
    id: "painting",
    title: "Malerei",
    teaser: "Platzhalter: eine kurze Zeile zu diesem Portfolio.",
    // Margeriten, in the middle at the front.
    areas: [{ x: 0.25, d: 5.8, rx: 0.75, rd: 1.4 }],
    plants: 26,
    flowers: [{ kind: "daisy", weight: 1 }],
  },
  {
    id: "writing",
    title: "Texte & Gegenständliches",
    teaser: "Platzhalter: eine kurze Zeile zu diesem Portfolio.",
    // Rapunzel-Glockenblumen, in the middle further back.
    areas: [{ x: 0.55, d: 10.8, rx: 1.25, rd: 2.4 }],
    plants: 34,
    flowers: [{ kind: "bellflower", weight: 1 }],
  },
  {
    id: "shop",
    title: "Shop",
    teaser: "Platzhalter: eine kurze Zeile zum Shop.",
    // Cosmea in pink, white and deep rose, a long drift on the right
    // running back to the trees.
    areas: [
      { x: 3.1, d: 6, rx: 0.95, rd: 1.6 },
      { x: 4.9, d: 11.5, rx: 1.1, rd: 3.6, turn: -0.3 },
    ],
    plants: 50,
    flowers: [{ kind: "cosmos", weight: 1 }],
  },
] as const satisfies readonly (FlowerBed & { title: string; teaser: string })[];

export type ProjectBedId = (typeof PROJECT_BEDS)[number]["id"];

/** Groups without a link: the plan's other flowers and the wild ones between the beds. */
export const MEADOW_BEDS = [
  {
    // Sumpfdotterblumen and Hahnenfuss by the stream, back left (the imprint's flowers).
    id: "marsh",
    areas: [{ x: -6.2, d: 12.5, rx: 2.3, rd: 3.6 }],
    plants: 46,
    flowers: [
      { kind: "marshMarigold", weight: 3 },
      { kind: "buttercup", weight: 2 },
    ],
  },
  {
    // Ringelblumen between the bellflowers and the cosmos (the contact's flowers).
    id: "calendula",
    areas: [{ x: 2.3, d: 8.6, rx: 0.7, rd: 2.4 }],
    plants: 22,
    flowers: [{ kind: "calendula", weight: 1 }],
  },
  {
    // Wiesensalbei, behind the marigolds and in a thin line before them.
    id: "sage",
    areas: [
      { x: 3.7, d: 15.5, rx: 1.4, rd: 2.5 },
      { x: 1.5, d: 6.6, rx: 0.35, rd: 1 },
    ],
    plants: 26,
    flowers: [{ kind: "sage", weight: 1 }],
  },
  {
    // Wiesenklee between the daisies and the bellflowers.
    id: "clover",
    areas: [{ x: 0.15, d: 7.9, rx: 0.8, rd: 0.8 }],
    plants: 16,
    flowers: [{ kind: "clover", weight: 1 }],
  },
  {
    // Spitzwegerich along the trees on the right.
    id: "plantain",
    areas: [{ x: 6.6, d: 12.5, rx: 0.8, rd: 3.5 }],
    plants: 18,
    flowers: [{ kind: "plantain", weight: 1 }],
  },
  {
    // Teufelskralle at the front, between the poppies and the daisies.
    id: "rampion",
    areas: [{ x: -0.5, d: 4.5, rx: 0.4, rd: 0.5 }],
    plants: 8,
    flowers: [{ kind: "rampion", weight: 1 }],
  },
] as const satisfies readonly FlowerBed[];

/** Every bed; project beds first, so a bed's index + 1 is its feature index (featured.ts). */
export const FLOWER_BEDS: readonly FlowerBed[] = [...PROJECT_BEDS, ...MEADOW_BEDS];

/**
 * Hover hit area of a bed: the heights above its ground at which the cursor
 * ray is tested (from the stems up to the tallest heads), and the margin
 * around its areas, in metres.
 */
export const BED_HIT = { heights: [0.1, 0.4, 0.75], margin: 0.2 } as const;

/**
 * Seconds between a project bed's pulses (a ripple of light through it that
 * hints it can be clicked), at random within this range, and before the
 * first one once the UI is shown.
 */
export const BED_PULSE = { every: [4, 10], first: [0.8, 5] } as const;

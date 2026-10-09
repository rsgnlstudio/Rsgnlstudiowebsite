/**
 * The featured flowers: a few slightly bigger flowers in the day meadow that
 * glow softly and light up when hovered (how much: `featured*` in
 * src/config/look.ts). Each one will open an overlay on click, keyed by its `id`.
 *
 * x and d (distance into the field) in metres, as in painterly/landscape.ts.
 * `kind` and `tint` name a flower kind and petal color from painterly/plants.ts.
 * `title` and `teaser` show in the label next to the cursor while hovered
 * (placeholders for now).
 */
export const FEATURED_FLOWERS = [
  {
    id: "flower-1",
    x: -1.65,
    d: 3.8,
    height: 0.85,
    kind: "cosmos",
    tint: "flowerWhite",
    title: "Projekt Eins",
    teaser: "Platzhalter: eine kurze Zeile zu diesem Projekt.",
  },
  {
    id: "flower-2",
    x: -0.85,
    d: 3.4,
    height: 0.8,
    kind: "rose",
    tint: "flowerPinkDeep",
    title: "Projekt Zwei",
    teaser: "Platzhalter: eine kurze Zeile zu diesem Projekt.",
  },
  {
    id: "flower-3",
    x: -0.17,
    d: 4,
    height: 0.9,
    kind: "daisy",
    tint: "flowerWhite",
    title: "Projekt Drei",
    teaser: "Platzhalter: eine kurze Zeile zu diesem Projekt.",
  },
  {
    id: "flower-4",
    x: 0.46,
    d: 3.2,
    height: 0.8,
    kind: "cosmos",
    tint: "flowerPink",
    title: "Projekt Vier",
    teaser: "Platzhalter: eine kurze Zeile zu diesem Projekt.",
  },
  {
    id: "flower-5",
    x: 1.2,
    d: 4,
    height: 0.9,
    kind: "cosmos",
    tint: "flowerPeriwinkle",
    title: "Projekt Fünf",
    teaser: "Platzhalter: eine kurze Zeile zu diesem Projekt.",
  },
] as const;

export type FeaturedFlowerId = (typeof FEATURED_FLOWERS)[number]["id"];

/**
 * Hover hit area around a flower's head: its petal radius as a share of
 * the flower's height, and the minimum radius on screen in pixels.
 */
export const FEATURED_HIT = { radius: 0.3, minPx: 26 } as const;

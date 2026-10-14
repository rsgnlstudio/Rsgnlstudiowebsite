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

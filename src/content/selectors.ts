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

const germanTime = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Berlin",
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
});

/** How far German time is ahead of UTC at `time`, in ms (an hour in winter, two in summer). */
function germanOffset(time: number) {
  const parts = germanTime.formatToParts(time);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)!.value);
  return Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute")) - time;
}

/** Whether the BAFA subsidy runs at `now`: through the whole last day, ending at midnight German time (summer or winter). */
export function bafaActive(bafa: Pick<Bafa, "enabledUntil">, now: Date) {
  const DAY = 24 * 60 * 60 * 1000;
  // Midnight after the last day in UTC, moved by German time's offset. The clocks change at 01:00 UTC, so the offset at that UTC midnight is the one at German midnight.
  const midnight = Date.parse(`${bafa.enabledUntil}T00:00:00Z`) + DAY;
  return now.getTime() < midnight - germanOffset(midnight);
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

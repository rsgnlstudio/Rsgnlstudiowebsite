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

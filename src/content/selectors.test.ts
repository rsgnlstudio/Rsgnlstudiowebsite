import { describe, expect, it } from "vitest";
import { bafaActive, bookingHref, byId, firstSentence } from "@/content/selectors";

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
    expect(bookingHref(contact, '„Ohne mich“ & mehr')).toBe(
      `mailto:a@b.de?subject=Kennenlerngespr%C3%A4ch&body=${encodeURIComponent('Meine Herausforderung: „Ohne mich“ & mehr\n\n')}`,
    );
  });
});

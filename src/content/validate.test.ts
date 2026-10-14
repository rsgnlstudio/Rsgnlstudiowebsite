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
  it("needs a YYYY-MM-DD BAFA end date", () => {
    const bafa = { ...siteDocuments.consulting.bafa, enabledUntil: "31.12.2026" };
    const docs = { ...siteDocuments, consulting: { ...siteDocuments.consulting, bafa } };
    expect(validateContent(docs)).toContain("consulting.bafa.enabledUntil: expected YYYY-MM-DD");
  });
  it("rejects a BAFA end date that doesn't exist", () => {
    for (const enabledUntil of ["2026-02-30", "2026-06-31", "2026-13-01"]) {
      const bafa = { ...siteDocuments.consulting.bafa, enabledUntil };
      const docs = { ...siteDocuments, consulting: { ...siteDocuments.consulting, bafa } };
      expect(validateContent(docs)).toContain("consulting.bafa.enabledUntil: expected YYYY-MM-DD");
    }
  });
  it("needs the imprint", () => {
    expect(validateContent({ ...siteDocuments, legal: [] })).toContain('legal: missing "imprint"');
  });
});

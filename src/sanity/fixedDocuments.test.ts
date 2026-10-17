import { describe, expect, it } from "vitest";
import { CITY_LIGHTS } from "@/config/nightMap";
import { FIXED_ITEM_TYPES, SINGLETONS, fixedItems } from "@/sanity/fixedDocuments";

describe("fixed documents", () => {
  it("lists the services in config order", () => {
    expect(fixedItems("service").map((d) => d.configId)).toEqual(CITY_LIGHTS.map((c) => c.id));
  });
  it("prefixes item ids with their type", () => {
    expect(fixedItems("road")[0]._id).toBe("road-leadership-strategy");
  });
  it("uses ids without a dot (Sanity keeps dotted ids private)", () => {
    const ids = [...SINGLETONS, ...FIXED_ITEM_TYPES.flatMap(fixedItems)].map((d) => d._id);
    expect(ids.filter((id) => id.includes("."))).toEqual([]);
  });
  it("never repeats an id", () => {
    const ids = [...SINGLETONS, ...FIXED_ITEM_TYPES.flatMap(fixedItems)].map((d) => d._id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

import { describe, expect, it } from "vitest";
import { siteDocuments } from "@/content/data";
import { FIXED_TYPES } from "@/sanity/fixedDocuments";
import { schemaTypes } from "@/sanity/schemaTypes";
import { toSanity } from "@/sanity/toSanity";

interface Def {
  name?: string;
  type: string;
  fields?: Def[];
  of?: Def[];
}

const named = new Map((schemaTypes as Def[]).map((t) => [t.name!, t]));
/** A field's definition with named object types resolved. */
const resolve = (def: Def): Def => (named.has(def.type) ? { ...named.get(def.type)!, ...def, type: named.get(def.type)!.type, fields: named.get(def.type)!.fields } : def);

/** Content fields the schema has no field for, as paths. */
function unknownFields(value: unknown, def: Def, path: string): string[] {
  const d = resolve(def);
  if (Array.isArray(value)) {
    return value.flatMap((v, i) => (d.of?.length ? unknownFields(v, d.of[0], `${path}[${i}]`) : [`${path}: not an array`]));
  }
  if (!value || typeof value !== "object") return [];
  return Object.entries(value)
    .filter(([k]) => !k.startsWith("_"))
    .flatMap(([k, v]) => {
      const field = d.fields?.find((f) => f.name === k);
      return field ? unknownFields(v, field, `${path}.${k}`) : [`${path}.${k}`];
    });
}

describe("Studio schema", () => {
  it("has a type for every fixed document", () => {
    expect(FIXED_TYPES.filter((t) => !named.has(t))).toEqual([]);
  });
  it("has a field for every piece of content", () => {
    const problems = toSanity(siteDocuments).flatMap((doc) => unknownFields(doc, named.get(doc._type) ?? { type: "missing" }, doc._id));
    expect(problems).toEqual([]);
  });
});

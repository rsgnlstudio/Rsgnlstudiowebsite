import { defineField, type FieldDefinition } from "sanity";

/** Field helpers: every content field is required unless marked optional, like the types in src/content/schema.ts. */
interface FieldOptions {
  title?: string;
  description?: string;
  optional?: boolean;
}

/** A one-line text. */
export const str = (name: string, o: FieldOptions = {}) =>
  defineField({ name, type: "string", title: o.title, description: o.description, validation: o.optional ? undefined : (r) => r.required() });

/** A longer text; line breaks are kept. */
export const txt = (name: string, o: FieldOptions = {}) =>
  defineField({ name, type: "text", rows: 4, title: o.title, description: o.description, validation: o.optional ? undefined : (r) => r.required() });

/** A group of fields; required as a whole, so Sanity checks the fields inside even before one is filled in. */
export const obj = (name: string, fields: FieldDefinition[], o: FieldOptions = {}) =>
  defineField({
    name,
    type: "object",
    title: o.title,
    description: o.description,
    fields,
    options: { collapsible: true },
    validation: o.optional ? undefined : (r) => r.required(),
  });

/** A group of one-line labels. */
export const labels = (name: string, keys: readonly string[], o: FieldOptions = {}) => obj(name, keys.map((k) => str(k)), o);

/** A field of a named object type (e.g. `twoLines`). */
export const typed = (name: string, type: string, o: FieldOptions = {}) =>
  defineField({ name, type, title: o.title, description: o.description, validation: o.optional ? undefined : (r) => r.required() });

/** The id that ties a document to its place in the scene (src/config). */
export const idField = defineField({
  name: "id",
  type: "string",
  title: "Scene id",
  readOnly: true,
  description: "Ties this text to its place in the scene. Fixed.",
});

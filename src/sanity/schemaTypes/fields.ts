import { defineField, type FieldDefinition } from "sanity";

/**
 * Field helpers: every content field is required unless marked optional, like
 * the types in src/content/schema.ts. Names stay the English keys of
 * schema.ts; the Studio shows the German `title` (required, so Sanity never
 * falls back to a title made from the English name).
 */
interface FieldOptions {
  description?: string;
  optional?: boolean;
}

/** A one-line text. */
export const str = (name: string, title: string, o: FieldOptions = {}) =>
  defineField({ name, type: "string", title, description: o.description, validation: o.optional ? undefined : (r) => r.required() });

/** An email address (always required: it becomes a `mailto:` link). */
export const email = (name: string, title: string, o: Omit<FieldOptions, "optional"> = {}) =>
  defineField({
    name,
    type: "string",
    title,
    description: o.description,
    validation: (r) => r.required().email().error("Gib eine gültige E-Mail-Adresse ein."),
  });

/** A longer text; line breaks are kept. */
export const txt = (name: string, title: string, o: FieldOptions = {}) =>
  defineField({ name, type: "text", rows: 4, title, description: o.description, validation: o.optional ? undefined : (r) => r.required() });

/** A group of fields; required as a whole, so Sanity checks the fields inside even before one is filled in. */
export const obj = (name: string, title: string, fields: FieldDefinition[], o: FieldOptions = {}) =>
  defineField({
    name,
    type: "object",
    title,
    description: o.description,
    fields,
    options: { collapsible: true },
    validation: o.optional ? undefined : (r) => r.required(),
  });

/** A group of one-line labels, by key with their German titles. */
export const labels = (name: string, title: string, keys: Record<string, string>, o: FieldOptions = {}) =>
  obj(name, title, Object.entries(keys).map(([k, t]) => str(k, t)), o);

/** A field of a named object type (e.g. `twoLines`). */
export const typed = (name: string, type: string, title: string, o: FieldOptions = {}) =>
  defineField({ name, type, title, description: o.description, validation: o.optional ? undefined : (r) => r.required() });

/** The id that ties a document to its place in the scene (src/config). */
export const idField = defineField({
  name: "id",
  type: "string",
  title: "Szenen-ID",
  readOnly: true,
  description: "Verbindet diesen Text mit seinem Ort in der Szene. Fest.",
});

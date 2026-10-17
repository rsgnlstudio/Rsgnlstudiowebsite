import { defineArrayMember, defineField, defineType } from "sanity";
import { str, txt } from "./fields";

export const twoLines = defineType({
  name: "twoLines",
  title: "Zwei Zeilen",
  type: "object",
  description: "Erst eine Zeile mit einer Situation oder einem Gefühl, dann eine zweite, kleinere, die es klar benennt.",
  fields: [txt("line", "Zeile"), txt("detail", "Einordnung")],
});

export const textBlock = defineType({
  name: "textBlock",
  title: "Textblock",
  type: "object",
  fields: [str("title", "Titel"), txt("text", "Text")],
});

export const contentImage = defineType({
  name: "contentImage",
  title: "Bild",
  type: "image",
  options: { hotspot: true },
  fields: [
    defineField({
      name: "alt",
      type: "string",
      title: "Alternativtext",
      description: "Was das Bild zeigt, für Menschen, die es nicht sehen können.",
      validation: (r) =>
        r.custom((alt, ctx) => ((ctx.parent as { asset?: unknown } | undefined)?.asset && !alt ? "Beschreibe das Bild." : true)),
    }),
  ],
});

export const projectMedia = defineType({
  name: "projectMedia",
  title: "Medium",
  type: "object",
  fields: [
    defineField({
      name: "aspect",
      type: "string",
      title: "Format",
      description: "Querformat nimmt die ganze Breite ein; zwei Hochformate teilen sich eine Reihe.",
      options: {
        list: [
          { title: "Querformat", value: "landscape" },
          { title: "Hochformat", value: "portrait" },
        ],
        layout: "radio",
        direction: "horizontal",
      },
      initialValue: "landscape",
      validation: (r) => r.required(),
    }),
    defineField({ name: "image", type: "contentImage", title: "Bild", description: "Bis eines gesetzt ist, steht ein Platzhalter da." }),
  ],
  preview: {
    select: { aspect: "aspect", media: "image" },
    prepare: ({ aspect, media }) => ({ title: aspect === "portrait" ? "Hochformat" : "Querformat", media }),
  },
});

/** A list of objects of one named type. */
export const listOf = (type: string) => [defineArrayMember({ type })];

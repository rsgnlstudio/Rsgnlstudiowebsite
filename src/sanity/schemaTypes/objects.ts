import { defineArrayMember, defineField, defineType } from "sanity";
import { str, txt } from "./fields";

export const twoLines = defineType({
  name: "twoLines",
  title: "Two lines",
  type: "object",
  description: "A first line with a situation or a feeling, then a second, smaller one that names it in plain terms.",
  fields: [txt("line"), txt("detail")],
});

export const textBlock = defineType({
  name: "textBlock",
  title: "Text block",
  type: "object",
  fields: [str("title"), txt("text")],
});

export const contentImage = defineType({
  name: "contentImage",
  title: "Image",
  type: "image",
  options: { hotspot: true },
  fields: [
    defineField({
      name: "alt",
      type: "string",
      title: "Alt text",
      description: "What the image shows, in German, for people who can't see it.",
      validation: (r) =>
        r.custom((alt, ctx) => ((ctx.parent as { asset?: unknown } | undefined)?.asset && !alt ? "Describe the image." : true)),
    }),
  ],
});

export const projectMedia = defineType({
  name: "projectMedia",
  title: "Media",
  type: "object",
  fields: [
    defineField({
      name: "aspect",
      type: "string",
      description: "Landscape spans the full width; two portraits share a row.",
      options: { list: ["landscape", "portrait"], layout: "radio", direction: "horizontal" },
      initialValue: "landscape",
      validation: (r) => r.required(),
    }),
    defineField({ name: "image", type: "contentImage", description: "Shows a placeholder until set." }),
  ],
  preview: { select: { title: "aspect", media: "image" } },
});

/** A list of objects of one named type. */
export const listOf = (type: string) => [defineArrayMember({ type })];

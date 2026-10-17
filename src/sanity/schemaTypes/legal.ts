import { DocumentTextIcon } from "@sanity/icons/DocumentText";
import { defineArrayMember, defineField, defineType } from "sanity";
import { str, txt } from "./fields";

export const legalPage = defineType({
  name: "legalPage",
  title: "Legal page",
  type: "document",
  icon: DocumentTextIcon,
  fields: [
    defineField({ name: "slug", type: "string", readOnly: true, description: "Its address on the site. Fixed." }),
    str("title"),
    str("metaTitle", { title: "Browser tab title" }),
    defineField({
      name: "sections",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          name: "legalSection",
          fields: [
            str("heading"),
            txt("body", { description: "Line breaks are kept; e-mail addresses become links." }),
            defineField({ name: "address", type: "boolean", description: "Set as an address." }),
            defineField({ name: "muted", type: "boolean", description: "Quieter (placeholder or boilerplate text)." }),
          ],
          preview: { select: { title: "heading" } },
        }),
      ],
      validation: (r) => r.required(),
    }),
  ],
  preview: { select: { title: "title" } },
});

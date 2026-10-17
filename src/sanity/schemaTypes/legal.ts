import { DocumentTextIcon } from "@sanity/icons/DocumentText";
import { defineArrayMember, defineField, defineType } from "sanity";
import { str, txt } from "./fields";

export const legalPage = defineType({
  name: "legalPage",
  title: "Rechtliche Seite",
  type: "document",
  icon: DocumentTextIcon,
  fields: [
    defineField({ name: "slug", type: "string", title: "Adresse", readOnly: true, description: "Ihre Adresse auf der Website. Fest." }),
    str("title", "Titel"),
    str("metaTitle", "Titel im Browser-Tab"),
    defineField({
      name: "sections",
      type: "array",
      title: "Abschnitte",
      of: [
        defineArrayMember({
          type: "object",
          name: "legalSection",
          title: "Abschnitt",
          fields: [
            str("heading", "Überschrift"),
            txt("body", "Text", { description: "Zeilenumbrüche bleiben erhalten; E-Mail-Adressen werden zu Links." }),
            defineField({ name: "address", type: "boolean", title: "Adresse", description: "Als Adresse gesetzt." }),
            defineField({ name: "muted", type: "boolean", title: "Zurückhaltend", description: "Leiser gesetzt (Platzhalter oder Standardtext)." }),
          ],
          preview: { select: { title: "heading" } },
        }),
      ],
      validation: (r) => r.required(),
    }),
  ],
  preview: { select: { title: "title" } },
});

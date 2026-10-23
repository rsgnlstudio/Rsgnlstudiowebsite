import { ImageIcon } from "@sanity/icons/Image";
import { SunIcon } from "@sanity/icons/Sun";
import { defineField, defineType, type SanityDocument } from "sanity";
import { idField, labels, obj, str, txt } from "./fields";
import { listOf } from "./objects";

export const dayStudio = defineType({
  name: "dayStudio",
  title: "Start & Hinweise",
  type: "document",
  icon: SunIcon,
  fields: [
    obj(
      "entry",
      "Startbildschirm",
      [
        str("title", "Titel"),
        txt("text", "Text"),
        str("loading", "Ladehinweis"),
        str("withSound", "Mit Ton eintreten"),
        str("withoutSound", "Ohne Ton eintreten"),
        str("or", "Zwischen den Knöpfen („oder“)"),
      ],
    ),
    labels("dayHint", "Hinweis am Tag", { mouse: "Mit Maus", touch: "Mit Touch" }, {
      description: "Unten in der Mitte am Tag: eine Zeile für die Maus, eine für Touch.",
    }),
    labels("timeOfDay", "Tag/Nacht-Schalter", { label: "Gruppe (für Screenreader)", day: "Knopf für den Tag", night: "Knopf für die Nacht" }),
  ],
  preview: { prepare: () => ({ title: "Start & Hinweise" }) },
});

/** A project with a link opens that page instead of the overlay, so its teaser and media are hidden and not required. */
const linked = ({ document }: { document?: SanityDocument }) => Boolean(document?.href);
const unlessLinked = (value: unknown, context: { document?: SanityDocument }) =>
  linked(context) || (value !== undefined && value !== "" && !(Array.isArray(value) && value.length === 0)) || "Pflichtfeld, solange kein externer Link gesetzt ist.";

export const project = defineType({
  name: "project",
  title: "Projekt",
  type: "document",
  icon: ImageIcon,
  description: "Was ein Blumenbeet öffnet.",
  fields: [
    idField,
    str("title", "Titel"),
    defineField({
      name: "href",
      type: "url",
      title: "Externer Link",
      description: "Optional. Ist ein Link gesetzt (z. B. der Etsy-Shop), öffnet das Beet diese Seite in einem neuen Tab statt des Projekts; Teaser und Medien entfallen dann.",
      validation: (r) => r.uri({ scheme: ["https"] }).error("Gib eine vollständige Adresse mit https:// ein."),
    }),
    defineField({
      name: "teaser",
      type: "text",
      rows: 4,
      title: "Teaser",
      description: "Unter dem Titel des Projekts.",
      hidden: linked,
      validation: (r) => r.custom(unlessLinked),
    }),
    defineField({ name: "media", type: "array", title: "Medien", of: listOf("projectMedia"), hidden: linked, validation: (r) => r.custom(unlessLinked) }),
  ],
  preview: { select: { title: "title", media: "media.0.image" } },
});

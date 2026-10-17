import { ImageIcon } from "@sanity/icons/Image";
import { SunIcon } from "@sanity/icons/Sun";
import { defineField, defineType } from "sanity";
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

export const project = defineType({
  name: "project",
  title: "Projekt",
  type: "document",
  icon: ImageIcon,
  description: "Was ein Blumenbeet öffnet.",
  fields: [
    idField,
    str("title", "Titel"),
    txt("teaser", "Teaser", { description: "Neben dem Cursor, solange das Beet berührt wird, und unter dem Titel." }),
    defineField({ name: "media", type: "array", title: "Medien", of: listOf("projectMedia"), validation: (r) => r.required() }),
  ],
  preview: { select: { title: "title", media: "media.0.image" } },
});

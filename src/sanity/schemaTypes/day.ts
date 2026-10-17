import { ImageIcon } from "@sanity/icons/Image";
import { SunIcon } from "@sanity/icons/Sun";
import { defineField, defineType } from "sanity";
import { idField, labels, obj, str, txt } from "./fields";
import { listOf } from "./objects";

export const dayStudio = defineType({
  name: "dayStudio",
  title: "Entry & hints",
  type: "document",
  icon: SunIcon,
  fields: [
    obj("entry", [str("title"), txt("text"), str("loading"), str("withSound"), str("withoutSound"), str("or")], { title: "Entry screen" }),
    labels("dayHint", ["mouse", "touch"], { title: "Day hint", description: "At the bottom centre by day: one line for the mouse, one for touch." }),
    labels("timeOfDay", ["label", "day", "night"], { title: "Day/night switch" }),
  ],
  preview: { prepare: () => ({ title: "Entry & hints" }) },
});

export const project = defineType({
  name: "project",
  title: "Project",
  type: "document",
  icon: ImageIcon,
  description: "What a flower bed opens.",
  fields: [
    idField,
    str("title"),
    txt("teaser", { description: "Next to the cursor while the bed is hovered, and under the title." }),
    defineField({ name: "media", type: "array", of: listOf("projectMedia") }),
  ],
  preview: { select: { title: "title", media: "media.0.image" } },
});

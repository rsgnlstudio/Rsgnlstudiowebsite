import { BillIcon } from "@sanity/icons/Bill";
import { CommentIcon } from "@sanity/icons/Comment";
import { EnvelopeIcon } from "@sanity/icons/Envelope";
import { HelpCircleIcon } from "@sanity/icons/HelpCircle";
import { HomeIcon } from "@sanity/icons/Home";
import { LinkIcon } from "@sanity/icons/Link";
import { MoonIcon } from "@sanity/icons/Moon";
import { PinIcon } from "@sanity/icons/Pin";
import { SparklesIcon } from "@sanity/icons/Sparkles";
import { StarIcon } from "@sanity/icons/Star";
import { TrendUpwardIcon } from "@sanity/icons/TrendUpward";
import { UserIcon } from "@sanity/icons/User";
import { ListIcon } from "@sanity/icons/List";
import { defineArrayMember, defineField, defineType } from "sanity";
import { PATHS, TESTIMONIAL_HOMES } from "@/config/nightMap";
import { idField, str, txt, typed } from "./fields";
import { listOf } from "./objects";

const singleton = (title: string) => ({ prepare: () => ({ title }) });
const strings = (name: string, o: { title?: string; description?: string } = {}) =>
  defineField({ name, type: "array", of: [defineArrayMember({ type: "text", rows: 2 })], ...o, validation: (r) => r.required().min(1) });

export const nightIntro = defineType({
  name: "nightIntro",
  title: "Intro",
  type: "document",
  icon: MoonIcon,
  description: "Shown while the camera flies up into the night.",
  fields: [strings("lines"), txt("transition"), txt("statement"), txt("hint"), str("skip")],
  preview: singleton("Intro"),
});

export const servicesOverview = defineType({
  name: "servicesOverview",
  title: "Services overview",
  type: "document",
  icon: ListIcon,
  fields: [txt("intro")],
  preview: singleton("Services overview"),
});

export const area = defineType({
  name: "area",
  title: "Area",
  type: "document",
  icon: PinIcon,
  fields: [idField, str("title")],
  preview: { select: { title: "title" } },
});

export const challenge = defineType({
  name: "challenge",
  title: "Challenge",
  type: "document",
  icon: SparklesIcon,
  description: "A clearing in the woods, and the path it starts.",
  fields: [
    idField,
    txt("line", { description: "The situation or feeling." }),
    txt("detail", { description: "Its plain classification." }),
    txt("noticed", { optional: true }),
    txt("behind", { optional: true }),
    txt("support", { optional: true }),
    defineField({
      name: "stations",
      type: "array",
      description: "The two services on its path, in the words of this challenge.",
      of: listOf("twoLines"),
      validation: (r) =>
        r.custom((stations, ctx) => {
          const id = (ctx.document as { id?: string } | undefined)?.id;
          const path = PATHS.find((p) => p.id === id) as { services?: unknown } | undefined;
          return !path?.services || (stations?.length ?? 0) === 2 ? true : "This path passes two services: write exactly two stations.";
        }),
    }),
    typed("result", "twoLines", { description: "What changes at the end of the path (the mountains' preview)." }),
    txt("bafaNote", { optional: true, title: "BAFA note", description: "A note on the BAFA subsidy for this path." }),
  ],
  preview: { select: { title: "line", subtitle: "detail" } },
});

const serviceExtra = defineArrayMember({
  name: "serviceExtra",
  title: "Block",
  type: "object",
  fields: [
    defineField({
      name: "kind",
      type: "string",
      options: { list: ["text", "research"], layout: "radio", direction: "horizontal" },
      initialValue: "text",
      validation: (r) => r.required(),
    }),
    str("title"),
    defineField({
      name: "text",
      type: "text",
      rows: 4,
      hidden: ({ parent }) => parent?.kind !== "text",
      validation: (r) => r.custom((text, ctx) => ((ctx.parent as { kind?: string })?.kind === "text" && !text ? "Required" : true)),
    }),
    defineField({ name: "points", type: "array", of: listOf("textBlock"), hidden: ({ parent }) => parent?.kind !== "research" }),
    defineField({ name: "source", type: "text", rows: 2, hidden: ({ parent }) => parent?.kind !== "research" }),
  ],
  preview: { select: { title: "title", subtitle: "kind" } },
});

export const service = defineType({
  name: "service",
  title: "Service",
  type: "document",
  icon: StarIcon,
  description: "A light of the city.",
  fields: [
    idField,
    str("title"),
    typed("preview", "twoLines", { description: "Hover preview: a line, then the plain terms." }),
    txt("about"),
    defineField({ name: "extra", type: "array", title: "More blocks", description: "After “Worum es geht”.", of: [serviceExtra] }),
    txt("forWhom", { optional: true }),
    txt("benefit", { optional: true }),
    typed("highlight", "textBlock", { optional: true, description: "A format shown first and highlighted." }),
    str("bookTitle", { optional: true, description: "Title of “book”; defaults to the label “Was du buchen kannst”." }),
    txt("book"),
    txt("methods", { optional: true }),
  ],
  preview: { select: { title: "title" } },
});

export const road = defineType({
  name: "road",
  title: "Road",
  type: "document",
  icon: LinkIcon,
  description: "Why two services belong together.",
  fields: [idField, txt("noticed"), txt("why"), txt("link", { description: "The connection in one sentence (bold; also the hover preview)." }), txt("support")],
  preview: { select: { title: "link", subtitle: "id" } },
});

export const results = defineType({
  name: "results",
  title: "Results",
  type: "document",
  icon: TrendUpwardIcon,
  fields: [str("title"), typed("preview", "twoLines"), txt("intro"), txt("emphasis"), strings("points")],
  preview: singleton("Results"),
});

export const process = defineType({
  name: "process",
  title: "Process",
  type: "document",
  icon: HomeIcon,
  fields: [
    str("title"),
    txt("intro"),
    defineField({ name: "steps", type: "array", of: listOf("twoLines") }),
    defineField({
      name: "formats",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          name: "format",
          fields: [str("title"), txt("text"), txt("note", { optional: true }), defineField({ name: "highlight", type: "boolean" })],
          preview: { select: { title: "title" } },
        }),
      ],
    }),
    txt("costs"),
  ],
  preview: singleton("Process"),
});

export const about = defineType({
  name: "about",
  title: "About",
  type: "document",
  icon: UserIcon,
  fields: [
    defineField({ name: "portrait", type: "contentImage", description: "4:5. The face should be easy to see. Shows a placeholder until set." }),
    str("name"),
    str("role"),
    txt("intro"),
    txt("approach"),
    str("approachTags"),
    defineField({
      name: "stations",
      type: "array",
      of: [defineArrayMember({ type: "object", name: "station", fields: [str("years"), txt("text")], preview: { select: { title: "years", subtitle: "text" } } })],
    }),
    txt("education"),
    txt("more"),
  ],
  preview: singleton("About"),
});

export const testimonials = defineType({
  name: "testimonials",
  title: "Testimonials",
  type: "document",
  icon: CommentIcon,
  fields: [
    defineField({
      name: "items",
      title: "Testimonials",
      type: "array",
      description: `At most ${TESTIMONIAL_HOMES.length} (one firefly each). Only with written consent.`,
      of: [
        defineArrayMember({
          type: "object",
          name: "testimonial",
          fields: [txt("quote"), str("name"), str("role"), str("company")],
          preview: { select: { title: "name", subtitle: "company" } },
        }),
      ],
      validation: (r) => r.max(TESTIMONIAL_HOMES.length),
    }),
  ],
  preview: singleton("Testimonials"),
});

export const bafa = defineType({
  name: "bafa",
  title: "BAFA subsidy",
  type: "document",
  icon: BillIcon,
  fields: [
    str("title"),
    txt("text"),
    defineField({
      name: "enabledUntil",
      type: "date",
      title: "Runs until",
      description: "Last day of the subsidy (inclusive). It ends at midnight CET (German winter time), so pick a date outside summer time.",
      validation: (r) => r.required(),
    }),
    txt("faqNote", { title: "FAQ note", description: "Added to FAQ answers marked BAFA." }),
    txt("pathNote", { description: "On a subsidised path without its own BAFA note." }),
  ],
  preview: singleton("BAFA subsidy"),
});

export const faq = defineType({
  name: "faq",
  title: "FAQ",
  type: "document",
  icon: HelpCircleIcon,
  fields: [
    defineField({
      name: "items",
      title: "Questions",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          name: "faqItem",
          fields: [
            str("question"),
            txt("answer"),
            defineField({ name: "bafa", type: "boolean", title: "BAFA", description: "Adds the subsidy note while it runs." }),
          ],
          preview: { select: { title: "question" } },
        }),
      ],
    }),
  ],
  preview: singleton("FAQ"),
});

export const contact = defineType({
  name: "contact",
  title: "Contact",
  type: "document",
  icon: EnvelopeIcon,
  fields: [
    txt("preview"),
    str("title"),
    txt("text"),
    str("cta", { title: "Button" }),
    defineField({ name: "email", type: "string", title: "E-mail", validation: (r) => r.required().email() }),
    str("phone"),
    str("mailSubject"),
    txt("mailChallenge"),
    txt("newsletter"),
  ],
  preview: singleton("Contact"),
});


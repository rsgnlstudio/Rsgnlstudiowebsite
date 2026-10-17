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
import { TagsIcon } from "@sanity/icons/Tags";
import { TrendUpwardIcon } from "@sanity/icons/TrendUpward";
import { UserIcon } from "@sanity/icons/User";
import { ListIcon } from "@sanity/icons/List";
import { defineArrayMember, defineField, defineType } from "sanity";
import { PATHS, TESTIMONIAL_HOMES } from "@/config/nightMap";
import { email, idField, labels, str, txt, typed } from "./fields";
import { listOf } from "./objects";

const singleton = (title: string) => ({ prepare: () => ({ title }) });
const strings = (name: string, title: string, o: { description?: string } = {}) =>
  defineField({
    name,
    title,
    type: "array",
    of: [defineArrayMember({ type: "text", title: "Zeile", rows: 2 })],
    ...o,
    validation: (r) => r.required().min(1),
  });

export const nightIntro = defineType({
  name: "nightIntro",
  title: "Intro",
  type: "document",
  icon: MoonIcon,
  description: "Erscheint, während die Kamera in die Nacht hinauffliegt.",
  fields: [
    strings("lines", "Zeilen", { description: "Nacheinander eingeblendet." }),
    txt("transition", "Überleitung"),
    txt("statement", "Aussage", { description: "Was die Beratung ist, in zwei Sätzen." }),
    txt("hint", "Hinweis", { description: "Bittet darum, eine Lichtung auszuwählen." }),
    str("skip", "Überspringen"),
  ],
  preview: singleton("Intro"),
});

export const servicesOverview = defineType({
  name: "servicesOverview",
  title: "Leistungsübersicht",
  type: "document",
  icon: ListIcon,
  fields: [txt("intro", "Einleitung")],
  preview: singleton("Leistungsübersicht"),
});

export const area = defineType({
  name: "area",
  title: "Bereich",
  type: "document",
  icon: PinIcon,
  fields: [idField, str("title", "Titel")],
  preview: { select: { title: "title" } },
});

export const challenge = defineType({
  name: "challenge",
  title: "Herausforderung",
  type: "document",
  icon: SparklesIcon,
  description: "Eine Lichtung im Wald und der Weg, der dort beginnt.",
  fields: [
    idField,
    txt("line", "Zeile", { description: "Die Situation oder das Gefühl." }),
    txt("detail", "Einordnung", { description: "Ihre klare Einordnung." }),
    txt("noticed", "Woran du es merkst", { optional: true }),
    txt("behind", "Was dahintersteckt", { optional: true }),
    txt("support", "Wie ich dich unterstütze", { optional: true }),
    defineField({
      name: "stations",
      type: "array",
      title: "Stationen",
      description: "Die zwei Leistungen auf ihrem Weg, in den Worten dieser Herausforderung.",
      of: listOf("twoLines"),
      validation: (r) =>
        r.custom((stations, ctx) => {
          const id = (ctx.document as { id?: string } | undefined)?.id;
          const path = PATHS.find((p) => p.id === id) as { services?: unknown } | undefined;
          return !path?.services || (stations?.length ?? 0) === 2 ? true : "Dieser Weg führt an zwei Leistungen vorbei: Schreibe genau zwei Stationen.";
        }),
    }),
    typed("result", "twoLines", "Ergebnis", { description: "Was sich am Ende des Wegs verändert (die Vorschau der Berge)." }),
    txt("bafaNote", "BAFA-Hinweis", { optional: true, description: "Ein Hinweis zur BAFA-Förderung für diesen Weg." }),
  ],
  preview: { select: { title: "line", subtitle: "detail" } },
});

const EXTRA_KINDS = [
  { title: "Text", value: "text" },
  { title: "Studien", value: "research" },
];

const serviceExtra = defineArrayMember({
  name: "serviceExtra",
  title: "Block",
  type: "object",
  fields: [
    defineField({
      name: "kind",
      type: "string",
      title: "Art",
      options: { list: EXTRA_KINDS, layout: "radio", direction: "horizontal" },
      initialValue: "text",
      validation: (r) => r.required(),
    }),
    str("title", "Titel"),
    defineField({
      name: "text",
      type: "text",
      title: "Text",
      rows: 4,
      hidden: ({ parent }) => parent?.kind !== "text",
      validation: (r) => r.custom((text, ctx) => ((ctx.parent as { kind?: string })?.kind === "text" && !text ? "Pflichtfeld" : true)),
    }),
    defineField({
      name: "points",
      type: "array",
      title: "Punkte",
      of: listOf("textBlock"),
      hidden: ({ parent }) => parent?.kind !== "research",
      validation: (r) =>
        r.custom((points, ctx) => ((ctx.parent as { kind?: string })?.kind === "research" && !points?.length ? "Füge mindestens einen Punkt hinzu." : true)),
    }),
    defineField({ name: "source", type: "text", title: "Quellen", rows: 2, hidden: ({ parent }) => parent?.kind !== "research" }),
  ],
  preview: {
    select: { title: "title", kind: "kind" },
    prepare: ({ title, kind }) => ({ title, subtitle: EXTRA_KINDS.find((k) => k.value === kind)?.title }),
  },
});

export const service = defineType({
  name: "service",
  title: "Leistung",
  type: "document",
  icon: StarIcon,
  description: "Ein Licht der Stadt.",
  fields: [
    idField,
    str("title", "Titel"),
    typed("preview", "twoLines", "Vorschau", { description: "Beim Darüberfahren: eine Zeile, dann die klare Einordnung." }),
    txt("about", "Worum es geht"),
    defineField({ name: "extra", type: "array", title: "Weitere Blöcke", description: "Nach „Worum es geht“.", of: [serviceExtra] }),
    txt("forWhom", "Für wen", { optional: true }),
    txt("benefit", "Was du davon hast", { optional: true }),
    typed("highlight", "textBlock", "Hervorgehobenes Format", { optional: true, description: "Ein Format, das zuerst und hervorgehoben erscheint." }),
    str("bookTitle", "Titel über „Buchbar“", { optional: true, description: "Ohne Eintrag gilt die Beschriftung „Was du buchen kannst“." }),
    txt("book", "Buchbar"),
    txt("methods", "Methoden", { optional: true }),
  ],
  preview: { select: { title: "title" } },
});

export const road = defineType({
  name: "road",
  title: "Zusammenhang",
  type: "document",
  icon: LinkIcon,
  description: "Warum zwei Leistungen zusammengehören.",
  fields: [
    idField,
    txt("noticed", "Du merkst"),
    txt("why", "Warum beides zusammengehört"),
    txt("link", "Verbindung", { description: "Der Zusammenhang in einem Satz (fett; auch die Vorschau beim Darüberfahren)." }),
    txt("support", "Dabei unterstütze ich dich"),
  ],
  preview: { select: { title: "link", subtitle: "id" } },
});

export const results = defineType({
  name: "results",
  title: "Ergebnisse",
  type: "document",
  icon: TrendUpwardIcon,
  fields: [
    str("title", "Titel"),
    typed("preview", "twoLines", "Vorschau"),
    txt("intro", "Einleitung"),
    txt("emphasis", "Betonung", { description: "Ein Satz, hervorgehoben nach der Einleitung." }),
    strings("points", "Punkte"),
  ],
  preview: singleton("Ergebnisse"),
});

export const process = defineType({
  name: "process",
  title: "Vorgehen",
  type: "document",
  icon: HomeIcon,
  fields: [
    str("title", "Titel"),
    txt("intro", "Einleitung"),
    defineField({ name: "steps", type: "array", title: "Schritte", of: listOf("twoLines"), validation: (r) => r.required() }),
    defineField({
      name: "formats",
      type: "array",
      title: "Formate",
      of: [
        defineArrayMember({
          type: "object",
          name: "format",
          title: "Format",
          fields: [
            str("title", "Titel"),
            txt("text", "Text"),
            txt("note", "Anmerkung", { optional: true }),
            defineField({ name: "highlight", type: "boolean", title: "Hervorgehoben" }),
          ],
          preview: { select: { title: "title" } },
        }),
      ],
      validation: (r) => r.required(),
    }),
    txt("costs", "Kosten"),
  ],
  preview: singleton("Vorgehen"),
});

export const about = defineType({
  name: "about",
  title: "Über mich",
  type: "document",
  icon: UserIcon,
  fields: [
    defineField({
      name: "portrait",
      type: "contentImage",
      title: "Porträt",
      description: "4:5. Das Gesicht sollte gut zu erkennen sein. Bis eines gesetzt ist, steht ein Platzhalter da.",
    }),
    str("name", "Name"),
    str("role", "Rolle"),
    txt("intro", "Einleitung"),
    txt("approach", "So arbeite ich"),
    str("approachTags", "Schlagworte zur Arbeitsweise"),
    defineField({
      name: "stations",
      type: "array",
      title: "Stationen",
      of: [
        defineArrayMember({
          type: "object",
          name: "station",
          title: "Station",
          fields: [str("years", "Jahre"), txt("text", "Text")],
          preview: { select: { title: "years", subtitle: "text" } },
        }),
      ],
      validation: (r) => r.required(),
    }),
    txt("education", "Ausbildung"),
    txt("more", "Außerdem"),
  ],
  preview: singleton("Über mich"),
});

export const testimonials = defineType({
  name: "testimonials",
  title: "Kundenstimmen",
  type: "document",
  icon: CommentIcon,
  fields: [
    defineField({
      name: "items",
      title: "Kundenstimmen",
      type: "array",
      description: `Höchstens ${TESTIMONIAL_HOMES.length} (je ein Glühwürmchen). Nur mit schriftlicher Einwilligung.`,
      of: [
        defineArrayMember({
          type: "object",
          name: "testimonial",
          title: "Kundenstimme",
          fields: [txt("quote", "Zitat"), str("name", "Name"), str("role", "Rolle"), str("company", "Unternehmen")],
          preview: { select: { title: "name", subtitle: "company" } },
        }),
      ],
      validation: (r) => r.max(TESTIMONIAL_HOMES.length),
    }),
  ],
  preview: singleton("Kundenstimmen"),
});

export const bafa = defineType({
  name: "bafa",
  title: "BAFA-Förderung",
  type: "document",
  icon: BillIcon,
  fields: [
    str("title", "Titel"),
    txt("text", "Text"),
    defineField({
      name: "enabledUntil",
      type: "date",
      title: "Läuft bis",
      description: "Letzter Tag der Förderung (einschließlich). Sie endet um Mitternacht deutscher Zeit.",
      validation: (r) => r.required(),
    }),
    txt("faqNote", "Hinweis in den FAQ", { description: "Wird an FAQ-Antworten mit BAFA-Markierung angehängt." }),
    txt("pathNote", "Hinweis auf Wegen", { description: "Auf einem geförderten Weg ohne eigenen BAFA-Hinweis." }),
  ],
  preview: singleton("BAFA-Förderung"),
});

export const faq = defineType({
  name: "faq",
  title: "Häufige Fragen",
  type: "document",
  icon: HelpCircleIcon,
  fields: [
    defineField({
      name: "items",
      title: "Fragen",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          name: "faqItem",
          title: "Frage",
          fields: [
            str("question", "Frage"),
            txt("answer", "Antwort"),
            defineField({ name: "bafa", type: "boolean", title: "BAFA", description: "Hängt den Förderhinweis an, solange die Förderung läuft." }),
          ],
          preview: { select: { title: "question" } },
        }),
      ],
    }),
  ],
  preview: singleton("Häufige Fragen"),
});

export const contact = defineType({
  name: "contact",
  title: "Kontakt",
  type: "document",
  icon: EnvelopeIcon,
  fields: [
    txt("preview", "Vorschau"),
    str("title", "Titel"),
    txt("text", "Text"),
    str("cta", "Knopf"),
    email("email", "E-Mail"),
    str("phone", "Telefon"),
    str("mailSubject", "Betreff der Mail"),
    txt("mailChallenge", "Zeile vor der Herausforderung", { description: "In der Mail; danach folgt die Herausforderung der Besucher:in." }),
    txt("newsletter", "Newsletter"),
  ],
  preview: singleton("Kontakt"),
});

export const nightLabels = defineType({
  name: "nightLabels",
  title: "Beschriftungen der Karte",
  type: "document",
  icon: TagsIcon,
  description: "Beschriftungen, die nur die Nachtkarte zeigt. Die, die auch am Tag zu sehen sind, stehen unter Einstellungen: Beschriftungen.",
  fields: [
    labels(
      "nav",
      "Navigation",
      {
        services: "Leistungen",
        process: "Vorgehen",
        about: "Über mich",
        contact: "Handlungsaufforderung",
        contactShort: "Handlungsaufforderung (kurz)",
      },
      { description: "Die Bereiche und die Handlungsaufforderung, in der oberen Navigation, im Menü und im Footer." },
    ),
    labels("footer", "Footer", { faq: "Häufige Fragen" }),
    labels("map", "Karte", {
      label: "Karte (für Screenreader)",
      challenges: "Gruppe der Lichtungen",
      more: "Gruppe der weiteren Orte",
      tapToOpen: "Hinweis zum Öffnen (Touch)",
    }),
    labels("path", "Weg", {
      station: "Station",
      more: "Link zur Leistung („Mehr zu …“)",
      bafaLink: "Link zur Förderung",
      results: "Link zu den Ergebnissen",
      yourClearing: "Deine Lichtung (Kontakt)",
      roads: "Zusammenhänge (Leistung)",
      sources: "Quellen",
    }),
    labels(
      "categories",
      "Kategorien",
      {
        challenge: "Herausforderung",
        service: "Leistung",
        road: "Zusammenhang",
        results: "Ergebnisse",
        process: "Vorgehen",
        about: "Über mich",
        testimonial: "Kundenstimme",
        bafa: "Förderung",
        faq: "Häufige Fragen",
        contact: "Kontakt",
        services: "Leistungen",
      },
      { description: "Die kleine Zeile über dem Titel eines Panels." },
    ),
    labels(
      "blocks",
      "Blocktitel",
      {
        noticed: "Herausforderung: Woran du es merkst",
        behind: "Herausforderung: Was dahintersteckt",
        support: "Herausforderung: Wie ich dich unterstütze",
        about: "Leistung: Worum es geht",
        forWhom: "Leistung: Für wen",
        benefit: "Leistung: Was du davon hast",
        book: "Leistung: Was du buchen kannst",
        methods: "Leistung: Methoden",
        roadNoticed: "Zusammenhang: Du merkst",
        roadWhy: "Zusammenhang: Warum beides zusammengehört",
        roadSupport: "Zusammenhang: Dabei unterstütze ich dich",
        approach: "Über mich: So arbeite ich",
        stations: "Über mich: Stationen",
        education: "Über mich: Ausbildung",
        more: "Über mich: Außerdem",
        formats: "Vorgehen: Formate",
        costs: "Vorgehen: Kosten",
        steps: "Vorgehen: So läuft es ab",
      },
      { description: "Die Überschriften der Blöcke in den Panels." },
    ),
    str("related", "Weiterlesen"),
  ],
  preview: singleton("Beschriftungen der Karte"),
});

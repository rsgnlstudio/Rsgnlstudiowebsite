import type { StructureBuilder, StructureResolver } from "sanity/structure";
import { type FixedItemType, SINGLETONS, fixedItems } from "@/sanity/fixedDocuments";

type SingletonId = (typeof SINGLETONS)[number]["_id"];

/** One fixed document, opened directly. */
const single = (S: StructureBuilder, id: SingletonId) => {
  const s = SINGLETONS.find((d) => d._id === id)!;
  return S.listItem().id(s._id).title(s.title).schemaType(s.type).child(S.document().schemaType(s.type).documentId(s._id).title(s.title));
};

/** The fixed documents of one type, in scene order. */
const items = (S: StructureBuilder, type: FixedItemType, title: string) =>
  S.listItem()
    .id(type)
    .title(title)
    .schemaType(type)
    .child(
      S.list()
        .title(title)
        .items(fixedItems(type).map((d) => S.documentListItem().id(d._id).schemaType(type))),
    );

const group = (S: StructureBuilder, title: string, children: ReturnType<StructureBuilder["listItem"]>[]) =>
  S.listItem().title(title).child(S.list().title(title).items(children));

/** The Studio's sidebar, grouped like the site: settings, the day, the night, the imprint. Titles in German, like the content. */
export const structure: StructureResolver = (S) =>
  S.list()
    .title("Inhalte")
    .items([
      group(S, "Einstellungen", [single(S, "siteSettings"), single(S, "uiLabels")]),
      S.divider(),
      group(S, "Tag: Kunst", [single(S, "dayStudio"), items(S, "project", "Projekte")]),
      group(S, "Nacht: Consulting", [
        single(S, "nightIntro"),
        items(S, "area", "Bereiche"),
        items(S, "challenge", "Herausforderungen"),
        single(S, "servicesOverview"),
        items(S, "service", "Leistungen"),
        items(S, "road", "Zusammenhänge"),
        single(S, "results"),
        single(S, "process"),
        single(S, "about"),
        single(S, "testimonials"),
        single(S, "bafa"),
        single(S, "faq"),
        single(S, "contact"),
        single(S, "nightLabels"),
      ]),
      S.divider(),
      group(S, "Rechtliches", [single(S, "legal-imprint")]),
    ]);

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

/** The Studio's sidebar, grouped like the site: settings, the day, the night, the imprint. */
export const structure: StructureResolver = (S) =>
  S.list()
    .title("Content")
    .items([
      group(S, "Settings", [single(S, "siteSettings"), single(S, "uiLabels")]),
      S.divider(),
      group(S, "Day: art studio", [single(S, "dayStudio"), items(S, "project", "Projects")]),
      group(S, "Night: consulting", [
        single(S, "nightIntro"),
        items(S, "area", "Areas"),
        items(S, "challenge", "Challenges"),
        single(S, "servicesOverview"),
        items(S, "service", "Services"),
        items(S, "road", "Roads"),
        single(S, "results"),
        single(S, "process"),
        single(S, "about"),
        single(S, "testimonials"),
        single(S, "bafa"),
        single(S, "faq"),
        single(S, "contact"),
      ]),
      S.divider(),
      group(S, "Legal", [single(S, "legal.imprint")]),
    ]);

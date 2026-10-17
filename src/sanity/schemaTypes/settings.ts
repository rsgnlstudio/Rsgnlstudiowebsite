import { CogIcon } from "@sanity/icons/Cog";
import { TagIcon } from "@sanity/icons/Tag";
import { defineType } from "sanity";
import { email, labels, obj, str, txt } from "./fields";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Website-Einstellungen",
  type: "document",
  icon: CogIcon,
  fields: [
    str("name", "Wortmarke", { description: "Steht für das Logo." }),
    obj("metadata", "Suchmaschinen", [str("title", "Titel"), txt("description", "Beschreibung")], {
      description: "Titel und Beschreibung in Suchergebnissen und Link-Vorschauen.",
    }),
    email("contactEmail", "Kontakt-E-Mail", { description: "Im Footer am Tag und im Impressum." }),
  ],
  preview: { prepare: () => ({ title: "Website-Einstellungen" }) },
});

export const uiLabels = defineType({
  name: "uiLabels",
  title: "Beschriftungen",
  type: "document",
  icon: TagIcon,
  description: "Beschriftungen, die auch am Tag zu sehen sind. Die der Nachtkarte stehen unter Nacht: Beschriftungen der Karte.",
  fields: [
    labels("nav", "Navigation", {
      main: "Hauptnavigation (für Screenreader)",
      menu: "Menü öffnen",
      closeMenu: "Menü schließen",
      sound: "Ton",
    }),
    labels("footer", "Footer", { label: "Footer (für Screenreader)", contact: "Kontakt", imprint: "Impressum" }),
    str("close", "Schließen"),
    str("back", "Zurück"),
    obj(
      "notFound",
      "Seite nicht gefunden",
      [str("metaTitle", "Titel im Browser-Tab"), str("title", "Titel"), txt("text", "Text"), str("home", "Link zur Startseite")],
      { description: "Erscheint für eine Adresse, die es nicht gibt." },
    ),
  ],
  preview: { prepare: () => ({ title: "Beschriftungen" }) },
});

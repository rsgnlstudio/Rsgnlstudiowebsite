import { CogIcon } from "@sanity/icons/Cog";
import { TagIcon } from "@sanity/icons/Tag";
import { defineType } from "sanity";
import { labels, obj, str, txt } from "./fields";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site settings",
  type: "document",
  icon: CogIcon,
  fields: [
    str("name", { title: "Wordmark", description: "Stands in for the logo." }),
    obj("metadata", [str("title"), txt("description")], { title: "Search engines", description: "Title and description in search results and link previews." }),
    str("contactEmail", { title: "Contact e-mail", description: "In the day footer and the imprint." }),
  ],
  preview: { prepare: () => ({ title: "Site settings" }) },
});

export const uiLabels = defineType({
  name: "uiLabels",
  title: "UI labels",
  type: "document",
  icon: TagIcon,
  description: "Navigation, categories and block titles.",
  fields: [
    labels("nav", ["main", "services", "process", "about", "contact", "contactShort", "menu", "closeMenu", "sound"], { title: "Navigation" }),
    labels("footer", ["label", "faq", "contact", "imprint"]),
    labels("map", ["label", "challenges", "more", "tapToOpen"]),
    labels("path", ["station", "more", "bafaLink", "results", "yourClearing", "roads", "sources"]),
    labels("categories", ["challenge", "service", "road", "results", "process", "about", "testimonial", "bafa", "faq", "contact", "services"]),
    labels("blocks", [
      "noticed", "behind", "support", "about", "forWhom", "benefit", "book", "methods", "roadNoticed", "roadWhy",
      "roadSupport", "approach", "stations", "education", "more", "formats", "costs", "steps",
    ], { title: "Block titles" }),
    str("related"),
    str("close"),
    str("back"),
  ],
  preview: { prepare: () => ({ title: "UI labels" }) },
});

import type { SiteDocuments } from "@/content/schema";
import { consulting } from "./consulting";
import { legal } from "./legal";
import { projects } from "./projects";
import { site } from "./site";
import { studio } from "./studio";
import { ui } from "./ui";

/** The site's content as local seed data, until it comes from Sanity. */
export const siteDocuments: SiteDocuments = { site, studio, projects, consulting, ui, legal };

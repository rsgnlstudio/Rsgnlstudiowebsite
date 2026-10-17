import type { SiteDocuments } from "@/content/schema";
import { consulting } from "./consulting";
import { legal } from "./legal";
import { projects } from "./projects";
import { site } from "./site";
import { studio } from "./studio";
import { ui } from "./ui";

/**
 * Test fixture only: the content as it was first transferred to Sanity.
 * The site reads Sanity (`getSiteContent`); outside tests, nothing imports this.
 */
export const siteDocuments: SiteDocuments = { site, studio, projects, consulting, ui, legal };

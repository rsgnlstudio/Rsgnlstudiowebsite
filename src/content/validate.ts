import { PROJECT_BEDS } from "@/config/flowers";
import { AREAS, CITY_LIGHTS, CLEARINGS, PATHS, ROADS, TESTIMONIAL_HOMES } from "@/config/nightMap";
import type { SiteDocuments } from "@/content/schema";

const missing = (where: string, have: readonly { id: string }[], want: readonly { id: string }[]) =>
  want.filter((w) => !have.some((h) => h.id === w.id)).map((w) => `${where}: missing "${w.id}"`);

/**
 * What the content lacks for the layout, as readable problems (empty when
 * complete). Every place in the layout needs its copy; the CMS can't know
 * the layout, so this check stands between them.
 */
export function validateContent(docs: SiteDocuments): string[] {
  const { consulting } = docs;
  const problems = [
    ...missing("projects", docs.projects, PROJECT_BEDS),
    ...missing("consulting.areas", consulting.areas, AREAS),
    ...missing("consulting.challenges", consulting.challenges, CLEARINGS),
    ...missing("consulting.services", consulting.services, CITY_LIGHTS),
    ...missing("consulting.roads", consulting.roads, ROADS),
  ];
  for (const path of PATHS) {
    const challenge = consulting.challenges.find((c) => c.id === path.id);
    if (challenge && path.services && challenge.stations?.length !== 2) {
      problems.push(`consulting.challenges: "${path.id}" needs two stations`);
    }
  }
  if (consulting.testimonials.length > TESTIMONIAL_HOMES.length) {
    problems.push(`consulting.testimonials: at most ${TESTIMONIAL_HOMES.length}`);
  }
  const { enabledUntil } = consulting.bafa;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(enabledUntil) || Number.isNaN(Date.parse(enabledUntil))) {
    problems.push("consulting.bafa.enabledUntil: expected YYYY-MM-DD");
  }
  if (!docs.legal.some((page) => page.slug === "imprint")) problems.push('legal: missing "imprint"');
  return problems;
}

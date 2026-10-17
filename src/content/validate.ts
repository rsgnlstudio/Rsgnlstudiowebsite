import { PROJECT_BEDS } from "@/config/flowers";
import { AREAS, CITY_LIGHTS, CLEARINGS, PATHS, ROADS, TESTIMONIAL_HOMES } from "@/config/nightMap";
import type { SiteDocuments } from "@/content/schema";

const missing = (where: string, have: readonly { id: string }[], want: readonly { id: string }[]) =>
  want.filter((w) => !have.some((h) => h.id === w.id)).map((w) => `${where}: missing "${w.id}"`);

/** A real YYYY-MM-DD date: `Date.parse` rolls "2026-02-30" over to March, so it must format back to itself. */
const isCalendarDate = (date: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const time = Date.parse(`${date}T00:00:00Z`);
  return !Number.isNaN(time) && new Date(time).toISOString().startsWith(date);
};

/** Parts the components walk through or read from: a missing one would crash a render, not just leave a gap. */
function missingParts(docs: SiteDocuments): string[] {
  const { consulting: c } = docs;
  const parts: [string, unknown][] = [
    ["site.metadata", docs.site.metadata],
    ...(["entry", "dayHint", "timeOfDay"] as const).map((k): [string, unknown] => [`studio.${k}`, docs.studio[k]]),
    ...(["nav", "footer", "map", "path", "categories", "blocks", "notFound"] as const).map((k): [string, unknown] => [`ui.${k}`, docs.ui[k]]),
    ...docs.projects.map((p): [string, unknown] => [`projects["${p.id}"].media`, p.media]),
    ["consulting.intro.lines", c.intro?.lines],
    ...c.challenges.map((ch): [string, unknown] => [`consulting.challenges["${ch.id}"].result`, ch.result]),
    ...c.services.flatMap((s): [string, unknown][] => [
      [`consulting.services["${s.id}"].preview`, s.preview],
      ...(s.extra ?? []).flatMap((e, i): [string, unknown][] => (e.kind === "research" ? [[`consulting.services["${s.id}"].extra[${i}].points`, e.points]] : [])),
    ]),
    ["consulting.results.preview", c.results?.preview],
    ["consulting.results.points", c.results?.points],
    ["consulting.process.steps", c.process?.steps],
    ["consulting.process.formats", c.process?.formats],
    ["consulting.about.stations", c.about?.stations],
    ...docs.legal.map((page): [string, unknown] => [`legal["${page.slug}"].sections`, page.sections]),
  ];
  return parts.filter(([, value]) => value === undefined || value === null).map(([path]) => `${path}: missing`);
}

/**
 * What the content lacks for the layout, as readable problems (empty when
 * complete). Every place in the layout needs its copy; the CMS can't know
 * the layout, so this check stands between them.
 */
export function validateContent(docs: SiteDocuments): string[] {
  const { consulting } = docs;
  const problems = [
    ...missingParts(docs),
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
  if (!isCalendarDate(enabledUntil)) {
    problems.push("consulting.bafa.enabledUntil: expected YYYY-MM-DD");
  }
  if (!docs.legal.some((page) => page.slug === "imprint")) problems.push('legal: missing "imprint"');
  return problems;
}

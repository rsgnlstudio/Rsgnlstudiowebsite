import { NextStudio } from "next-sanity/studio";
import config from "@/../sanity.config";

export { metadata, viewport } from "next-sanity/studio";

/** Sanity Studio, where the site's content is edited (see sanity.config.ts). */
export default function StudioPage() {
  return <NextStudio config={config} />;
}

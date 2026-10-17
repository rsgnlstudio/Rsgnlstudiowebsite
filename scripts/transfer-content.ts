/**
 * One-off: writes the local seed content to Sanity as published documents,
 * or (`--verify`) checks that Sanity returns exactly the seed.
 * npx -y tsx --env-file=.env.local scripts/transfer-content.ts [--verify]
 */
import { isDeepStrictEqual } from "node:util";
import { siteDocuments } from "@/content/data";
import { client } from "@/sanity/client";
import { fromSanity } from "@/sanity/fromSanity";
import { SITE_QUERY } from "@/sanity/query";
import { toSanity } from "@/sanity/toSanity";

async function main() {
  if (process.argv.includes("--verify")) {
    const fetched = fromSanity(await client.fetch(SITE_QUERY));
    const same = isDeepStrictEqual(JSON.parse(JSON.stringify(fetched)), JSON.parse(JSON.stringify(siteDocuments)));
    console.log(same ? "Sanity matches the seed." : "Sanity differs from the seed.");
    if (!same) process.exit(1);
    return;
  }
  const token = process.env.SANITY_API_WRITE_TOKEN;
  if (!token) throw new Error("SANITY_API_WRITE_TOKEN is missing (.env.local).");
  const docs = toSanity(siteDocuments);
  const tx = client.withConfig({ token }).transaction();
  for (const doc of docs) tx.createOrReplace(doc);
  await tx.commit();
  console.log(`Wrote ${docs.length} documents.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

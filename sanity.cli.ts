import { fileURLToPath } from "node:url";
import { defineCliConfig } from "sanity/cli";
import { dataset, projectId } from "./src/sanity/env";

/** For `npx sanity …` (e.g. `schema deploy`); resolves the `@/` alias like Next does. */
export default defineCliConfig({
  api: { projectId, dataset },
  vite: (config) => ({
    ...config,
    resolve: { ...config.resolve, alias: { ...config.resolve?.alias, "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  }),
});

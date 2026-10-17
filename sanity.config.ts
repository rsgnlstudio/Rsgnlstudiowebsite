"use client";

import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { dataset, projectId } from "@/sanity/env";
import { schemaTypes } from "@/sanity/schemaTypes";
import { structure } from "@/sanity/structure";

/** Every document is fixed (src/sanity/fixedDocuments.ts): editing and publishing, nothing else. */
const ALLOWED_ACTIONS = new Set(["publish", "discardChanges", "restore"]);

/** The Studio at /studio (src/app/studio). */
export default defineConfig({
  name: "default",
  title: "RSGNL Studio",
  basePath: "/studio",
  projectId,
  dataset,
  plugins: [structureTool({ structure })],
  schema: { types: schemaTypes, templates: () => [] },
  document: {
    newDocumentOptions: () => [],
    actions: (prev) => prev.filter((action) => action.action && ALLOWED_ACTIONS.has(action.action)),
  },
});

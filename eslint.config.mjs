import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // The site's content comes from Sanity; the fixtures are for tests only.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/**/*.test.ts", "src/content/fixtures/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{ group: ["@/content/fixtures", "@/content/fixtures/*"], message: "Content comes from Sanity (getSiteContent / useContent); the fixtures are for tests." }] }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;

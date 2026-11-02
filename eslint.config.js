import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import pluginCypress from "eslint-plugin-cypress";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

// Layering (see CLAUDE.md, "Code map"):
//   app -> features -> components -> domain -> hooks / lib / api
// A layer may import the layers to its right, never to its left. Features and
// domain modules are imported through their index.ts, never by deep path.
const deepImport = {
  group: ["@/features/*/**", "@/domain/*/**"],
  message:
    'Import features and domain modules through their public index ("@/features/<name>", "@/domain/<name>").',
};
const upward = (layers, who) => ({
  group: layers.flatMap((l) => [`@/${l}`, `@/${l}/**`]),
  message: `${who} cannot import from ${layers.join(", ")}.`,
});
const restrict = (...patterns) => ({
  "no-restricted-imports": ["error", { patterns }],
});

export default defineConfig([
  globalIgnores(["dist", "coverage", ".nyc_output", ".claude"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    // shadcn/ui generates files that export variants alongside components
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    files: ["src/app/**/*.{ts,tsx}", "src/features/**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}", "**/*.cy.{ts,tsx}"],
    rules: restrict(deepImport, upward(["app"], "Features")),
  },
  {
    files: ["src/domain/**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}", "**/*.cy.{ts,tsx}"],
    rules: restrict(
      deepImport,
      upward(["app", "features", "components"], "Domain modules"),
    ),
  },
  {
    files: ["src/components/**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}", "**/*.cy.{ts,tsx}"],
    rules: restrict(
      deepImport,
      upward(["app", "features"], "Shared components"),
    ),
  },
  {
    files: [
      "src/lib/**/*.{ts,tsx}",
      "src/hooks/**/*.{ts,tsx}",
      "src/api/**/*.ts",
    ],
    ignores: ["**/*.test.{ts,tsx}"],
    rules: restrict(
      upward(["app", "features", "domain", "components"], "lib, hooks and api"),
    ),
  },
  {
    // Cypress specs and support code: the rules behind the Cypress
    // best-practices guide (data-cy selectors, no arbitrary waits, no
    // assigning command return values, no .pause()/.debug() left behind).
    files: ["cypress/**/*.{ts,tsx}", "src/**/*.cy.tsx"],
    extends: [pluginCypress.configs.recommended],
    rules: {
      "cypress/require-data-selectors": "error",
      "cypress/no-force": "error",
      "cypress/no-pause": "error",
      "cypress/no-debug": "error",
      "cypress/no-and": "off",
      "react-refresh/only-export-components": "off",
    },
  },
  {
    // The selector commands are the one place that builds data-cy queries.
    files: ["cypress/support/commands/selectors.ts"],
    rules: { "cypress/require-data-selectors": "off" },
  },
  {
    files: ["*.config.ts", "scripts/**/*.mjs", "cypress.config.ts"],
    languageOptions: { globals: globals.node },
  },
]);

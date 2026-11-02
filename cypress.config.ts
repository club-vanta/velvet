import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { defineConfig } from "cypress";
import registerCodeCoverageTasks from "@cypress/code-coverage/task";

// Stubbed E2E runs point the app at a host that does not exist, so a request
// that no test stubbed fails loudly instead of reaching a real backend.
// Keep in sync with VITE_API_BASE_URL in .env.e2e.
const STUB_API_URL = "http://api.e2e.test";

// The smoke suite seeds a local alter-tracker-backend checkout. Override the
// path with VELVET_BACKEND_DIR.
const BACKEND_DIR = resolve(
  process.env.VELVET_BACKEND_DIR ?? "../alter-tracker-backend",
);

const tasks = {
  // Prints a table in the terminal (used to report accessibility violations).
  table(rows: unknown[]) {
    console.table(rows);
    return null;
  },
  // Resets the smoke suite's organization in the local backend database and
  // returns the seeded IDs (see scripts/seed_e2e.py in the backend). It runs
  // a script that exits; the backend server itself is started before Cypress.
  "db:seed"() {
    const output = execFileSync(
      "uv",
      ["run", "python", "scripts/seed_e2e.py"],
      {
        cwd: BACKEND_DIR,
        env: { ...process.env, PYTHONPATH: "." },
        encoding: "utf8",
      },
    );
    return JSON.parse(output.trim().split("\n").at(-1) ?? "null");
  },
};

export default defineConfig({
  // Public, non-secret values read with Cypress.expose(). Override from the CLI
  // with --expose, e.g. the smoke suite passes apiUrl and realBackend.
  expose: {
    apiUrl: STUB_API_URL,
    realBackend: false,
  },
  // Secrets read with cy.env(); they never reach the browser bundle.
  env: {
    e2ePassword: process.env.E2E_PASSWORD,
  },
  viewportWidth: 1280,
  viewportHeight: 800,
  retries: { runMode: 2, openMode: 0 },
  video: false,
  screenshotOnRunFailure: true,
  e2e: {
    baseUrl: "http://localhost:5200",
    specPattern: "cypress/e2e/**/*.cy.ts",
    // The smoke suite needs a real backend; run it with `npm run test:smoke`.
    excludeSpecPattern: process.env.CYPRESS_SMOKE
      ? []
      : ["cypress/e2e/smoke/**"],
    supportFile: "cypress/support/e2e.ts",
    setupNodeEvents(on, config) {
      registerCodeCoverageTasks(on, config);
      on("task", tasks);
      return config;
    },
  },
  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
      // The app's Vite config in "e2e" mode: same API host as the E2E suite
      // (.env.e2e), so a component can never reach a real backend.
      viteConfig: async () => {
        const { default: appConfig } = await import("./vite.config");
        const config =
          typeof appConfig === "function"
            ? await appConfig({ mode: "e2e", command: "serve" })
            : appConfig;
        return { ...config, mode: "e2e" };
      },
    },
    specPattern: "src/**/*.cy.tsx",
    supportFile: "cypress/support/component.tsx",
    indexHtmlFile: "cypress/support/component-index.html",
    setupNodeEvents(on, config) {
      registerCodeCoverageTasks(on, config);
      on("task", tasks);
      return config;
    },
  },
});

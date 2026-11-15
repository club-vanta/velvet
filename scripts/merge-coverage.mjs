// Merges unit (Vitest) and Cypress (E2E + component) coverage into one report
// in coverage/all. Run through `npm run coverage`, which produces both inputs.
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";

const inputs = {
  "unit.json": "coverage/unit/coverage-final.json",
  "cypress.json": "coverage/cypress/coverage-final.json",
};
const tmp = "coverage/.merge";
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
for (const [name, file] of Object.entries(inputs)) {
  if (!existsSync(file)) {
    console.error(`Missing ${file}. Run \`npm run coverage\`.`);
    process.exit(1);
  }
  const coverage = JSON.parse(readFileSync(file, "utf8"));
  // Vitest covers only pure logic and hooks, so its .tsx data is almost all
  // misses. The React Compiler also rewrites .tsx files before they are
  // instrumented, and Vitest and vite-plugin-istanbul map that output back to
  // different source locations. nyc merges by location, so Vitest's .tsx
  // statements would be added next to Cypress's as uncovered duplicates and
  // pull the total below Cypress alone. Keep Vitest's .ts files only, where
  // both suites produce the same locations.
  if (name === "unit.json") {
    for (const path of Object.keys(coverage)) {
      if (path.endsWith(".tsx")) delete coverage[path];
    }
  }
  writeFileSync(`${tmp}/${name}`, JSON.stringify(coverage));
}
const nyc = (...args) =>
  execFileSync("npx", ["nyc", ...args], { stdio: "inherit" });
nyc(
  "report",
  "--temp-dir",
  tmp,
  "--report-dir",
  "coverage/all",
  "--reporter",
  "html",
  "--reporter",
  "lcov",
  "--reporter",
  "text-summary",
);
rmSync(tmp, { recursive: true, force: true });
console.log("Combined report: coverage/all/index.html");

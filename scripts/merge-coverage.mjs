// Merges unit (Vitest) and Cypress (E2E + component) coverage into one report
// in coverage/all. Run through `npm run coverage`, which produces both inputs.
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
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
  cpSync(file, `${tmp}/${name}`);
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

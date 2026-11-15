// Only the page: App.tsx lazy-loads this module so recharts stays out of the
// main bundle. Do not export anything that other features import eagerly.
export { StatsPage } from "./StatsPage";

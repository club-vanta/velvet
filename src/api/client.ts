import createClient from "openapi-fetch";
import type { paths } from "./types";

// Run `npm run generate:api` to regenerate types from the backend OpenAPI schema.
// If the backend URL changes, update VITE_API_BASE_URL in your .env file.
export const api = createClient<paths>({
  baseUrl:
    import.meta.env.VITE_API_BASE_URL ??
    "https://api-alter-tracker.club-vanta.com",
});

import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./types";

// Run `npm run generate:api` to regenerate types from the backend OpenAPI schema.
// If the backend URL changes, update VITE_API_BASE_URL in your .env file.

const TOKEN_KEY = "auth_token";

let _token: string | null = localStorage.getItem(TOKEN_KEY);

/** Called by AuthContext when the token is set or cleared. */
export function setAuthToken(token: string | null): void {
  _token = token;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    if (_token) {
      request.headers.set("Authorization", `Bearer ${_token}`);
    }
    return request;
  },
};

export const api = createClient<paths>({
  baseUrl:
    import.meta.env.VITE_API_BASE_URL ??
    "https://api-alter-tracker.club-vanta.com",
});

api.use(authMiddleware);

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ??
  "https://api-alter-tracker.club-vanta.com";

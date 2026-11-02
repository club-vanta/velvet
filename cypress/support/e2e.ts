// Runs before every E2E spec. Keep it lean: it is bundled into every spec.
import "@cypress/code-coverage/support";
import "./commands";
import { failOnUnstubbedApiRequests } from "./commands/api";

beforeEach(() => {
  failOnUnstubbedApiRequests();
});

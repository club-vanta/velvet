// Typed factories for API payloads, shared by Vitest and Cypress. Each returns
// a complete object of the generated schema type; pass overrides for the
// fields a test cares about. Never cast a partial object instead.
export * from "./admin";
export * from "./guest";
export * from "./meetup";
export * from "./meetups";
export * from "./schemas";
export * from "./session";
export * from "./stats";

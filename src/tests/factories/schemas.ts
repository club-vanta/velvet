import type { components } from "../../api/types";

/** Shorthand for a generated API schema type. */
export type Schema<K extends keyof components["schemas"]> =
  components["schemas"][K];

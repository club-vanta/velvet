/**
 * Whether a guest is vanted in the active org. "unknown" while the org's
 * vanted list is loading or failed to load: that is not "clear", so actions
 * that depend on it wait until it is known.
 */
export type VantStatus = "unknown" | "vanted" | "clear";

export function vantStatus(known: boolean, vanted: boolean): VantStatus {
  if (!known) return "unknown";
  return vanted ? "vanted" : "clear";
}

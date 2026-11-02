import type { TranslationKey } from "@/lib/i18n";

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

/**
 * Why unlinking Mazmo is unavailable, or null when it is available. The
 * backend refuses to unlink a guest vanted in any org (ban-evasion guard), so
 * it is only offered once the guest is known not to be vanted here. A vant in
 * another org still ends in the backend's 409.
 */
export function unlinkBlockedReason(status: VantStatus): TranslationKey | null {
  switch (status) {
    case "clear":
      return null;
    case "vanted":
      return "unlinkBlockedVanted";
    case "unknown":
      return "unlinkBlockedUnknown";
  }
}

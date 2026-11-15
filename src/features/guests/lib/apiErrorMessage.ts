import { extractApiError } from "@/api/errors";
import type { TranslationKey } from "@/lib/i18n";

/** Statuses every Mazmo lookup (add by handle, link) can answer with. */
export const MAZMO_LOOKUP_ERRORS = {
  404: "mazmoUserNotFound",
  504: "mazmoUnreachable",
} as const satisfies Record<number, TranslationKey>;

/**
 * The message for a failed request: our own copy for the statuses listed in
 * `byStatus`, otherwise the backend's `detail`, otherwise `fallback`.
 */
export function apiErrorMessage(
  status: number,
  error: unknown,
  byStatus: Partial<Record<number, TranslationKey>>,
  fallback: TranslationKey,
  t: (key: TranslationKey) => string,
): string {
  const key = byStatus[status];
  return key ? t(key) : extractApiError(error, t(fallback));
}

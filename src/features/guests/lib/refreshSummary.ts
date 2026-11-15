import type { components } from "@/api/types";
import type { TranslationKey } from "@/lib/i18n";

type RefreshResponse = components["schemas"]["GuestMazmoRefreshResponse"];

/** What a Mazmo refresh did, mentioning the guests Mazmo didn't return. */
export function refreshSummary(
  { refreshed, not_found }: RefreshResponse,
  t: (key: TranslationKey) => string,
): string {
  return not_found > 0
    ? t("guestsRefreshedPartialToast")
        .replace("{0}", String(refreshed))
        .replace("{1}", String(not_found))
    : t("guestsRefreshedToast").replace("{0}", String(refreshed));
}

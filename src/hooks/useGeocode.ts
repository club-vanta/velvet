import { keepPreviousData, skipToken, useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { extractApiError } from "@/api/errors";
import { useLanguage } from "@/lib/i18n";
import { geocodeKey } from "@/lib/queryKeys";

const MIN_QUERY_LENGTH = 3;
const STALE_TIME_MS = 5 * 60 * 1000;

/**
 * Address matches in Argentina for the text typed so far. Debouncing the
 * input is the caller's job; shorter queries make no request. The previous
 * results stay in `data` while the next search loads (`isPlaceholderData` is
 * true then), so the result list does not blank between keystrokes.
 */
export function useGeocode(orgId: string, q: string) {
  const { t } = useLanguage();
  const query = q.trim();
  return useQuery({
    queryKey: geocodeKey(orgId, query),
    queryFn:
      orgId && query.length >= MIN_QUERY_LENGTH
        ? async () => {
            const { data, error } = await api.GET(
              "/organizations/{org_id}/geocode",
              { params: { path: { org_id: orgId }, query: { q: query } } },
            );
            if (error)
              throw new Error(extractApiError(error, t("failedSearchAddress")));
            return data;
          }
        : skipToken,
    staleTime: STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });
}

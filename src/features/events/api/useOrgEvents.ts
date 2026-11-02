import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { orgEventsKey } from "@/api/queryKeys";
import { useLanguage } from "@/lib/i18n";

export const EVENTS_PAGE_SIZE = 50;

/**
 * The org's audit log, newest first, one page of 50 at a time; "Load more"
 * appends the next page. `type` "all" lists every type.
 */
export function useOrgEvents(orgId: string, type: string) {
  const { t } = useLanguage();
  return useInfiniteQuery({
    queryKey: orgEventsKey(orgId, type),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await api.GET("/organizations/{org_id}/events/", {
        params: {
          path: { org_id: orgId },
          query: {
            limit: EVENTS_PAGE_SIZE,
            offset: pageParam,
            ...(type !== "all" && { type }),
          },
        },
      });
      // The 4xx bodies are typed `unknown`, so `error` alone does not narrow `data`.
      if (error || !data) throw new Error(t("failedLoadAuditLog"));
      return data;
    },
    initialPageParam: 0,
    getNextPageParam: (page, _pages, offset) => {
      const next = offset + page.events.length;
      return page.events.length === EVENTS_PAGE_SIZE && next < page.total
        ? next
        : undefined;
    },
    enabled: !!orgId,
  });
}

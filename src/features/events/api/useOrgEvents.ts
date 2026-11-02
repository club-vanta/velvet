import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { orgEventsKey } from "@/api/queryKeys";
import { useLanguage } from "@/lib/i18n";

export const EVENTS_PAGE_SIZE = 50;

/** One page of the org's audit log; `type` "all" lists every type. */
export function useOrgEvents(orgId: string, type: string, offset: number) {
  const { t } = useLanguage();
  return useQuery({
    queryKey: [...orgEventsKey(orgId, type), offset],
    queryFn: async () => {
      const { data, error } = await api.GET("/organizations/{org_id}/events/", {
        params: {
          path: { org_id: orgId },
          query: {
            limit: EVENTS_PAGE_SIZE,
            offset,
            ...(type !== "all" && { type }),
          },
        },
      });
      if (error) throw new Error(t("failedLoadAuditLog"));
      return data;
    },
    enabled: !!orgId,
  });
}

import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useLanguage } from "@/lib/i18n";
import { meetupsKey } from "@/lib/queryKeys";

/** Every meetup of an org. */
export function useOrgMeetups(orgId: string) {
  const { t } = useLanguage();
  return useQuery({
    queryKey: meetupsKey(orgId),
    queryFn: async () => {
      const { data, error } = await api.GET(
        "/organizations/{org_id}/meetups/",
        { params: { path: { org_id: orgId } } },
      );
      if (error) throw new Error(t("failedLoadMeetups"));
      return data;
    },
    enabled: !!orgId,
  });
}

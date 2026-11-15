import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { organizationsKey } from "@/api/queryKeys";
import { useLanguage } from "@/lib/i18n";

/**
 * Every organization, which only site admins may list. The org switcher and
 * the organizations page share this one query, so they share its cache entry
 * and its translated error.
 */
export function useAllOrganizations({ enabled }: { enabled: boolean }) {
  const { t } = useLanguage();
  return useQuery({
    queryKey: organizationsKey,
    queryFn: async () => {
      const { data, error } = await api.GET("/organizations/");
      if (error) throw new Error(t("failedLoadOrgs"));
      return data;
    },
    enabled,
  });
}

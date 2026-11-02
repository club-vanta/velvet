import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { pendingStaffKey, staffKey } from "@/api/queryKeys";
import { useLanguage } from "@/lib/i18n";

/** Every staff account. Site admins only. */
export function useAllStaff() {
  const { t } = useLanguage();
  return useQuery({
    queryKey: staffKey,
    queryFn: async () => {
      const { data, error } = await api.GET("/staff/");
      if (error) throw new Error(t("failedLoadStaff"));
      return data;
    },
  });
}

/**
 * Accounts waiting for approval. The endpoint is for site admins only, so
 * other roles pass `enabled: false` and the request is never made.
 */
export function usePendingStaff({
  enabled = true,
}: { enabled?: boolean } = {}) {
  const { t } = useLanguage();
  return useQuery({
    queryKey: pendingStaffKey,
    queryFn: async () => {
      const { data, error } = await api.GET("/staff/pending");
      if (error) throw new Error(t("failedLoadPending"));
      return data;
    },
    enabled,
  });
}

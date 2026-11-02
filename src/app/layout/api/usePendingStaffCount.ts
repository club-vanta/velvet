import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { pendingStaffKey } from "@/api/queryKeys";

/**
 * How many staff accounts wait for a site admin's approval, for the nav
 * badge. Only site admins may list them, so it is 0 for everyone else, and
 * while loading or after an error (the badge then simply does not show).
 */
export function usePendingStaffCount(isSiteAdmin: boolean): number {
  const { data } = useQuery({
    queryKey: pendingStaffKey,
    queryFn: async () => {
      const { data, error } = await api.GET("/staff/pending");
      if (error) throw new Error("Failed to load pending staff");
      return data;
    },
    enabled: isSiteAdmin,
  });
  return data?.length ?? 0;
}

import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { bannedGuestsKey } from "@/lib/queryKeys";

/**
 * The org's vanted guests with their reasons. Guest records carry no org ban
 * state, so every screen that needs one reads it from this shared list.
 */
export function useBannedGuests(orgId: string) {
  return useQuery({
    queryKey: bannedGuestsKey(orgId),
    queryFn: async () => {
      const { data, error } = await api.GET(
        "/organizations/{org_id}/guests/banned",
        { params: { path: { org_id: orgId } } },
      );
      if (error) throw new Error("Failed to load banned guests");
      return data;
    },
    enabled: !!orgId,
  });
}

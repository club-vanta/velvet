import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { guestHistoryKey } from "@/api/queryKeys";

/** Every name a guest has had, newest first. */
export function useGuestHistory(guestId: string) {
  return useQuery({
    queryKey: guestHistoryKey(guestId),
    queryFn: async () => {
      const { data, error } = await api.GET(
        "/guests/{guest_id}/displayname-history",
        { params: { path: { guest_id: guestId } } },
      );
      if (error) throw new Error("Failed to load name history");
      return data;
    },
  });
}

import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

/**
 * Every known guest (GET /guests/). The Guests page, the dashboard, and the
 * walk-in picker share this one cache entry, so they share this one query.
 */
export function useAllGuests() {
  return useQuery({
    queryKey: ["guests"],
    queryFn: async () => {
      const { data, error } = await api.GET("/guests/");
      if (error) throw new Error("Failed to load guests");
      return data;
    },
  });
}

import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { guestKey } from "@/api/queryKeys";

export class GuestNotFoundError extends Error {}

/** One guest's identity (GET /guests/{guest_id}). */
export function useGuest(guestId: string) {
  return useQuery({
    queryKey: guestKey(guestId),
    queryFn: async () => {
      const { data, error, response } = await api.GET("/guests/{guest_id}", {
        params: { path: { guest_id: guestId } },
      });
      if (response.status === 404) throw new GuestNotFoundError();
      if (error) throw new Error("Failed to load guest");
      return data;
    },
    // A 404 will not fix itself; anything else gets the app's single retry.
    retry: (count, err) => !(err instanceof GuestNotFoundError) && count < 1,
  });
}

import type { QueryClient } from "@tanstack/react-query";

export const meetupGuestsKey = (orgId: string, meetupId: string) =>
  ["meetup-guests", orgId, meetupId] as const;

export const meetupStatsKey = (orgId: string, meetupId: string) =>
  ["meetup-stats", orgId, meetupId] as const;

// Prefix of every per-guest query, so invalidating it also refreshes the
// displayname history.
export const guestKey = (guestId: string) => ["guest", guestId] as const;

export const guestHistoryKey = (guestId: string) =>
  ["guest", guestId, "displayname-history"] as const;

/**
 * Anything that changes an RSVP (check-in, payment, guest type, walk-in,
 * sync) also changes the meetup stats, so both are always refreshed together.
 */
export function invalidateMeetupGuests(
  queryClient: QueryClient,
  orgId: string,
  meetupId: string,
): void {
  void queryClient.invalidateQueries({
    queryKey: meetupGuestsKey(orgId, meetupId),
  });
  void queryClient.invalidateQueries({
    queryKey: meetupStatsKey(orgId, meetupId),
  });
}

/**
 * A guest's identity (name, Mazmo link, profile snapshot) shows up in the
 * global guest list, the vanted list, every meetup guest list, and the
 * guest's own profile.
 */
export function invalidateGuestIdentity(
  queryClient: QueryClient,
  guestId: string,
): void {
  void queryClient.invalidateQueries({ queryKey: ["guests"] });
  void queryClient.invalidateQueries({ queryKey: ["guests-banned"] });
  void queryClient.invalidateQueries({ queryKey: ["meetup-guests"] });
  void queryClient.invalidateQueries({ queryKey: guestKey(guestId) });
}

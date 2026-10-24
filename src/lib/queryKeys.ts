import type { QueryClient } from "@tanstack/react-query";
import type { StatsQuery } from "@/features/stats/statsPeriod";

export const meetupGuestsKey = (orgId: string, meetupId: string) =>
  ["meetup-guests", orgId, meetupId] as const;

export const meetupStatsKey = (orgId: string, meetupId: string) =>
  ["meetup-stats", orgId, meetupId] as const;

// Prefix of every per-guest identity query, so invalidating it also
// refreshes the displayname history.
export const guestKey = (guestId: string) => ["guest", guestId] as const;

export const guestHistoryKey = (guestId: string) =>
  ["guest", guestId, "displayname-history"] as const;

// Prefixed by org, not by guest: RSVP changes on a meetup page touch many
// guests at once, so they invalidate the whole org prefix.
export const guestMeetupsOrgKey = (orgId: string) =>
  ["guest-meetups", orgId] as const;

export const guestMeetupsKey = (orgId: string, guestId: string) =>
  [...guestMeetupsOrgKey(orgId), guestId] as const;

// Prefixed by org: check-ins and finalizing change every period's numbers,
// so they invalidate the whole org prefix.
export const statsOrgKey = (orgId: string) => ["stats", orgId] as const;

export const statsAttendanceKey = (orgId: string, filters: StatsQuery) =>
  [...statsOrgKey(orgId), "attendance", filters] as const;

/**
 * Anything that changes an RSVP (check-in, payment, guest type, walk-in,
 * sync) also changes the meetup stats, the attendance shown on guest
 * profiles, and the org statistics, so all four are always refreshed
 * together.
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
  void queryClient.invalidateQueries({ queryKey: guestMeetupsOrgKey(orgId) });
  void queryClient.invalidateQueries({ queryKey: statsOrgKey(orgId) });
}

/**
 * A Mazmo sync can rename any synced guest and refreshes every synced
 * guest's Mazmo profile, so every guest-identity query is refreshed.
 */
export function invalidateAllGuestIdentities(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: ["guests"] });
  void queryClient.invalidateQueries({ queryKey: ["meetup-guests"] });
  void queryClient.invalidateQueries({ queryKey: ["guests-banned"] });
  void queryClient.invalidateQueries({ queryKey: ["guest"] });
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

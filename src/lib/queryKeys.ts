import type { QueryClient } from "@tanstack/react-query";
import type { StatsQuery } from "./statsQuery";

export const meetupsKey = (orgId: string) => ["meetups", orgId] as const;

export const meetupKey = (orgId: string, meetupId: string) =>
  ["meetup", orgId, meetupId] as const;

export const meetupGuestsKey = (orgId: string, meetupId: string) =>
  ["meetup-guests", orgId, meetupId] as const;

export const meetupWeatherKey = (orgId: string, meetupId: string) =>
  ["meetup-weather", orgId, meetupId] as const;

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

// Prefix of every org's stats. Guest identity changes (names, Mazmo
// profiles) reach the stats of any org, so they invalidate this root.
export const statsRootKey = ["stats"] as const;

// Prefixed by org: check-ins and finalizing change every period's numbers,
// so they invalidate the whole org prefix.
export const statsOrgKey = (orgId: string) => [...statsRootKey, orgId] as const;

// `null` filters key the query that waits for the event filter, so it never
// shows another period's cached numbers.
export const statsAttendanceKey = (orgId: string, filters: StatsQuery | null) =>
  [...statsOrgKey(orgId), "attendance", filters] as const;

export const statsArrivalsKey = (orgId: string, filters: StatsQuery | null) =>
  [...statsOrgKey(orgId), "arrivals", filters] as const;

export const statsDemographicsKey = (
  orgId: string,
  filters: StatsQuery | null,
) => [...statsOrgKey(orgId), "demographics", filters] as const;

export const statsRetentionKey = (orgId: string, filters: StatsQuery | null) =>
  [...statsOrgKey(orgId), "retention", filters] as const;

export const statsOperationsKey = (orgId: string, filters: StatsQuery | null) =>
  [...statsOrgKey(orgId), "operations", filters] as const;

// Address search results; the query is the trimmed text typed so far.
export const geocodeKey = (orgId: string, q: string) =>
  ["geocode", orgId, q] as const;

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
 * guest's Mazmo profile, so every guest-identity query is refreshed, and so
 * are the stats, which show displaynames and read Mazmo profiles.
 */
export function invalidateAllGuestIdentities(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: ["guests"] });
  void queryClient.invalidateQueries({ queryKey: ["meetup-guests"] });
  void queryClient.invalidateQueries({ queryKey: ["guests-banned"] });
  void queryClient.invalidateQueries({ queryKey: ["guest"] });
  void queryClient.invalidateQueries({ queryKey: statsRootKey });
}

/**
 * A guest's identity (name, Mazmo link, profile snapshot) shows up in the
 * global guest list, the vanted list, every meetup guest list, the guest's
 * own profile, and the stats of every org the guest attended (which have no
 * org id here, so all stats are refreshed).
 */
export function invalidateGuestIdentity(
  queryClient: QueryClient,
  guestId: string,
): void {
  void queryClient.invalidateQueries({ queryKey: ["guests"] });
  void queryClient.invalidateQueries({ queryKey: ["guests-banned"] });
  void queryClient.invalidateQueries({ queryKey: ["meetup-guests"] });
  void queryClient.invalidateQueries({ queryKey: guestKey(guestId) });
  void queryClient.invalidateQueries({ queryKey: statsRootKey });
}

/**
 * A meetup's weather shows on its page and feeds the weather tab of the org
 * stats, so both are refreshed together.
 */
export function invalidateMeetupWeather(
  queryClient: QueryClient,
  orgId: string,
  meetupId: string,
): void {
  void queryClient.invalidateQueries({
    queryKey: meetupWeatherKey(orgId, meetupId),
  });
  void queryClient.invalidateQueries({ queryKey: statsOrgKey(orgId) });
}

/**
 * A meetup's location shows on its page and in the meetup list, and a change
 * replaces its weather, so the meetup, the list and the weather are refreshed
 * together.
 */
export function invalidateMeetupLocation(
  queryClient: QueryClient,
  orgId: string,
  meetupId: string,
): void {
  void queryClient.invalidateQueries({ queryKey: meetupKey(orgId, meetupId) });
  void queryClient.invalidateQueries({ queryKey: meetupsKey(orgId) });
  invalidateMeetupWeather(queryClient, orgId, meetupId);
}

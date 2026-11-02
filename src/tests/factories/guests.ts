// Factories for the guest directory and profile payloads (lists, name
// history, attendance, Mazmo refresh). The single-guest shapes live in
// ./guest. Type-only imports keep this file importable from Cypress specs.
import type { Schema } from "./schemas";

export function makeNameHistoryEntry(
  overrides: Partial<Schema<"GuestDisplaynameHistoryPublic">> = {},
): Schema<"GuestDisplaynameHistoryPublic"> {
  return {
    displayname: "Luna",
    source: "SYNC",
    recorded_at: "2026-09-01T00:00:00Z",
    actor: null,
    ...overrides,
  };
}

export function makeNameHistory(
  history: Schema<"GuestDisplaynameHistoryPublic">[] = [makeNameHistoryEntry()],
): Schema<"GuestDisplaynameHistoryListResponse"> {
  return { total: history.length, history };
}

export function makeGuestMeetupAttendance(
  overrides: Partial<Schema<"GuestMeetupAttendancePublic">> = {},
): Schema<"GuestMeetupAttendancePublic"> {
  return {
    meetup_id: "meetup-1",
    name: "Alter Night",
    date: "2026-10-01T22:00:00Z",
    status: "ATTENDED",
    rsvp_time: "2026-09-20T15:00:00Z",
    arrival_time: null,
    guest_type: "NORMAL",
    ...overrides,
  };
}

export function makeAttendanceSummary(
  overrides: Partial<Schema<"GuestAttendanceSummary">> = {},
): Schema<"GuestAttendanceSummary"> {
  return {
    attended: 0,
    walkin: 0,
    no_show: 0,
    cancelled: 0,
    upcoming: 0,
    ...overrides,
  };
}

/** A guest's meetups with a summary that counts them. */
export function makeGuestMeetups(
  meetups: Schema<"GuestMeetupAttendancePublic">[] = [],
): Schema<"GuestMeetupAttendanceListResponse"> {
  const count = (status: Schema<"GuestAttendanceStatus">) =>
    meetups.filter((m) => m.status === status).length;
  const walkin = count("WALKIN");
  return {
    total: meetups.length,
    summary: makeAttendanceSummary({
      attended: count("ATTENDED") + walkin,
      walkin,
      no_show: count("NO_SHOW"),
      cancelled: count("CANCELLED"),
      upcoming: count("UPCOMING"),
    }),
    meetups,
  };
}

export function makeMazmoRefresh(
  overrides: Partial<Schema<"GuestMazmoRefreshResponse">> = {},
): Schema<"GuestMazmoRefreshResponse"> {
  return { total: 3, refreshed: 3, not_found: 0, ...overrides };
}

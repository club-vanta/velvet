// Meetup factories. Override only what the test cares about.
import type { Schema } from "./schemas";
import { makeGuestWithBan } from "./guest";

type Meetup = Schema<"MeetupPublic">;

/** A complete meetup; override only what the test cares about. */
export function makeMeetup(overrides: Partial<Meetup> = {}): Meetup {
  return {
    id: "meetup-1",
    name: "Alter Night",
    mazmo_meetup_url: "https://mazmo.net/+eventos/meetup-1",
    date: "2026-10-01T22:00:00Z",
    is_finalized: false,
    finalized_at: null,
    requires_payment: false,
    location_label: null,
    latitude: null,
    longitude: null,
    ...overrides,
  };
}

export function makeRsvp(
  overrides: Partial<Schema<"RsvpPublic">> = {},
): Schema<"RsvpPublic"> {
  return {
    rsvp_time: "2026-09-20T15:00:00Z",
    cancelled_rsvp: false,
    has_arrived: false,
    arrival_time: null,
    arrival_order: null,
    is_walkin: false,
    has_paid: false,
    paid_at: null,
    guest_type: "NORMAL",
    ...overrides,
  };
}

/** One row of a meetup's guest list. */
export function makeMeetupGuest(
  overrides: {
    guest?: Partial<Schema<"GuestWithBanPublic">>;
    rsvp?: Partial<Schema<"RsvpPublic">>;
  } = {},
): Schema<"MeetupGuestPublic"> {
  return {
    guest: makeGuestWithBan(overrides.guest),
    rsvp: makeRsvp(overrides.rsvp),
  };
}

export function makeMeetupStats(
  overrides: Partial<Schema<"MeetupStatsPublic">> = {},
): Schema<"MeetupStatsPublic"> {
  return {
    attendance: {
      total_rsvps: 0,
      arrived_count: 0,
      not_arrived_count: 0,
      walkin_count: 0,
    },
    cancellations: { cancelled_count: 0, cancelled_but_paid_count: 0 },
    guest_types: {
      normal_count: 0,
      invited_count: 0,
      vendor_count: 0,
      staff_count: 0,
    },
    payment: { paid_count: 0, unpaid_count: 0, exempt_from_payment_count: 0 },
    ...overrides,
  };
}

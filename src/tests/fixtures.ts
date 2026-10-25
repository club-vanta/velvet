import type { components } from "@/api/types";

type Meetup = components["schemas"]["MeetupPublic"];

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

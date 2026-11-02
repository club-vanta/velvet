// Factories for the meetup door: check-in, payment and sync answers, the
// weather card, the address search, and long lists. Override only what the
// test cares about. Type-only imports keep this file importable from
// Cypress specs, which do not resolve the "@/" alias.
import type { Schema } from "./schemas";
import { makeGuest } from "./guest";
import { makeMeetupGuest } from "./meetup";
import { USERS } from "./session";

const DOOR_USER = { id: USERS.staff.id, username: USERS.staff.username };

export function makeCheckInResponse(
  overrides: Partial<Schema<"CheckInResponse">> = {},
): Schema<"CheckInResponse"> {
  return {
    guest: makeGuest(),
    arrival_order: 1,
    arrival_time: "2026-10-01T23:15:00Z",
    checked_in_by: DOOR_USER,
    ...overrides,
  };
}

export function makePaymentResponse(
  overrides: Partial<Schema<"PaymentResponse">> = {},
): Schema<"PaymentResponse"> {
  return {
    guest: makeGuest(),
    paid_at: "2026-10-01T23:10:00Z",
    paid_by: DOOR_USER,
    ...overrides,
  };
}

export function makeSyncResponse(
  overrides: Partial<Schema<"SyncResponse">> = {},
): Schema<"SyncResponse"> {
  return { inserted: 0, skipped: 0, total_in_db: 0, ...overrides };
}

export function makeMeetupWeather(
  overrides: Partial<Schema<"MeetupWeatherPublic">> = {},
): Schema<"MeetupWeatherPublic"> {
  return {
    avg_temperature: 22.46,
    avg_apparent_temperature: 24,
    total_precipitation_mm: 3.2,
    max_wind_kmh: 18.75,
    rained: true,
    fetched_at: "2026-10-02T06:00:00Z",
    source: "open-meteo-historical-forecast",
    ...overrides,
  };
}

/** The weather card's answer; NOT_FETCHED and ready unless overridden. */
export function makeMeetupWeatherStatus(
  overrides: Partial<Schema<"MeetupWeatherStatusPublic">> = {},
): Schema<"MeetupWeatherStatusPublic"> {
  return { status: "NOT_FETCHED", weather: null, ready: true, ...overrides };
}

export function makeGeocodeResult(
  overrides: Partial<Schema<"GeocodeResult">> = {},
): Schema<"GeocodeResult"> {
  return {
    label: "Av. Corrientes 1234, Buenos Aires",
    latitude: -34.6037,
    longitude: -58.3816,
    ...overrides,
  };
}

/**
 * `count` guests on a meetup's list, named "Guest 0001"... so they sort in
 * creation order, each with its own id and Mazmo handle.
 */
export function makeMeetupGuestRows(
  count: number,
): Schema<"MeetupGuestPublic">[] {
  return Array.from({ length: count }, (_, i) => {
    const n = String(i + 1).padStart(4, "0");
    return makeMeetupGuest({
      guest: {
        id: `row-${n}`,
        mazmo_user_id: 5000 + i,
        mazmo_handle: `row${n}`,
        displayname: `Guest ${n}`,
      },
    });
  });
}

/** `count` guests of the global directory, as the walk-in picker lists them. */
export function makeDirectoryGuests(count: number): Schema<"GuestPublic">[] {
  return Array.from({ length: count }, (_, i) => {
    const n = String(i + 1).padStart(4, "0");
    return makeGuest({
      id: `dir-${n}`,
      mazmo_user_id: 9000 + i,
      mazmo_handle: `dir${n}`,
      displayname: `Directory ${n}`,
    });
  });
}

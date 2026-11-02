// Guest factories. Override only what the test cares about.
import type { Schema } from "./schemas";

export function makeMazmoProfile(
  overrides: Partial<Schema<"GuestMazmoProfilePublic">> = {},
): Schema<"GuestMazmoProfilePublic"> {
  return {
    avatar_url: null,
    age: 30,
    gender: "FEMALE",
    pronoun: "FEMALE",
    mazmo_suspended: false,
    mazmo_banned: false,
    mazmo_deleted: false,
    synced_at: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

export function makeGuest(
  overrides: Partial<Schema<"GuestPublic">> = {},
): Schema<"GuestPublic"> {
  return {
    id: "guest-1",
    mazmo_user_id: 1001,
    mazmo_handle: "luna",
    displayname: "Luna",
    instagram_username: null,
    mazmo_profile: makeMazmoProfile(),
    ...overrides,
  };
}

export function makeGuestWithBan(
  overrides: Partial<Schema<"GuestWithBanPublic">> = {},
): Schema<"GuestWithBanPublic"> {
  return { ...makeGuest(), is_banned: false, ...overrides };
}

export function makeBannedGuest(
  overrides: Partial<Schema<"BannedGuestPublic">> = {},
): Schema<"BannedGuestPublic"> {
  return {
    ...makeGuest(),
    banned_at: "2026-09-10T03:00:00Z",
    banned_reason: "Harassed another guest",
    banned_by_id: 2,
    banned_by: { id: 2, username: "owner" },
    ...overrides,
  };
}

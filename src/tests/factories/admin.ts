// Admin factories: staff accounts, organization members and the audit log.
// Type-only imports keep this file importable from Cypress specs, which do not
// resolve the "@/" alias.
import type { Schema } from "./schemas";
import { ORG_ID, makeUser } from "./session";

type User = Schema<"UserPublic">;

/** An approved, enabled staff account as the staff list returns it. */
export function makeStaffUser(overrides: Partial<User> = {}): User {
  return makeUser({
    id: 10,
    username: "luz",
    created_at: "2026-03-15T12:00:00Z",
    ...overrides,
  });
}

/** An account that signed up and waits for a site admin's approval. */
export function makePendingUser(overrides: Partial<User> = {}): User {
  return makeStaffUser({
    id: 11,
    username: "nuevo",
    is_approved: false,
    org_memberships: [],
    ...overrides,
  });
}

/** An account a site admin disabled. */
export function makeDisabledUser(overrides: Partial<User> = {}): User {
  return makeStaffUser({
    id: 12,
    username: "exstaff",
    is_disabled: true,
    disabled_at: "2026-08-01T10:00:00Z",
    disabled_reason: "Left the organisation",
    ...overrides,
  });
}

export function makeRecoveryCode(
  overrides: Partial<Schema<"RecoveryCodeResponse">> = {},
): Schema<"RecoveryCodeResponse"> {
  return { username: "luz", code: "042567", ...overrides };
}

export function makeOrgMember(
  overrides: Partial<Schema<"OrgMemberPublic">> = {},
): Schema<"OrgMemberPublic"> {
  return {
    user_id: 10,
    org_id: ORG_ID,
    role: "STAFF",
    username: "luz",
    ...overrides,
  };
}

export function makeUserSearchResult(
  overrides: Partial<Schema<"UserSearchResult">> = {},
): Schema<"UserSearchResult"> {
  return { id: 20, username: "sol", ...overrides };
}

export function makeEventActor(
  overrides: Partial<Schema<"EventActorPublic">> = {},
): Schema<"EventActorPublic"> {
  return { id: 1, username: "door", ...overrides };
}

export function makeEventGuest(
  overrides: Partial<Schema<"EventGuestPublic">> = {},
): Schema<"EventGuestPublic"> {
  return {
    id: "guest-1",
    mazmo_user_id: 1001,
    mazmo_handle: "luna",
    displayname: "Luna",
    ...overrides,
  };
}

/** One audit log entry: a check-in by the door account, by default. */
export function makeEventLog(
  overrides: Partial<Schema<"EventLogPublic">> = {},
): Schema<"EventLogPublic"> {
  return {
    id: 1,
    event_type: "CHECK_IN",
    timestamp: "2026-10-01T23:15:00Z",
    actor: makeEventActor(),
    guest: makeEventGuest(),
    meetup_id: "meetup-1",
    reason: null,
    ...overrides,
  };
}

/** A page of the audit log; `total` defaults to the events given. */
export function makeEventLogList(
  events: Schema<"EventLogPublic">[],
  overrides: Partial<Omit<Schema<"EventLogListResponse">, "events">> = {},
): Schema<"EventLogListResponse"> {
  return { total: events.length, limit: 50, offset: 0, events, ...overrides };
}

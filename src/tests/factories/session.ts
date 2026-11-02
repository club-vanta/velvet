// Session factories: signed-in users and their organizations.
// Type-only imports keep this file importable from Cypress specs, which do not
// resolve the "@/" alias.
import type { Schema } from "./schemas";

export const ORG_ID = "org-1";
export const ORG_NAME = "Club Vanta";

export function makeOrg(overrides: Partial<Schema<"OrgPublic">> = {}) {
  return {
    id: ORG_ID,
    name: ORG_NAME,
    slug: "club-vanta",
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } satisfies Schema<"OrgPublic">;
}

export function makeMembership(
  overrides: Partial<Schema<"OrgMembershipPublic">> = {},
): Schema<"OrgMembershipPublic"> {
  return { org_id: ORG_ID, org_name: ORG_NAME, role: "STAFF", ...overrides };
}

export function makeUser(
  overrides: Partial<Schema<"UserPublic">> = {},
): Schema<"UserPublic"> {
  return {
    id: 1,
    username: "door",
    is_approved: true,
    role: { id: 1, name: "USER" },
    created_at: "2026-01-01T00:00:00Z",
    is_disabled: false,
    disabled_at: null,
    disabled_reason: null,
    org_memberships: [makeMembership()],
    ...overrides,
  };
}

/**
 * The people who use velvet, from least to most access:
 * - staff: works the door of one organization.
 * - orgAdmin: admin of one organization (stats, events, members).
 * - siteAdmin: manages every organization and the staff accounts.
 */
export const USERS = {
  staff: makeUser({ id: 1, username: "door" }),
  orgAdmin: makeUser({
    id: 2,
    username: "owner",
    org_memberships: [makeMembership({ role: "ADMIN" })],
  }),
  siteAdmin: makeUser({
    id: 3,
    username: "root",
    role: { id: 2, name: "SITE_ADMIN" },
    org_memberships: [],
  }),
} satisfies Record<string, Schema<"UserPublic">>;

export type Role = keyof typeof USERS;

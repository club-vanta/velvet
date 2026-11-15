// Stubs for the staff page (/staff, site admins only).
import {
  USERS,
  makeDisabledUser,
  makePendingUser,
  makeStaffUser,
} from "../../../src/tests/factories";
import type { Schema } from "../../../src/tests/factories";

type User = Schema<"UserPublic">;

/** The signed-in admin, an active account, a pending one and a disabled one. */
export const STAFF = {
  self: USERS.siteAdmin,
  active: makeStaffUser(),
  pending: makePendingUser(),
  disabled: makeDisabledUser(),
};

export const ALL_STAFF: User[] = [
  STAFF.self,
  STAFF.active,
  STAFF.pending,
  STAFF.disabled,
];

/**
 * Answers both staff lists: `@getStaff` (all accounts) and `@getPending`.
 * Pending defaults to the unapproved accounts in `all`.
 */
export function stubStaffPage({
  all = ALL_STAFF,
  pending = all.filter((u) => !u.is_approved && !u.is_disabled),
  delay,
}: { all?: User[]; pending?: User[]; delay?: number } = {}): void {
  cy.stubApi("GET", "/staff/", { body: all, delay }).as("getStaff");
  cy.stubApi("GET", "/staff/pending", { body: pending, delay }).as(
    "getPending",
  );
}

/** Answers a staff mutation on `user` with the updated account. */
export function stubStaffUpdate(
  path:
    | "/staff/{user_id}/approve"
    | "/staff/{user_id}/role"
    | "/staff/{user_id}/disable"
    | "/staff/{user_id}/enable",
  user: User,
  { delay }: { delay?: number } = {},
) {
  return cy.stubApi("PATCH", path, {
    body: user,
    params: { user_id: String(user.id) },
    delay,
  });
}

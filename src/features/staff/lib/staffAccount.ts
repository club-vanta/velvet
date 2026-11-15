import type { components } from "@/api/types";

type User = components["schemas"]["UserPublic"];

export type StaffStatus = "disabled" | "pending" | "active";

/** Disabled wins over pending: a disabled account cannot log in either way. */
export function staffStatus(user: User): StaffStatus {
  if (user.is_disabled) return "disabled";
  if (!user.is_approved) return "pending";
  return "active";
}

export type StaffActions = {
  changeRole: boolean;
  approve: boolean;
  revoke: boolean;
  disable: boolean;
  enable: boolean;
};

/**
 * What a site admin can do to `user`. Admins never act on their own account
 * (they could lock themselves out), except to generate a recovery code,
 * which is always offered.
 */
export function staffActions(user: User, isSelf: boolean): StaffActions {
  const active = user.is_approved && !user.is_disabled;
  return {
    changeRole: !isSelf,
    approve: !user.is_approved,
    revoke: !isSelf && active,
    disable: !isSelf && active,
    enable: !isSelf && user.is_disabled,
  };
}

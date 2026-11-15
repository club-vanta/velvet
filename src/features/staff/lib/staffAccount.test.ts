import { describe, expect, it } from "vitest";
import {
  makeDisabledUser,
  makePendingUser,
  makeStaffUser,
} from "@/tests/factories";
import { staffActions, staffStatus } from "./staffAccount";

describe("staffStatus", () => {
  it("reads an approved, enabled account as active", () => {
    expect(staffStatus(makeStaffUser())).toBe("active");
  });

  it("reads an unapproved account as pending", () => {
    expect(staffStatus(makePendingUser())).toBe("pending");
  });

  it("reads a disabled account as disabled, even if it was never approved", () => {
    expect(staffStatus(makeDisabledUser())).toBe("disabled");
    expect(staffStatus(makeDisabledUser({ is_approved: false }))).toBe(
      "disabled",
    );
  });
});

describe("staffActions", () => {
  it("offers role change, revoke and disable on another active account", () => {
    expect(staffActions(makeStaffUser(), false)).toEqual({
      changeRole: true,
      approve: false,
      revoke: true,
      disable: true,
      enable: false,
    });
  });

  it("offers only approve and role change on a pending account", () => {
    expect(staffActions(makePendingUser(), false)).toEqual({
      changeRole: true,
      approve: true,
      revoke: false,
      disable: false,
      enable: false,
    });
  });

  it("offers enable, not disable or revoke, on a disabled account", () => {
    expect(staffActions(makeDisabledUser(), false)).toEqual({
      changeRole: true,
      approve: false,
      revoke: false,
      disable: false,
      enable: true,
    });
  });

  it("offers nothing on the admin's own account", () => {
    expect(staffActions(makeStaffUser(), true)).toEqual({
      changeRole: false,
      approve: false,
      revoke: false,
      disable: false,
      enable: false,
    });
  });
});

import { describe, expect, it } from "vitest";
import { canAccess } from "../access";
import { visibleNavItems } from "./navItems";

const ids = (viewer: { isSiteAdmin: boolean; isOrgAdmin: boolean }) =>
  visibleNavItems(viewer).map((item) => item.id);

describe("visibleNavItems", () => {
  it("shows staff the door pages only", () => {
    expect(ids({ isSiteAdmin: false, isOrgAdmin: false })).toEqual([
      "dashboard",
      "meetups",
      "guests",
    ]);
  });

  it("adds stats, the audit log and organizations for org admins", () => {
    expect(ids({ isSiteAdmin: false, isOrgAdmin: true })).toEqual([
      "dashboard",
      "meetups",
      "guests",
      "stats",
      "events",
      "organizations",
    ]);
  });

  it("adds staff management for site admins", () => {
    expect(ids({ isSiteAdmin: true, isOrgAdmin: true })).toEqual([
      "dashboard",
      "meetups",
      "guests",
      "stats",
      "staff",
      "events",
      "organizations",
    ]);
  });
});

describe("canAccess", () => {
  it("lets everyone open pages for everyone", () => {
    expect(
      canAccess("everyone", { isSiteAdmin: false, isOrgAdmin: false }),
    ).toBe(true);
  });

  it("keeps site-admin pages from org admins", () => {
    expect(
      canAccess("siteAdmin", { isSiteAdmin: false, isOrgAdmin: true }),
    ).toBe(false);
  });
});

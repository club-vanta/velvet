import { describe, expect, it } from "vitest";
import { makeOrg } from "@/tests/factories";
import { hasOrgChanges, isOrgComplete, orgUpdateBody } from "./orgUpdate";

const org = makeOrg({ name: "Club Vanta", slug: "club-vanta" });

describe("orgUpdateBody", () => {
  it("sends only the fields that changed", () => {
    expect(orgUpdateBody(org, { name: "Vanta", slug: "club-vanta" })).toEqual({
      name: "Vanta",
      slug: null,
    });
    expect(orgUpdateBody(org, { name: "Club Vanta", slug: "vanta" })).toEqual({
      name: null,
      slug: "vanta",
    });
  });

  it("trims the values and treats a padded copy as unchanged", () => {
    expect(
      orgUpdateBody(org, { name: "  Club Vanta ", slug: " new-slug " }),
    ).toEqual({ name: null, slug: "new-slug" });
  });
});

describe("hasOrgChanges", () => {
  it("is false until a field differs after trimming", () => {
    expect(
      hasOrgChanges(org, { name: "Club Vanta ", slug: "club-vanta" }),
    ).toBe(false);
    expect(
      hasOrgChanges(org, { name: "Club Vantax", slug: "club-vanta" }),
    ).toBe(true);
  });
});

describe("isOrgComplete", () => {
  it("needs both a name and a slug that are not just spaces", () => {
    expect(isOrgComplete({ name: "Club", slug: "club" })).toBe(true);
    expect(isOrgComplete({ name: "  ", slug: "club" })).toBe(false);
    expect(isOrgComplete({ name: "Club", slug: "" })).toBe(false);
  });
});

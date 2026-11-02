import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { components } from "@/api/types";
import { makeMembership, makeOrg, makeUser } from "@/tests/factories";
import { OrgProvider, useIsOrgAdmin, useOrg } from "./OrgContext";

type User = components["schemas"]["UserPublic"];

let mockUser: User = makeUser();

vi.mock("@/api/client", () => ({
  api: {
    GET: () =>
      Promise.resolve({
        data: {
          total: 2,
          organizations: [
            makeOrg(),
            makeOrg({ id: "org-2", name: "Club Norte", slug: "club-norte" }),
          ],
        },
      }),
  },
}));
vi.mock("./AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

function renderInProvider<T>(hook: () => T) {
  return renderHook(hook, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={new QueryClient()}>
        <OrgProvider>{children}</OrgProvider>
      </QueryClientProvider>
    ),
  });
}

function isAdmin(user: User) {
  mockUser = user;
  return renderInProvider(() => useIsOrgAdmin()).result.current;
}

beforeEach(() => localStorage.clear());

describe("useIsOrgAdmin", () => {
  it("is true for an admin of the active org", () => {
    const user = makeUser({
      org_memberships: [makeMembership({ role: "ADMIN" })],
    });
    expect(isAdmin(user)).toBe(true);
  });

  it("is false for a plain member of the active org", () => {
    const user = makeUser({
      org_memberships: [makeMembership({ role: "STAFF" })],
    });
    expect(isAdmin(user)).toBe(false);
  });

  it("is true for a site admin", () => {
    const user = makeUser({
      role: { id: 2, name: "SITE_ADMIN" },
      org_memberships: [],
    });
    expect(isAdmin(user)).toBe(true);
  });
});

describe("useOrg", () => {
  it("restores the stored organization among the memberships", () => {
    localStorage.setItem("active_org_id", "org-2");
    mockUser = makeUser({
      org_memberships: [
        makeMembership(),
        makeMembership({ org_id: "org-2", org_name: "Club Norte" }),
      ],
    });
    const { result } = renderInProvider(() => useOrg());
    expect(result.current.activeOrg?.org_name).toBe("Club Norte");
  });

  it("falls back to the first organization and stores it", () => {
    localStorage.setItem("active_org_id", "org-deleted");
    mockUser = makeUser();
    const { result } = renderInProvider(() => useOrg());
    expect(result.current.activeOrg?.org_id).toBe("org-1");
    expect(localStorage.getItem("active_org_id")).toBe("org-1");
  });

  it("lists every organization for a site admin, as admin", async () => {
    mockUser = makeUser({
      role: { id: 2, name: "SITE_ADMIN" },
      org_memberships: [],
    });
    const { result } = renderInProvider(() => useOrg());
    await waitFor(() => expect(result.current.orgs).toHaveLength(2));
    expect(result.current.orgs.map((o) => o.role)).toEqual(["ADMIN", "ADMIN"]);
  });
});

describe("useIsOrgAdmin outside the provider", () => {
  it("throws like useOrg", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useIsOrgAdmin())).toThrow(
      "useOrg must be used within <OrgProvider>",
    );
  });
});

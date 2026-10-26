import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OrgProvider, useIsOrgAdmin } from "./org";

let mockSiteRole = "USER";
let mockOrgRole = "USER";

vi.mock("@/api/client", () => ({
  api: {
    GET: () =>
      Promise.resolve({
        data: {
          organizations: [{ id: "org-1", name: "Club Vanta" }],
        },
      }),
  },
}));
vi.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: 1,
      username: "u",
      role: { name: mockSiteRole },
      org_memberships: [
        { org_id: "org-1", org_name: "Club Vanta", role: mockOrgRole },
      ],
    },
  }),
}));

function isAdmin(siteRole: string, orgRole: string) {
  mockSiteRole = siteRole;
  mockOrgRole = orgRole;
  const { result } = renderHook(() => useIsOrgAdmin(), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={new QueryClient()}>
        <OrgProvider>{children}</OrgProvider>
      </QueryClientProvider>
    ),
  });
  return result.current;
}

describe("useIsOrgAdmin", () => {
  it("is true for an admin of the active org", () => {
    expect(isAdmin("USER", "ADMIN")).toBe(true);
  });

  it("is false for a plain member of the active org", () => {
    expect(isAdmin("USER", "MEMBER")).toBe(false);
  });

  it("is true for a site admin", () => {
    expect(isAdmin("SITE_ADMIN", "MEMBER")).toBe(true);
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

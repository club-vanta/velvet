import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LanguageProvider } from "@/lib/i18n";
import { GuestDetailPage } from "./GuestDetailPage";
import type { components } from "@/api/types";

type Guest = components["schemas"]["GuestPublic"];
type BannedGuest = components["schemas"]["BannedGuestPublic"];

const mockApiGet = vi.fn();
const mockApiPatch = vi.fn();
vi.mock("@/api/client", () => ({
  api: {
    GET: (...a: unknown[]) => mockApiGet(...a),
    PATCH: (...a: unknown[]) => mockApiPatch(...a),
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

let mockRole = "ADMIN";
vi.mock("@/lib/org", () => ({
  useOrg: () => ({
    activeOrg: { org_id: "org-1", org_name: "Club Vanta", role: mockRole },
  }),
  useIsOrgAdmin: () => mockRole === "ADMIN",
}));

vi.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    user: { id: 1, username: "admin", role: { name: "USER" } },
  }),
}));

const GUEST: Guest = {
  id: "g-1",
  mazmo_user_id: null,
  mazmo_handle: null,
  displayname: "Roberto",
  instagram_username: null,
  mazmo_profile: null,
};

function renderPage(banned: BannedGuest[] | "pending" | "error" = []) {
  mockApiGet.mockImplementation((path: string) => {
    if (path === "/guests/{guest_id}")
      return Promise.resolve({
        data: GUEST,
        error: undefined,
        response: { status: 200 },
      });
    if (path === "/guests/{guest_id}/displayname-history")
      return Promise.resolve({
        data: { total: 0, history: [] },
        error: undefined,
      });
    if (path === "/organizations/{org_id}/guests/{guest_id}/meetups")
      return Promise.resolve({
        data: {
          total: 0,
          summary: {
            attended: 0,
            walkin: 0,
            no_show: 0,
            cancelled: 0,
            upcoming: 0,
          },
          meetups: [],
        },
        error: undefined,
      });
    if (path === "/organizations/{org_id}/guests/banned") {
      if (banned === "pending") return new Promise(() => {});
      if (banned === "error")
        return Promise.resolve({ data: undefined, error: { detail: "x" } });
      return Promise.resolve({
        data: { total: banned.length, guests: banned },
        error: undefined,
      });
    }
    return Promise.resolve({ data: undefined, error: undefined });
  });
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <LanguageProvider>
        <MemoryRouter initialEntries={["/guests/g-1"]}>
          <Routes>
            <Route path="/guests/:guestId" element={<GuestDetailPage />} />
          </Routes>
        </MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>,
  );
}

describe("GuestDetailPage", () => {
  beforeEach(() => {
    mockRole = "ADMIN";
    vi.clearAllMocks();
    localStorage.setItem("lang", "en");
  });

  it("shows the guest's meetups as a page section", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", { level: 2, name: "Meetups" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        "Hasn't signed up for any meetups in this organization.",
      ),
    ).toBeInTheDocument();
  });

  it("offers edit, link, and vant to an org admin", async () => {
    renderPage();

    expect(await screen.findByRole("button", { name: "Edit" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Link Mazmo account" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Vant" })).toBeInTheDocument();
  });

  it("offers unvant instead of vant for a vanted guest", async () => {
    renderPage([
      {
        ...GUEST,
        banned_at: "2026-08-22T03:00:00Z",
        banned_reason: "Reason here",
        banned_by_id: 1,
        banned_by: { id: 1, username: "admin" },
      },
    ]);

    expect(
      await screen.findByRole("button", { name: "Unvant" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Vant" }),
    ).not.toBeInTheDocument();
  });

  it("never offers vant or unvant to non-admin staff", async () => {
    mockRole = "STAFF";
    renderPage();

    expect(await screen.findByRole("button", { name: "Edit" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Vant" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Unvant" }),
    ).not.toBeInTheDocument();
  });

  it("offers neither vant nor unvant until the vanted list has loaded", async () => {
    renderPage("pending");

    expect(await screen.findByRole("button", { name: "Edit" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Vant" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Unvant" }),
    ).not.toBeInTheDocument();
  });

  it("says so when the vant status could not be checked", async () => {
    renderPage("error");

    expect(
      await screen.findByText("Couldn't check whether this guest is vanted."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Vant" }),
    ).not.toBeInTheDocument();
  });
});

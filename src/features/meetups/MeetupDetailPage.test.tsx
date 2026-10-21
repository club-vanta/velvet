import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/lib/i18n";
import { MeetupDetailPage } from "./MeetupDetailPage";
import type { components } from "@/api/types";

type Meetup = components["schemas"]["MeetupPublic"];
type MeetupGuest = components["schemas"]["MeetupGuestPublic"];

const mockApiGet = vi.fn();
const mockApiPost = vi.fn();
const mockApiPatch = vi.fn();
vi.mock("@/api/client", () => ({
  api: {
    GET: (...a: unknown[]) => mockApiGet(...a),
    POST: (...a: unknown[]) => mockApiPost(...a),
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
}));

vi.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    user: { id: 1, username: "admin", role: { name: "USER" } },
  }),
}));

const MEETUP: Meetup = {
  id: "meetup-1",
  name: "Alter Test",
  mazmo_meetup_url: "https://mazmo.net/eventos/alter-test",
  date: "2026-09-01T22:00:00Z",
  is_finalized: false,
  finalized_at: null,
  requires_payment: true,
};

function guest(overrides: {
  mazmo_user_id: number;
  displayname: string;
  has_paid: boolean;
  is_banned?: boolean;
}): MeetupGuest {
  return {
    guest: {
      id: `00000000-0000-0000-0000-${String(overrides.mazmo_user_id).padStart(12, "0")}`,
      mazmo_user_id: overrides.mazmo_user_id,
      mazmo_handle: `user${overrides.mazmo_user_id}`,
      displayname: overrides.displayname,
      instagram_username: null,
      is_banned: overrides.is_banned ?? false,
    },
    rsvp: {
      rsvp_time: "2026-08-01T12:00:00Z",
      cancelled_rsvp: false,
      has_arrived: false,
      arrival_time: null,
      arrival_order: null,
      is_walkin: false,
      has_paid: overrides.has_paid,
      paid_at: overrides.has_paid ? "2026-08-02T12:00:00Z" : null,
      guest_type: "NORMAL",
    },
  };
}

function renderPage(meetup: Meetup, guests: MeetupGuest[]) {
  mockApiGet.mockImplementation((path: string) => {
    if (path === "/organizations/{org_id}/meetups/{meetup_id}")
      return Promise.resolve({ data: meetup, error: undefined });
    if (path === "/organizations/{org_id}/meetups/{meetup_id}/guests")
      return Promise.resolve({
        data: { total: guests.length, guests },
        error: undefined,
      });
    return Promise.resolve({ data: undefined, error: undefined });
  });

  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <LanguageProvider>
        <MemoryRouter initialEntries={["/meetups/meetup-1"]}>
          <Routes>
            <Route path="/meetups/:id" element={<MeetupDetailPage />} />
          </Routes>
        </MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>,
  );
}

describe("MeetupDetailPage payment blocking", () => {
  beforeEach(() => {
    mockRole = "ADMIN";
    vi.clearAllMocks();
    localStorage.setItem("lang", "en");
  });

  it("disables check-in for an unpaid guest on a paid meetup", async () => {
    renderPage(MEETUP, [
      guest({ mazmo_user_id: 1, displayname: "Unpaid Guest", has_paid: false }),
    ]);

    const button = await screen.findByRole("button", { name: "Check in" });
    expect(button).toBeDisabled();
  });

  it("enables check-in once the guest has paid", async () => {
    renderPage(MEETUP, [
      guest({ mazmo_user_id: 2, displayname: "Paid Guest", has_paid: true }),
    ]);

    const button = await screen.findByRole("button", { name: "Check in" });
    expect(button).toBeEnabled();
  });

  it("disables check-in for staff too, and hides the mark paid button", async () => {
    mockRole = "STAFF";
    renderPage(MEETUP, [
      guest({ mazmo_user_id: 3, displayname: "Unpaid Guest", has_paid: false }),
    ]);

    expect(await screen.findByText("Payment pending")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Mark paid" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check in" })).toBeDisabled();
  });

  it("does not render the payment column for a free meetup", async () => {
    renderPage({ ...MEETUP, requires_payment: false }, [
      guest({ mazmo_user_id: 4, displayname: "Some Guest", has_paid: false }),
    ]);

    expect(await screen.findByText("Some Guest")).toBeInTheDocument();
    expect(screen.queryByText("Payment pending")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check in" })).toBeEnabled();
  });

  it("does not open the banned-override dialog for a guest who is both banned and unpaid", async () => {
    renderPage(MEETUP, [
      guest({
        mazmo_user_id: 5,
        displayname: "Banned Unpaid Guest",
        has_paid: false,
        is_banned: true,
      }),
    ]);

    const button = await screen.findByRole("button", { name: "Check in" });
    expect(button).toBeDisabled();

    // Clicking a disabled button fires no handler, so the override dialog
    // (which would offer "Check in anyway") must never appear.
    await userEvent.click(button);
    expect(
      screen.queryByRole("heading", { name: "Check in vanted guest?" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Check in anyway" }),
    ).not.toBeInTheDocument();
  });
});

describe("MeetupDetailPage payment requirement toggle", () => {
  beforeEach(() => {
    mockRole = "ADMIN";
    vi.clearAllMocks();
    localStorage.setItem("lang", "en");
  });

  it("hides the toggle from non-admin staff", async () => {
    mockRole = "STAFF";
    renderPage(MEETUP, []);

    await screen.findByText("Alter Test");
    expect(
      screen.queryByRole("button", { name: "Disable payment" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Enable payment" }),
    ).not.toBeInTheDocument();
  });

  it('shows "Disable payment" for an admin when the meetup already requires payment', async () => {
    renderPage({ ...MEETUP, requires_payment: true }, []);

    expect(
      await screen.findByRole("button", { name: "Disable payment" }),
    ).toBeInTheDocument();
  });

  it('shows "Enable payment" for an admin when the meetup does not require payment', async () => {
    // Per the design spec (section 3), the toggle renders for admins
    // regardless of requires_payment — only its label changes.
    renderPage({ ...MEETUP, requires_payment: false }, []);

    expect(
      await screen.findByRole("button", { name: "Enable payment" }),
    ).toBeInTheDocument();
  });
});

describe("MeetupDetailPage guest identity", () => {
  beforeEach(() => {
    mockRole = "ADMIN";
    vi.clearAllMocks();
    localStorage.setItem("lang", "en");
  });

  it("renders 'No Mazmo account' for a guest with no Mazmo handle", async () => {
    const noMazmoGuest: MeetupGuest = {
      guest: {
        id: "00000000-0000-0000-0000-000000000099",
        mazmo_user_id: null,
        mazmo_handle: null,
        displayname: "Walk-in No Mazmo",
        instagram_username: null,
        is_banned: false,
      },
      rsvp: {
        rsvp_time: "2026-08-01T12:00:00Z",
        cancelled_rsvp: false,
        has_arrived: false,
        arrival_time: null,
        arrival_order: null,
        is_walkin: true,
        has_paid: false,
        paid_at: null,
        guest_type: "NORMAL",
      },
    };

    renderPage({ ...MEETUP, requires_payment: false }, [noMazmoGuest]);

    expect(await screen.findByText("Walk-in No Mazmo")).toBeInTheDocument();
    expect(screen.getByText("No Mazmo account")).toBeInTheDocument();
    expect(screen.queryByText("@null")).not.toBeInTheDocument();
  });

  it("sends guest_id (not mazmo_user_id) to the checkin endpoint", async () => {
    mockApiPost.mockResolvedValue({
      data: {
        guest: {
          id: "00000000-0000-0000-0000-000000000001",
          mazmo_user_id: 1,
          mazmo_handle: "user1",
          displayname: "Test Guest",
          instagram_username: null,
          is_banned: false,
        },
        arrival_order: 1,
      },
      error: undefined,
    });
    renderPage({ ...MEETUP, requires_payment: false }, [
      guest({ mazmo_user_id: 1, displayname: "Test Guest", has_paid: false }),
    ]);

    const button = await screen.findByRole("button", { name: "Check in" });
    await userEvent.click(button);

    expect(mockApiPost).toHaveBeenCalledWith(
      "/organizations/{org_id}/meetups/{meetup_id}/guests/{guest_id}/checkin",
      expect.objectContaining({
        params: expect.objectContaining({
          path: expect.objectContaining({
            guest_id: expect.any(String),
          }),
        }),
      }),
    );
  });
});

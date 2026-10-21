import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/lib/i18n";
import { MeetupDetailPage } from "./MeetupDetailPage";
import type { components } from "@/api/types";

type Meetup = components["schemas"]["MeetupPublic"];
type MeetupGuest = components["schemas"]["MeetupGuestPublic"];
type MeetupStats = components["schemas"]["MeetupStatsPublic"];

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
  guest_type?: string;
  rsvp_time?: string;
  mazmo_profile?: MeetupGuest["guest"]["mazmo_profile"];
}): MeetupGuest {
  return {
    guest: {
      id: `00000000-0000-0000-0000-${String(overrides.mazmo_user_id).padStart(12, "0")}`,
      mazmo_user_id: overrides.mazmo_user_id,
      mazmo_handle: `user${overrides.mazmo_user_id}`,
      displayname: overrides.displayname,
      instagram_username: null,
      is_banned: overrides.is_banned ?? false,
      mazmo_profile: overrides.mazmo_profile ?? null,
    },
    rsvp: {
      rsvp_time: overrides.rsvp_time ?? "2026-08-01T12:00:00Z",
      cancelled_rsvp: false,
      has_arrived: false,
      arrival_time: null,
      arrival_order: null,
      is_walkin: false,
      has_paid: overrides.has_paid,
      paid_at: overrides.has_paid ? "2026-08-02T12:00:00Z" : null,
      guest_type: overrides.guest_type ?? "NORMAL",
    },
  };
}

const STATS: MeetupStats = {
  attendance: {
    total_rsvps: 0,
    arrived_count: 0,
    not_arrived_count: 0,
    walkin_count: 0,
  },
  cancellations: { cancelled_count: 0, cancelled_but_paid_count: 0 },
  guest_types: {
    normal_count: 0,
    invited_count: 0,
    vendor_count: 0,
    staff_count: 0,
  },
  payment: { paid_count: 0, unpaid_count: 0, exempt_from_payment_count: 0 },
};

function renderPage(
  meetup: Meetup,
  guests: MeetupGuest[],
  stats: MeetupStats = STATS,
) {
  mockApiGet.mockImplementation(
    (path: string, opts?: { params?: { path?: { guest_id?: string } } }) => {
      if (path === "/organizations/{org_id}/meetups/{meetup_id}")
        return Promise.resolve({ data: meetup, error: undefined });
      if (path === "/organizations/{org_id}/meetups/{meetup_id}/guests")
        return Promise.resolve({
          data: { total: guests.length, guests },
          error: undefined,
        });
      if (path === "/organizations/{org_id}/meetups/{meetup_id}/stats")
        return Promise.resolve({ data: stats, error: undefined });
      if (path === "/organizations/{org_id}/guests/banned")
        return Promise.resolve({
          data: { total: 0, guests: [] },
          error: undefined,
        });
      if (path === "/guests/{guest_id}/displayname-history")
        return Promise.resolve({
          data: { total: 0, history: [] },
          error: undefined,
        });
      if (path === "/guests/{guest_id}") {
        const found = guests.find(
          (g) => g.guest.id === opts?.params?.path?.guest_id,
        );
        return Promise.resolve({
          data: found?.guest,
          error: undefined,
          response: { status: found ? 200 : 404 },
        });
      }
      return Promise.resolve({ data: undefined, error: undefined });
    },
  );

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

describe("MeetupDetailPage guest type payment exemption", () => {
  beforeEach(() => {
    mockRole = "ADMIN";
    vi.clearAllMocks();
    localStorage.setItem("lang", "en");
  });

  it.each(["INVITED", "VENDOR", "STAFF"])(
    "lets an unpaid %s guest check in on a paid meetup",
    async (guestType) => {
      renderPage(MEETUP, [
        guest({
          mazmo_user_id: 10,
          displayname: "Exempt Guest",
          has_paid: false,
          guest_type: guestType,
        }),
      ]);

      const button = await screen.findByRole("button", { name: "Check in" });
      expect(button).toBeEnabled();
      expect(screen.getByText("Exempt")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Mark paid" }),
      ).not.toBeInTheDocument();
    },
  );

  it("still blocks an unpaid regular guest", async () => {
    renderPage(MEETUP, [
      guest({
        mazmo_user_id: 11,
        displayname: "Regular Guest",
        has_paid: false,
        guest_type: "NORMAL",
      }),
    ]);

    expect(
      await screen.findByRole("button", { name: "Check in" }),
    ).toBeDisabled();
  });

  it("shows the guest type badge, and none for regular guests", async () => {
    renderPage(MEETUP, [
      guest({
        mazmo_user_id: 12,
        displayname: "Vendor Guest",
        has_paid: false,
        guest_type: "VENDOR",
      }),
      guest({
        mazmo_user_id: 13,
        displayname: "Regular Guest",
        has_paid: true,
      }),
    ]);

    expect(await screen.findByText("Vendor")).toBeInTheDocument();
    expect(screen.queryByText("Regular")).not.toBeInTheDocument();
  });

  it("keeps Undo payment for an exempt guest who had already paid", async () => {
    renderPage(MEETUP, [
      guest({
        mazmo_user_id: 14,
        displayname: "Reclassified Guest",
        has_paid: true,
        guest_type: "STAFF",
      }),
    ]);

    expect(await screen.findByText("Exempt")).toBeInTheDocument();
    expect(screen.getByText("Paid")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Undo payment" }),
    ).toBeInTheDocument();
  });
});

describe("MeetupDetailPage guest type menu", () => {
  beforeEach(() => {
    mockRole = "ADMIN";
    vi.clearAllMocks();
    localStorage.setItem("lang", "en");
  });

  it("sends the picked guest type to the type endpoint", async () => {
    const target = guest({
      mazmo_user_id: 20,
      displayname: "Soon Vendor",
      has_paid: false,
    });
    mockApiPatch.mockResolvedValue({
      data: { ...target, rsvp: { ...target.rsvp, guest_type: "VENDOR" } },
      error: undefined,
    });
    renderPage(MEETUP, [target]);
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: "Guest actions: Soon Vendor" }),
    );
    await user.click(
      await screen.findByRole("menuitemradio", { name: /^Vendor/ }),
    );

    await waitFor(() =>
      expect(mockApiPatch).toHaveBeenCalledWith(
        "/organizations/{org_id}/meetups/{meetup_id}/guests/{guest_id}/type",
        {
          params: {
            path: {
              org_id: "org-1",
              meetup_id: "meetup-1",
              guest_id: target.guest.id,
            },
          },
          body: { guest_type: "VENDOR" },
        },
      ),
    );
  });

  it("does not call the API when the current type is picked again", async () => {
    renderPage(MEETUP, [
      guest({ mazmo_user_id: 21, displayname: "Regular", has_paid: false }),
    ]);
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: "Guest actions: Regular" }),
    );
    const current = await screen.findByRole("menuitemradio", {
      name: /^Regular/,
    });
    expect(current).toHaveAttribute("aria-checked", "true");
    await user.click(current);

    expect(mockApiPatch).not.toHaveBeenCalled();
  });

  it("hides guest type options from non-admin staff", async () => {
    mockRole = "STAFF";
    renderPage(MEETUP, [
      guest({ mazmo_user_id: 22, displayname: "Someone", has_paid: true }),
    ]);
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: "Guest actions: Someone" }),
    );

    expect(
      await screen.findByRole("menuitem", { name: "View profile" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("menuitemradio")).not.toBeInTheDocument();
  });

  it("disables guest type options on a finalized meetup", async () => {
    renderPage({ ...MEETUP, is_finalized: true }, [
      guest({ mazmo_user_id: 23, displayname: "Late", has_paid: true }),
    ]);
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: "Guest actions: Late" }),
    );

    const options = await screen.findAllByRole("menuitemradio");
    expect(options).toHaveLength(4);
    for (const option of options) {
      expect(option).toHaveAttribute("aria-disabled", "true");
    }
    expect(
      screen.getByText(
        "This meetup is finalized, so guest types can't change.",
      ),
    ).toBeInTheDocument();
  });
});

// The <dd> next to a stat label, matched exactly so "12" never passes for "2".
function statValue(region: HTMLElement, label: string) {
  return within(region).getByText(label).closest("div")?.querySelector("dd")
    ?.textContent;
}

describe("MeetupDetailPage stats", () => {
  beforeEach(() => {
    mockRole = "ADMIN";
    vi.clearAllMocks();
    localStorage.setItem("lang", "en");
  });

  const stats: MeetupStats = {
    attendance: {
      total_rsvps: 12,
      arrived_count: 3,
      not_arrived_count: 9,
      walkin_count: 2,
    },
    cancellations: { cancelled_count: 4, cancelled_but_paid_count: 1 },
    guest_types: {
      normal_count: 7,
      invited_count: 2,
      vendor_count: 1,
      staff_count: 2,
    },
    payment: { paid_count: 5, unpaid_count: 2, exempt_from_payment_count: 5 },
  };

  it("renders the grouped counts from the stats endpoint", async () => {
    renderPage(
      MEETUP,
      [guest({ mazmo_user_id: 30, displayname: "Someone", has_paid: true })],
      stats,
    );

    const checkIns = await screen.findByRole("region", { name: "Check-ins" });
    expect(within(checkIns).getByText("25%")).toBeInTheDocument();
    expect(statValue(checkIns, "Walk-ins")).toBe("2");

    const types = screen.getByRole("region", { name: "Guest types" });
    expect(statValue(types, "Invited")).toBe("2");

    const payment = screen.getByRole("region", { name: "Payment" });
    expect(statValue(payment, "Exempt")).toBe("5");

    const cancellations = screen.getByRole("region", {
      name: "Cancelled RSVPs",
    });
    expect(
      within(cancellations).getByText(/Check whether they need a refund/),
    ).toBeInTheDocument();
  });

  it("hides the payment card on a free meetup", async () => {
    renderPage(
      { ...MEETUP, requires_payment: false },
      [guest({ mazmo_user_id: 31, displayname: "Someone", has_paid: false })],
      stats,
    );

    expect(
      await screen.findByRole("region", { name: "Check-ins" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Payment" }),
    ).not.toBeInTheDocument();
  });
});

describe("MeetupDetailPage guest identity extras", () => {
  beforeEach(() => {
    mockRole = "ADMIN";
    vi.clearAllMocks();
    localStorage.setItem("lang", "en");
  });

  const profile = {
    avatar_url: "https://cdn.example/avatar.jpg",
    age: 30,
    gender: "female",
    pronoun: "she/her",
    mazmo_suspended: true,
    mazmo_banned: false,
    synced_at: "2026-08-01T12:00:00Z",
  };

  it("shows Mazmo's own flags apart from the org vant badge", async () => {
    renderPage(MEETUP, [
      guest({
        mazmo_user_id: 40,
        displayname: "Flagged",
        has_paid: true,
        mazmo_profile: profile,
      }),
    ]);

    expect(await screen.findByText("Suspended on Mazmo")).toBeInTheDocument();
    expect(screen.queryByText("Vanted")).not.toBeInTheDocument();
  });

  it("opens the guest profile sheet when the name is clicked", async () => {
    renderPage(MEETUP, [
      guest({
        mazmo_user_id: 41,
        displayname: "Clickable",
        has_paid: true,
        mazmo_profile: profile,
      }),
    ]);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Clickable" }));

    const sheet = await screen.findByRole("dialog");
    expect(
      await within(sheet).findByRole("heading", { name: "Clickable" }),
    ).toBeInTheDocument();
    expect(
      within(sheet).getByText("Pronouns").closest("div"),
    ).toHaveTextContent("she/her");
    expect(
      within(sheet).getByRole("link", { name: "Open full profile" }),
    ).toHaveAttribute(
      "href",
      `/guests/${"00000000-0000-0000-0000-000000000041"}`,
    );
  });

  it("keeps guests with the same RSVP time in a stable order", async () => {
    const sameTime = "2026-08-01T12:00:00Z";
    renderPage({ ...MEETUP, requires_payment: false }, [
      guest({
        mazmo_user_id: 52,
        displayname: "Second",
        has_paid: false,
        rsvp_time: sameTime,
      }),
      guest({
        mazmo_user_id: 51,
        displayname: "First",
        has_paid: false,
        rsvp_time: sameTime,
      }),
      guest({
        mazmo_user_id: 50,
        displayname: "Earliest",
        has_paid: false,
        rsvp_time: "2026-07-01T12:00:00Z",
      }),
    ]);

    await screen.findByText("Earliest");
    const names = screen
      .getAllByRole("row")
      .slice(1)
      .map((row) => within(row).getAllByRole("button")[0]?.textContent);
    expect(names).toEqual(["Earliest", "First", "Second"]);
  });
});

describe("MeetupDetailPage on phones", () => {
  beforeEach(() => {
    mockRole = "ADMIN";
    vi.clearAllMocks();
    localStorage.setItem("lang", "en");
    vi.stubGlobal(
      "matchMedia",
      (query: string) =>
        ({
          matches: false,
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders one card per guest instead of the table", async () => {
    renderPage(MEETUP, [
      guest({
        mazmo_user_id: 60,
        displayname: "Phone Exempt",
        has_paid: false,
        guest_type: "INVITED",
      }),
      guest({
        mazmo_user_id: 61,
        displayname: "Phone Unpaid",
        has_paid: false,
      }),
    ]);

    await screen.findByText("Phone Exempt");
    const list = screen.getByRole("list", { name: "Guest list" });
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    const cards = within(list).getAllByRole("listitem");
    expect(cards).toHaveLength(2);
    const [exempt, unpaid] = cards;
    expect(within(exempt!).getByText("Exempt")).toBeInTheDocument();
    expect(
      within(exempt!).getByRole("button", { name: "Check in" }),
    ).toBeEnabled();
    expect(
      within(exempt!).getByRole("button", {
        name: "Guest actions: Phone Exempt",
      }),
    ).toBeInTheDocument();
    expect(
      within(unpaid!).getByRole("button", { name: "Check in" }),
    ).toBeDisabled();
    expect(
      within(unpaid!).getByRole("button", { name: "Mark paid" }),
    ).toBeInTheDocument();
  });
});

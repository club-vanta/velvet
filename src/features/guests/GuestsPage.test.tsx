import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { toast } from "sonner";
import { LanguageProvider } from "@/lib/i18n";
import { GuestsPage } from "./GuestsPage";
import type { components } from "@/api/types";

type Guest = components["schemas"]["GuestPublic"];

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

function guest(overrides: Partial<Guest> & { id: string }): Guest {
  return {
    mazmo_user_id: null,
    mazmo_handle: null,
    displayname: "Guest",
    instagram_username: null,
    ...overrides,
  };
}

function renderPage(guests: Guest[], bannedIds: string[] = []) {
  mockApiGet.mockImplementation((path: string) => {
    if (path === "/guests/")
      return Promise.resolve({
        data: { total: guests.length, guests },
        error: undefined,
      });
    if (path === "/organizations/{org_id}/guests/banned") {
      const banned = guests
        .filter((g) => bannedIds.includes(g.id))
        .map((g) => ({
          ...g,
          banned_at: "2026-08-22T03:00:00Z",
          banned_reason: "Reason here",
          banned_by_id: 1,
          banned_by: { id: 1, username: "admin" },
        }));
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
        <MemoryRouter>
          <GuestsPage />
        </MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>,
  );
}

describe("GuestsPage — add guest", () => {
  beforeEach(() => {
    mockRole = "ADMIN";
    vi.clearAllMocks();
    localStorage.setItem("lang", "en");
  });

  it("creates a manual guest without a Mazmo handle", async () => {
    mockApiPost.mockResolvedValue({
      data: guest({ id: "g-1", displayname: "No Mazmo Guy" }),
      error: undefined,
      response: { status: 201 },
    });

    renderPage([]);
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: "Add new guest" }),
    );
    await user.click(screen.getByRole("tab", { name: "Manual" }));
    await user.type(screen.getByLabelText("Display Name"), "No Mazmo Guy");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(mockApiPost).toHaveBeenCalledWith(
      "/guests/manual",
      expect.objectContaining({
        body: { displayname: "No Mazmo Guy", instagram_username: null },
      }),
    );
  });

  it("creates a guest by Mazmo handle from the default tab", async () => {
    mockApiPost.mockResolvedValue({
      data: guest({
        id: "g-2",
        mazmo_handle: "cindydark",
        displayname: "Cindy",
      }),
      error: undefined,
      response: { status: 201 },
    });

    renderPage([]);
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: "Add new guest" }),
    );
    await user.type(screen.getByLabelText("Mazmo username"), "cindydark");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(mockApiPost).toHaveBeenCalledWith(
      "/guests/mazmo",
      expect.objectContaining({
        body: { username: "cindydark", instagram_username: null },
      }),
    );
  });
});

describe("GuestsPage — per-row identity management", () => {
  beforeEach(() => {
    mockRole = "ADMIN";
    vi.clearAllMocks();
    localStorage.setItem("lang", "en");
  });

  it("offers Link Mazmo account for a guest with no handle, never Unlink", async () => {
    renderPage([guest({ id: "g-1", displayname: "No Mazmo Guy" })]);
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: /^Guest actions/ }),
    );

    expect(
      await screen.findByRole("menuitem", { name: "Link Mazmo account" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: "Unlink Mazmo account" }),
    ).not.toBeInTheDocument();
  });

  it("offers Unlink Mazmo account for a linked guest, never Link", async () => {
    renderPage([
      guest({ id: "g-2", mazmo_handle: "cindydark", displayname: "Cindy" }),
    ]);
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: /^Guest actions/ }),
    );

    expect(
      await screen.findByRole("menuitem", { name: "Unlink Mazmo account" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: "Link Mazmo account" }),
    ).not.toBeInTheDocument();
  });

  it("shows Edit and Link/Unlink but never Ban for non-admin staff", async () => {
    mockRole = "STAFF";
    renderPage([
      guest({ id: "g-staff", mazmo_handle: "cindydark", displayname: "Cindy" }),
    ]);
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: /^Guest actions/ }),
    );

    expect(
      await screen.findByRole("menuitem", { name: "Edit" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Unlink Mazmo account" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: "Link Mazmo account" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: "Vant" }),
    ).not.toBeInTheDocument();
  });

  it("renders 'No Mazmo account' instead of a blank or @null handle", async () => {
    renderPage([guest({ id: "g-3", displayname: "No Mazmo Guy" })]);

    expect(await screen.findByText("No Mazmo account")).toBeInTheDocument();
  });

  it("omits instagram_username from the edit request when it wasn't changed", async () => {
    mockApiPatch.mockResolvedValue({ data: undefined, error: undefined });
    renderPage([
      guest({
        id: "g-4",
        displayname: "Old Name",
        instagram_username: "oldig",
      }),
    ]);
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: /^Guest actions/ }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "Edit" }));
    const nameInput = screen.getByLabelText("Display Name");
    await user.clear(nameInput);
    await user.type(nameInput, "New Name");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(mockApiPatch).toHaveBeenCalledWith(
      "/guests/{guest_id}",
      expect.objectContaining({
        body: { displayname: "New Name" },
      }),
    );
  });

  it("sends an explicit null when instagram_username is cleared", async () => {
    mockApiPatch.mockResolvedValue({ data: undefined, error: undefined });
    renderPage([
      guest({
        id: "g-5",
        displayname: "Same Name",
        instagram_username: "oldig",
      }),
    ]);
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: /^Guest actions/ }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "Edit" }));
    const igInput = screen.getByLabelText("Instagram (optional)");
    await user.clear(igInput);
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(mockApiPatch).toHaveBeenCalledWith(
      "/guests/{guest_id}",
      expect.objectContaining({
        body: { instagram_username: null },
      }),
    );
  });
});

describe("GuestsPage: search", () => {
  beforeEach(() => {
    mockRole = "ADMIN";
    vi.clearAllMocks();
    localStorage.setItem("lang", "en");
  });

  const guestsList = () => screen.getByRole("list", { name: "All Guests" });
  const guestsCalls = () =>
    mockApiGet.mock.calls.filter((c) => c[0] === "/guests/");

  it("filters the loaded list in the browser, without a request per keystroke", async () => {
    const user = userEvent.setup();
    renderPage([
      guest({ id: "g-1", displayname: "Cindy" }),
      guest({ id: "g-2", displayname: "Zoe" }),
    ]);
    const input = await screen.findByPlaceholderText("Search guest list…");

    await user.type(input, "cin");

    await waitFor(() => {
      expect(screen.queryByText("Zoe")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Cindy")).toBeInTheDocument();
    expect(screen.getByText("Showing 1 of 2")).toBeInTheDocument();
    expect(guestsCalls()).toHaveLength(1);
    expect(guestsCalls()[0]).toHaveLength(1); // no query params
  });

  it.each([
    ["accents", "perez", "Juan Pérez"],
    ["styled Mazmo letters", "barman", "𝑩𝑨𝑹𝑴𝑨𝑵"],
    ["words in any order", "perez juan", "Juan Pérez"],
    ["a handle typed with @", "@cindyd", "Cindy"],
  ])("matches %s", async (_, query, expected) => {
    const user = userEvent.setup();
    renderPage([
      guest({ id: "g-1", displayname: "Juan Pérez" }),
      guest({ id: "g-2", displayname: "𝑩𝑨𝑹𝑴𝑨𝑵" }),
      guest({ id: "g-3", displayname: "Cindy", mazmo_handle: "cindydark" }),
    ]);
    const input = await screen.findByPlaceholderText("Search guest list…");

    await user.type(input, query);

    await waitFor(() => {
      expect(within(guestsList()).getAllByRole("listitem")).toHaveLength(1);
    });
    expect(within(guestsList()).getByText(expected)).toBeInTheDocument();
  });

  it("keeps the search input visible when a search matches nothing, so it can be cleared", async () => {
    const user = userEvent.setup();
    renderPage([guest({ id: "g-1", displayname: "Cindy" })]);
    const input = await screen.findByPlaceholderText("Search guest list…");

    await user.type(input, "zzz");

    expect(
      await screen.findByText("No guests match that search."),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Search guest list…"),
    ).toBeInTheDocument();
  });

  it("renders a long list a page at a time, and a new search starts from the top", async () => {
    const user = userEvent.setup();
    renderPage(
      Array.from({ length: 150 }, (_, i) =>
        guest({ id: `g-${i}`, displayname: `Guest ${i}` }),
      ),
    );
    await screen.findByText("Guest 0");
    // A DOM query: getAllByRole("listitem") over 150 rows is slow and is
    // polled by waitFor below.
    const list = guestsList();
    const rows = () => list.querySelectorAll("li");
    expect(rows()).toHaveLength(100);

    await user.click(screen.getByRole("button", { name: "Show 50 more" }));

    expect(rows()).toHaveLength(150);
    expect(
      screen.queryByRole("button", { name: /^Show \d+ more$/ }),
    ).not.toBeInTheDocument();

    // Pasting re-renders the 150 rows once; typing would do it per keystroke.
    await user.click(screen.getByPlaceholderText("Search guest list…"));
    await user.paste("guest");

    await waitFor(() => expect(rows()).toHaveLength(100));
    expect(screen.getByText("Showing 150 of 150")).toBeInTheDocument();
  });
});

describe("GuestsPage: vant flag in the all guests tab", () => {
  beforeEach(() => {
    mockRole = "ADMIN";
    vi.clearAllMocks();
    localStorage.setItem("lang", "en");
  });

  it("marks guests vanted in this org, and only them", async () => {
    renderPage(
      [
        guest({ id: "g-v", displayname: "Vanted One" }),
        guest({ id: "g-ok", displayname: "Fine One" }),
      ],
      ["g-v"],
    );

    const vantedRow = (
      await screen.findByRole("link", { name: "Vanted One" })
    ).closest("li")!;
    expect(await within(vantedRow).findByText("Vanted")).toBeInTheDocument();
    const fineRow = screen
      .getByRole("link", { name: "Fine One" })
      .closest("li")!;
    expect(within(fineRow).queryByText("Vanted")).not.toBeInTheDocument();
  });

  it("marks guests whose Mazmo account was deleted", async () => {
    renderPage([
      guest({
        id: "g-d",
        displayname: "machoarriba",
        mazmo_handle: "machoarriba",
        mazmo_profile: {
          avatar_url: null,
          age: null,
          gender: null,
          pronoun: null,
          mazmo_suspended: false,
          mazmo_banned: false,
          mazmo_deleted: true,
          synced_at: "2026-10-21T19:35:00Z",
        },
      }),
    ]);

    const row = (
      await screen.findByRole("link", { name: "machoarriba" })
    ).closest("li")!;
    expect(within(row).getByText("Mazmo account deleted")).toBeInTheDocument();
  });

  it("offers Unvant instead of Vant and disables Unlink for a vanted guest", async () => {
    renderPage(
      [guest({ id: "g-v2", displayname: "Vanted Two", mazmo_handle: "v2" })],
      ["g-v2"],
    );
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", {
        name: "Guest actions: Vanted Two",
      }),
    );
    // The vanted list loads separately; wait until the menu reflects it.
    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: "Vanted Two" }).closest("li"),
      ).toHaveTextContent("Vanted"),
    );

    expect(
      await screen.findByRole("menuitem", { name: "Unvant" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: "Vant" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Unlink Mazmo account" }),
    ).toHaveAttribute("aria-disabled", "true");
  });
});

describe("GuestsPage: sorting and filtering", () => {
  beforeEach(() => {
    mockRole = "ADMIN";
    vi.clearAllMocks();
    localStorage.setItem("lang", "en");
  });

  function names() {
    const list = screen.getByRole("list", { name: "All Guests" });
    return within(list)
      .getAllByRole("listitem")
      .map((li) => within(li).getAllByRole("link")[0]?.textContent);
  }

  it("lists guests alphabetically, decorated names under their letter", async () => {
    renderPage([
      guest({ id: "g-c", displayname: "carla" }),
      guest({ id: "g-s", displayname: "☆ selene ☆" }),
      guest({ id: "g-a", displayname: "Ana" }),
    ]);

    await screen.findByText("Ana");
    expect(names()).toEqual(["Ana", "carla", "☆ selene ☆"]);
  });

  it("sorts by Mazmo ID with unlinked guests last", async () => {
    renderPage([
      guest({ id: "g-1", displayname: "Ana" }),
      guest({ id: "g-2", displayname: "Bea", mazmo_user_id: 20 }),
      guest({ id: "g-3", displayname: "Cami", mazmo_user_id: 10 }),
    ]);
    const user = userEvent.setup();
    await screen.findByText("Ana");

    await user.click(screen.getByRole("button", { name: /Sort by/ }));
    await user.click(
      await screen.findByRole("menuitemradio", { name: "Mazmo ID" }),
    );
    await user.keyboard("{Escape}");

    expect(names()).toEqual(["Cami", "Bea", "Ana"]);
  });

  it("filters to guests without a Mazmo account", async () => {
    renderPage([
      guest({ id: "g-1", displayname: "Manual" }),
      guest({ id: "g-2", displayname: "Linked", mazmo_handle: "linked" }),
    ]);
    const user = userEvent.setup();
    await screen.findByText("Manual");

    await user.click(screen.getByRole("button", { name: "Filter" }));
    await user.click(
      await screen.findByRole("menuitemradio", { name: "Without Mazmo" }),
    );
    await user.keyboard("{Escape}");

    expect(names()).toEqual(["Manual"]);
    expect(screen.getByText("Showing 1 of 2")).toBeInTheDocument();
  });
});

describe("GuestsPage — sync from Mazmo", () => {
  beforeEach(() => {
    mockRole = "ADMIN";
    vi.clearAllMocks();
    localStorage.setItem("lang", "en");
  });

  it("refreshes every guest and reports the count", async () => {
    mockApiPost.mockResolvedValue({
      data: { total: 3, refreshed: 3, not_found: 0 },
      error: undefined,
      response: { status: 200 },
    });

    renderPage([]);
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "Sync from Mazmo" }),
    );

    expect(mockApiPost).toHaveBeenCalledWith("/guests/refresh-mazmo");
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Updated 3 guests from Mazmo"),
    );
  });

  it("mentions guests Mazmo didn't return", async () => {
    mockApiPost.mockResolvedValue({
      data: { total: 5, refreshed: 3, not_found: 2 },
      error: undefined,
      response: { status: 200 },
    });

    renderPage([]);
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "Sync from Mazmo" }),
    );

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "Updated 3 guests from Mazmo. 2 weren't found and kept their data.",
      ),
    );
  });

  it("shows the unreachable message when Mazmo times out", async () => {
    mockApiPost.mockResolvedValue({
      data: undefined,
      error: { detail: "timeout" },
      response: { status: 504 },
    });

    renderPage([]);
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "Sync from Mazmo" }),
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Could not connect to Mazmo. Try again.",
      ),
    );
  });
});

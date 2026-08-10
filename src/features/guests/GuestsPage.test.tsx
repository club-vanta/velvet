import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

function renderPage(guests: Guest[]) {
  mockApiGet.mockImplementation((path: string) => {
    if (path === "/guests/")
      return Promise.resolve({
        data: { total: guests.length, guests },
        error: undefined,
      });
    if (path === "/organizations/{org_id}/guests/banned")
      return Promise.resolve({
        data: { total: 0, guests: [] },
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
        <GuestsPage />
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
      await screen.findByRole("button", { name: "Guest actions" }),
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
      await screen.findByRole("button", { name: "Guest actions" }),
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
      await screen.findByRole("button", { name: "Guest actions" }),
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
      await screen.findByRole("button", { name: "Guest actions" }),
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
      await screen.findByRole("button", { name: "Guest actions" }),
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

describe("GuestsPage — search", () => {
  beforeEach(() => {
    mockRole = "ADMIN";
    vi.clearAllMocks();
    localStorage.setItem("lang", "en");
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces the search query instead of firing one request per keystroke", async () => {
    const user = userEvent.setup({
      advanceTimers: (ms) => vi.advanceTimersByTime(ms),
    });
    renderPage([guest({ id: "g-1", displayname: "Cindy" })]);

    const input = await screen.findByPlaceholderText("Search guest list…");
    const callsBeforeTyping = mockApiGet.mock.calls.filter(
      (c) => c[0] === "/guests/",
    ).length;

    await user.type(input, "cin");

    // No new /guests/ GET should have fired yet — the debounce window
    // (300ms) hasn't elapsed since the last keystroke.
    const callsRightAfterTyping = mockApiGet.mock.calls.filter(
      (c) => c[0] === "/guests/",
    ).length;
    expect(callsRightAfterTyping).toBe(callsBeforeTyping);

    await vi.advanceTimersByTimeAsync(300);

    await waitFor(() => {
      const callsAfterDebounce = mockApiGet.mock.calls.filter(
        (c) => c[0] === "/guests/",
      ).length;
      expect(callsAfterDebounce).toBe(callsBeforeTyping + 1);
    });
    expect(mockApiGet).toHaveBeenCalledWith(
      "/guests/",
      expect.objectContaining({ params: { query: { q: "cin" } } }),
    );
  });

  it("omits q entirely when the search box is empty", async () => {
    renderPage([guest({ id: "g-1", displayname: "Cindy" })]);
    await screen.findByText("Cindy");

    const initialCall = mockApiGet.mock.calls.find((c) => c[0] === "/guests/");
    expect(initialCall?.[1]).not.toEqual(
      expect.objectContaining({ params: { query: { q: "" } } }),
    );
  });
});

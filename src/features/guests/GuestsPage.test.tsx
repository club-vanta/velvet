import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
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

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/lib/i18n";
import { MeetupsPage } from "./MeetupsPage";

const mockApiGet = vi.fn();
const mockApiPost = vi.fn();
vi.mock("@/api/client", () => ({
  api: {
    GET: (...a: unknown[]) => mockApiGet(...a),
    POST: (...a: unknown[]) => mockApiPost(...a),
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/org", () => ({
  useOrg: () => ({
    activeOrg: { org_id: "org-1", org_name: "Club Vanta", role: "ADMIN" },
  }),
}));

function renderPage() {
  mockApiGet.mockResolvedValue({
    data: { total: 0, meetups: [] },
    error: undefined,
  });
  mockApiPost.mockResolvedValue({
    data: { id: "new-meetup" },
    error: undefined,
  });

  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <LanguageProvider>
        <MemoryRouter>
          <MeetupsPage />
        </MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>,
  );
}

describe("MeetupsPage — new meetup dialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("lang", "en");
  });

  it("sends requires_payment: true when the checkbox is checked", async () => {
    renderPage();

    await userEvent.click(
      await screen.findByRole("button", { name: "New Meetup" }),
    );
    await userEvent.type(screen.getByLabelText("Name"), "Paid Night");
    await userEvent.type(
      screen.getByLabelText("Mazmo URL"),
      "https://mazmo.net/eventos/paid-night",
    );
    await userEvent.click(
      screen.getByRole("checkbox", { name: "Requires payment" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(mockApiPost).toHaveBeenCalledWith(
      "/organizations/{org_id}/meetups/",
      expect.objectContaining({
        body: expect.objectContaining({ requires_payment: true }),
      }),
    );
  });
});

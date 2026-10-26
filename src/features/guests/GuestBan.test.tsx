import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/i18n";
import { statsOrgKey } from "@/lib/queryKeys";
import { BanDialog } from "./GuestDialogs";
import { useUnbanGuest } from "./useUnbanGuest";
import type { components } from "@/api/types";

type Guest = components["schemas"]["GuestPublic"];

const mockApiPatch = vi.fn();
vi.mock("@/api/client", () => ({
  api: { PATCH: (...a: unknown[]) => mockApiPatch(...a) },
}));

const GUEST: Guest = {
  id: "g-1",
  mazmo_user_id: 200003,
  mazmo_handle: "juanp",
  displayname: "Juan P.",
  instagram_username: null,
  mazmo_profile: null,
};

function UnbanButton() {
  const unban = useUnbanGuest("org-1");
  return (
    <button onClick={() => unban.mutate(GUEST)} type="button">
      unban
    </button>
  );
}

function renderWithClient(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const spy = vi.spyOn(queryClient, "invalidateQueries");
  render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>{ui}</LanguageProvider>
    </QueryClientProvider>,
  );
  return spy;
}

describe("ban and unban refresh the org stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("lang", "en");
    mockApiPatch.mockResolvedValue({ data: {}, error: undefined });
  });

  it("invalidates the org stats after banning a guest", async () => {
    const spy = renderWithClient(
      <BanDialog guest={GUEST} orgId="org-1" onClose={() => {}} />,
    );

    await userEvent.type(
      screen.getByLabelText("Reason (required)"),
      "Aggressive at Alter #40",
    );
    await userEvent.click(screen.getByRole("button", { name: "Vant guest" }));

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith({ queryKey: statsOrgKey("org-1") }),
    );
  });

  it("invalidates the org stats after unbanning a guest", async () => {
    const spy = renderWithClient(<UnbanButton />);

    await userEvent.click(screen.getByRole("button", { name: "unban" }));

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith({ queryKey: statsOrgKey("org-1") }),
    );
  });
});

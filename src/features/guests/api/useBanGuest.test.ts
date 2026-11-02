import { createElement, type ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/i18n";
import { bannedGuestsKey, guestKey, statsOrgKey } from "@/api/queryKeys";
import { useBanGuest } from "./useBanGuest";

const mockPatch = vi.fn();
vi.mock("@/api/client", () => ({
  api: { PATCH: (...args: unknown[]) => mockPatch(...args) },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const GUEST = { id: "g-1", displayname: "Juan P." };

function setup() {
  const queryClient = new QueryClient();
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(LanguageProvider, null, children),
    );
  const { result } = renderHook(() => useBanGuest("org-1"), { wrapper });
  return { result, invalidate };
}

describe("useBanGuest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("lang", "en");
    mockPatch.mockResolvedValue({ data: {}, error: undefined });
  });

  it("vants in the org and refreshes everything a vant shows up in", async () => {
    const { result, invalidate } = setup();

    result.current.mutate({ guest: GUEST, reason: "Aggressive at Alter #40" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPatch).toHaveBeenCalledWith(
      "/organizations/{org_id}/guests/{guest_id}/ban",
      {
        params: { path: { org_id: "org-1", guest_id: "g-1" } },
        body: { reason: "Aggressive at Alter #40" },
      },
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: bannedGuestsKey("org-1"),
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: guestKey("g-1") });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: statsOrgKey("org-1"),
    });
  });

  it("refreshes nothing when the backend refuses", async () => {
    mockPatch.mockResolvedValue({
      data: undefined,
      error: { detail: "Guest is already banned" },
      response: { status: 409 },
    });
    const { result, invalidate } = setup();

    result.current.mutate({ guest: GUEST, reason: "Aggressive at Alter #40" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Guest is already banned");
    expect(invalidate).not.toHaveBeenCalled();
  });
});

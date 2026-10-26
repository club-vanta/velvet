import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { LanguageProvider } from "@/lib/i18n";
import { useStatsFilters } from "./useStatsFilters";

const mockApiGet = vi.fn();
vi.mock("@/api/client", () => ({
  api: { GET: (...a: unknown[]) => mockApiGet(...a) },
}));
vi.mock("@/lib/org", () => ({
  useOrg: () => ({ activeOrg: { org_id: "org-1", role: "ADMIN" } }),
}));

function wrapper(url: string) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>
      <LanguageProvider>
        <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

describe("useStatsFilters query", () => {
  it("is null while the meetups load and a meetup param is set", async () => {
    mockApiGet.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useStatsFilters(), {
      wrapper: wrapper("/stats?meetup=m1"),
    });
    expect(result.current.query).toBeNull();
  });

  it("is ready without waiting when there is no meetup param", () => {
    mockApiGet.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useStatsFilters(), {
      wrapper: wrapper("/stats"),
    });
    expect(result.current.query).not.toBeNull();
  });

  it("drops an unoffered meetup from the query once loaded", async () => {
    mockApiGet.mockResolvedValue({
      data: { total: 0, meetups: [] },
      error: undefined,
    });
    const { result } = renderHook(() => useStatsFilters(), {
      wrapper: wrapper("/stats?meetup=m1"),
    });
    await waitFor(() => expect(result.current.query).not.toBeNull());
    expect(result.current.query?.meetupId).toBeUndefined();
  });
});

import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { statsAttendanceKey } from "@/api/queryKeys";
import { LanguageProvider } from "@/lib/i18n";
import { makeAttendanceStats } from "@/tests/factories";
import { useAttendanceStats } from "./useAttendanceStats";

const mockApiGet = vi.fn();
vi.mock("@/api/client", () => ({
  api: { GET: (...a: unknown[]) => mockApiGet(...a) },
}));

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <LanguageProvider>{children}</LanguageProvider>
    </QueryClientProvider>
  );
}

describe("useOrgStatsQuery", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends the period and the event as from, to and meetup_id", async () => {
    mockApiGet.mockResolvedValue({
      data: makeAttendanceStats(),
      error: undefined,
    });
    const { result } = renderHook(
      () =>
        useAttendanceStats("org-1", {
          from: "2026-03-01",
          to: "2026-04-01",
          meetupId: "m1",
        }),
      { wrapper: wrapper(new QueryClient()) },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiGet).toHaveBeenCalledWith(
      "/organizations/{org_id}/stats/attendance",
      {
        params: {
          path: { org_id: "org-1" },
          query: { from: "2026-03-01", to: "2026-04-01", meetup_id: "m1" },
        },
      },
    );
  });

  it("waits without fetching or showing cached numbers while the filters are not ready", () => {
    const client = new QueryClient();
    // The numbers of the whole period are cached, under the empty filters.
    client.setQueryData(statsAttendanceKey("org-1", {}), makeAttendanceStats());
    const { result } = renderHook(() => useAttendanceStats("org-1", null), {
      wrapper: wrapper(client),
    });
    expect(result.current.isPending).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it("fails with a translated message when the API answers an error", async () => {
    mockApiGet.mockResolvedValue({
      data: undefined,
      error: { detail: "nope" },
    });
    const { result } = renderHook(() => useAttendanceStats("org-1", {}), {
      wrapper: wrapper(
        new QueryClient({ defaultOptions: { queries: { retry: false } } }),
      ),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe(
      "No se pudieron cargar las estadísticas.",
    );
  });
});

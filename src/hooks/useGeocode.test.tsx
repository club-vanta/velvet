import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { LanguageProvider } from "@/lib/i18n";
import { geocodeKey } from "@/lib/queryKeys";
import { useGeocode } from "./useGeocode";

const mockApiGet = vi.fn();
vi.mock("@/api/client", () => ({
  api: { GET: (...a: unknown[]) => mockApiGet(...a) },
}));

const RESULT = {
  label: "Av. Corrientes 1234, Buenos Aires",
  latitude: -34.6,
  longitude: -58.38,
};

function setup(q: string, client = newClient()) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <LanguageProvider>{children}</LanguageProvider>
    </QueryClientProvider>
  );
  return { client, ...renderHook(() => useGeocode("org-1", q), { wrapper }) };
}

function newClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

describe("useGeocode", () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    mockApiGet.mockResolvedValue({ data: [RESULT], error: undefined });
  });

  it("does not request anything below 3 characters", () => {
    const { result } = setup("ab");

    expect(mockApiGet).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("does not count surrounding whitespace toward the threshold", () => {
    setup("  ab  ");

    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it("requests at 3 characters with the trimmed query", async () => {
    const { result } = setup("  abc ");

    await waitFor(() => expect(result.current.data).toEqual([RESULT]));
    expect(mockApiGet).toHaveBeenCalledTimes(1);
    expect(mockApiGet).toHaveBeenCalledWith("/organizations/{org_id}/geocode", {
      params: { path: { org_id: "org-1" }, query: { q: "abc" } },
      signal: expect.any(AbortSignal),
    });
  });

  it("caches under geocodeKey with the trimmed query for 5 minutes", async () => {
    const { client, result } = setup(" abc ");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const query = client.getQueryCache().find({
      queryKey: geocodeKey("org-1", "abc"),
    });
    expect(query).toBeDefined();
    expect(query?.isStale()).toBe(false);
    expect(query?.observers[0].options.staleTime).toBe(5 * 60 * 1000);
  });

  it("surfaces the backend message when the search fails", async () => {
    mockApiGet.mockResolvedValue({
      data: undefined,
      error: { detail: "Address search is unavailable" },
    });

    const { result } = setup("abc");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Address search is unavailable");
  });

  it("falls back to a generic message when the error has no detail", async () => {
    mockApiGet.mockResolvedValue({ data: undefined, error: {} });

    const { result } = setup("abc");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe(
      "No se pudo buscar la dirección. Probá de nuevo.",
    );
  });

  it("keeps the previous results, flagged as placeholder, while the next search loads", async () => {
    const next = { ...RESULT, label: "Av. Santa Fe 100, Buenos Aires" };
    let resolveNext: (value: unknown) => void = () => undefined;
    const client = newClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>
        <LanguageProvider>{children}</LanguageProvider>
      </QueryClientProvider>
    );
    const { result, rerender } = renderHook(({ q }) => useGeocode("org-1", q), {
      wrapper,
      initialProps: { q: "abc" },
    });
    await waitFor(() => expect(result.current.data).toEqual([RESULT]));
    expect(result.current.isPlaceholderData).toBe(false);

    mockApiGet.mockReturnValue(
      new Promise((resolve) => {
        resolveNext = resolve;
      }),
    );
    rerender({ q: "abcd" });

    await waitFor(() => expect(result.current.isFetching).toBe(true));
    expect(result.current.data).toEqual([RESULT]);
    expect(result.current.isPlaceholderData).toBe(true);

    await act(async () => resolveNext({ data: [next], error: undefined }));

    await waitFor(() => expect(result.current.data).toEqual([next]));
    expect(result.current.isPlaceholderData).toBe(false);
  });

  it("aborts the previous request when the query changes", async () => {
    const signals: AbortSignal[] = [];
    mockApiGet.mockImplementation(
      (_p: string, opts: { signal: AbortSignal }) => {
        signals.push(opts.signal);
        return new Promise(() => {});
      },
    );
    const { rerender } = renderHook(({ q }) => useGeocode("org-1", q), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={newClient()}>
          <LanguageProvider>{children}</LanguageProvider>
        </QueryClientProvider>
      ),
      initialProps: { q: "Corrientes" },
    });
    await waitFor(() => expect(signals).toHaveLength(1));
    rerender({ q: "Corrientes 12" });
    await waitFor(() => expect(signals).toHaveLength(2));
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });
});

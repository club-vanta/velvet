import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { LanguageProvider } from "@/lib/i18n";
import { meetupKey, meetupsKey, statsOrgKey } from "@/lib/queryKeys";
import { useSetMeetupLocation } from "./useSetMeetupLocation";

const mockApiPatch = vi.fn();
vi.mock("@/api/client", () => ({
  api: { PATCH: (...a: unknown[]) => mockApiPatch(...a) },
}));

const LOCATION = {
  location_label: "Av. Corrientes 1234, Buenos Aires",
  latitude: -34.6,
  longitude: -58.38,
};

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <LanguageProvider>{children}</LanguageProvider>
    </QueryClientProvider>
  );
  const hook = renderHook(() => useSetMeetupLocation("org-1", "meetup-1"), {
    wrapper,
  });
  return { invalidate, ...hook };
}

describe("useSetMeetupLocation", () => {
  beforeEach(() => {
    mockApiPatch.mockReset();
    mockApiPatch.mockResolvedValue({ data: {}, error: undefined });
  });

  it("sends the full body to the meetup location endpoint", async () => {
    const { result } = setup();

    await act(() => result.current.mutateAsync(LOCATION));

    expect(mockApiPatch).toHaveBeenCalledWith(
      "/organizations/{org_id}/meetups/{meetup_id}/location",
      {
        params: { path: { org_id: "org-1", meetup_id: "meetup-1" } },
        body: LOCATION,
      },
    );
  });

  it("sends all three keys as null to clear the location", async () => {
    const { result } = setup();
    const cleared = {
      location_label: null,
      latitude: null,
      longitude: null,
    };

    await act(() => result.current.mutateAsync(cleared));

    expect(mockApiPatch).toHaveBeenCalledWith(
      "/organizations/{org_id}/meetups/{meetup_id}/location",
      expect.objectContaining({ body: cleared }),
    );
  });

  it("refreshes the meetup, the meetup list and the org stats on success", async () => {
    const { result, invalidate } = setup();

    await act(() => result.current.mutateAsync(LOCATION));

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: meetupKey("org-1", "meetup-1"),
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: meetupsKey("org-1") });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: statsOrgKey("org-1") });
  });

  it("surfaces the backend message and invalidates nothing on failure", async () => {
    mockApiPatch.mockResolvedValue({
      data: undefined,
      error: { detail: "Meetup not found" },
    });
    const { result, invalidate } = setup();

    await act(async () => {
      await result.current.mutateAsync(LOCATION).catch(() => undefined);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Meetup not found");
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("falls back to a generic message when the error has no detail", async () => {
    mockApiPatch.mockResolvedValue({ data: undefined, error: {} });
    const { result } = setup();

    await act(async () => {
      await result.current.mutateAsync(LOCATION).catch(() => undefined);
    });

    await waitFor(() =>
      expect(result.current.error?.message).toBe(
        "No se pudo guardar la ubicación.",
      ),
    );
  });
});

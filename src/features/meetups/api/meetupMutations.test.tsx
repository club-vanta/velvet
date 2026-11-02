import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { LanguageProvider } from "@/lib/i18n";
import {
  bannedGuestsRootKey,
  guestMeetupsOrgKey,
  meetupGuestsKey,
  meetupKey,
  meetupsKey,
  meetupStatsKey,
  statsOrgKey,
  statsRootKey,
} from "@/api/queryKeys";
import {
  makeCheckInResponse,
  makeMeetup,
  makeMeetupGuest,
  makeSyncResponse,
} from "@/tests/factories";
import { useCheckInGuest } from "./useCheckInGuest";
import { useSetGuestType } from "./useSetGuestType";
import { useSetMeetupFinalized } from "./useSetMeetupFinalized";
import { useSetPaymentRequirement } from "./useSetPaymentRequirement";
import { useSyncMeetup } from "./useSyncMeetup";
import { useUndoCheckIn } from "./useUndoCheckIn";

// Component tests cover what each request sends; these pin down what each
// mutation refreshes, which a rendered screen only shows indirectly.

const mockPost = vi.fn();
const mockPatch = vi.fn();
vi.mock("@/api/client", () => ({
  api: {
    POST: (...a: unknown[]) => mockPost(...a),
    PATCH: (...a: unknown[]) => mockPatch(...a),
  },
}));

function setup<T>(useHook: () => T) {
  localStorage.setItem("lang", "en");
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <LanguageProvider>{children}</LanguageProvider>
    </QueryClientProvider>
  );
  const { result } = renderHook(useHook, { wrapper });
  const invalidated = () =>
    invalidate.mock.calls.map(([filters]) => filters?.queryKey);
  return { client, result, invalidate, invalidated };
}

/** Every key a change to one RSVP refreshes (invalidateMeetupGuests). */
const RSVP_KEYS = [
  meetupGuestsKey("org-1", "meetup-1"),
  meetupStatsKey("org-1", "meetup-1"),
  guestMeetupsOrgKey("org-1"),
  statsOrgKey("org-1"),
];

describe("meetup mutations", () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockPatch.mockReset();
  });

  it("check-in refreshes the list, its stats, guest attendance and org stats", async () => {
    mockPost.mockResolvedValue({
      data: makeCheckInResponse(),
      error: undefined,
    });
    const { result, invalidated } = setup(() =>
      useCheckInGuest("org-1", "meetup-1"),
    );
    await act(() => result.current.mutateAsync("guest-1"));
    expect(invalidated()).toEqual(RSVP_KEYS);
  });

  it("undoing a check-in sends the reason and refreshes the same keys", async () => {
    mockPatch.mockResolvedValue({ data: {}, error: undefined });
    const { result, invalidated } = setup(() =>
      useUndoCheckIn("org-1", "meetup-1"),
    );
    await act(() =>
      result.current.mutateAsync({ guestId: "guest-1", reason: "mistake" }),
    );
    expect(mockPatch.mock.calls[0][1].body).toEqual({ reason: "mistake" });
    expect(invalidated()).toEqual(RSVP_KEYS);
  });

  it("a guest type change refreshes the same keys", async () => {
    mockPatch.mockResolvedValue({ data: makeMeetupGuest(), error: undefined });
    const { result, invalidated } = setup(() =>
      useSetGuestType("org-1", "meetup-1"),
    );
    await act(() =>
      result.current.mutateAsync({ guestId: "guest-1", guestType: "STAFF" }),
    );
    expect(invalidated()).toEqual(RSVP_KEYS);
  });

  it("a sync also refreshes every guest identity, since it renames guests", async () => {
    mockPost.mockResolvedValue({ data: makeSyncResponse(), error: undefined });
    const { result, invalidated } = setup(() =>
      useSyncMeetup("org-1", "meetup-1"),
    );
    await act(() => result.current.mutateAsync());
    expect(invalidated()).toEqual(
      expect.arrayContaining([
        ...RSVP_KEYS,
        ["guests"],
        ["meetup-guests"],
        bannedGuestsRootKey,
        ["guest"],
        statsRootKey,
      ]),
    );
  });

  it("the payment requirement refreshes the meetup and the meetup list", async () => {
    mockPatch.mockResolvedValue({ data: makeMeetup(), error: undefined });
    const { result, invalidated } = setup(() =>
      useSetPaymentRequirement("org-1", "meetup-1"),
    );
    await act(() => result.current.mutateAsync(false));
    expect(mockPatch.mock.calls[0][0]).toBe(
      "/organizations/{org_id}/meetups/{meetup_id}/disable-payment",
    );
    expect(invalidated()).toEqual([
      meetupKey("org-1", "meetup-1"),
      meetupsKey("org-1"),
    ]);
  });

  it.each([
    [true, "/organizations/{org_id}/meetups/{meetup_id}/finalize"],
    [false, "/organizations/{org_id}/meetups/{meetup_id}/unfinalize"],
  ])(
    "finalizing (%s) writes the answer to the cache and refreshes the org stats",
    async (finalized, path) => {
      const answer = makeMeetup({ id: "meetup-1", is_finalized: finalized });
      mockPatch.mockResolvedValue({ data: answer, error: undefined });
      const { client, result, invalidated } = setup(() =>
        useSetMeetupFinalized("org-1", "meetup-1"),
      );
      await act(() => result.current.mutateAsync(finalized));
      expect(mockPatch.mock.calls[0][0]).toBe(path);
      expect(client.getQueryData(meetupKey("org-1", "meetup-1"))).toEqual(
        answer,
      );
      // Pending RSVPs become no-shows (or back), so the list refreshes too.
      expect(invalidated()).toEqual([
        meetupKey("org-1", "meetup-1"),
        meetupsKey("org-1"),
        ...RSVP_KEYS,
      ]);
    },
  );

  it("refreshes nothing when the backend refuses", async () => {
    mockPatch.mockResolvedValue({
      data: undefined,
      error: { detail: "Meetup is already finalized" },
    });
    const { result, invalidate } = setup(() =>
      useSetMeetupFinalized("org-1", "meetup-1"),
    );
    await expect(act(() => result.current.mutateAsync(true))).rejects.toThrow(
      "Meetup is already finalized",
    );
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("falls back to a translated message when the error has no detail", async () => {
    mockPost.mockResolvedValue({ data: undefined, error: {} });
    const { result } = setup(() => useCheckInGuest("org-1", "meetup-1"));
    await expect(
      act(() => result.current.mutateAsync("guest-1")),
    ).rejects.toThrow("Check-in failed");
  });
});

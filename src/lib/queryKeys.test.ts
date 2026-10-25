import { describe, it, expect, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  guestMeetupsKey,
  guestMeetupsOrgKey,
  invalidateAllGuestIdentities,
  invalidateGuestIdentity,
  invalidateMeetupGuests,
  invalidateMeetupLocation,
  meetupKey,
  meetupsKey,
  statsOrgKey,
  statsRetentionKey,
  statsRootKey,
} from "./queryKeys";

describe("invalidateMeetupGuests", () => {
  it("also refreshes every guest's meetup attendance in the org", () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, "invalidateQueries");

    invalidateMeetupGuests(queryClient, "org-1", "meetup-1");

    expect(spy).toHaveBeenCalledWith({ queryKey: guestMeetupsOrgKey("org-1") });
  });

  it("refreshes the org's stats, which count finalized check-ins", () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, "invalidateQueries");

    invalidateMeetupGuests(queryClient, "org-1", "meetup-1");

    expect(spy).toHaveBeenCalledWith({ queryKey: ["stats", "org-1"] });
  });

  it("scopes the attendance prefix so it matches a guest's query", () => {
    const [prefixA, prefixB] = guestMeetupsOrgKey("org-1");

    expect(guestMeetupsKey("org-1", "g-1").slice(0, 2)).toEqual([
      prefixA,
      prefixB,
    ]);
  });
});

describe("guest identity invalidation", () => {
  it("refreshes every org's stats after a Mazmo sync, since stats show names and profiles", () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, "invalidateQueries");

    invalidateAllGuestIdentities(queryClient);

    expect(spy).toHaveBeenCalledWith({ queryKey: ["stats"] });
  });

  it("refreshes every org's stats after one guest's identity changes", () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, "invalidateQueries");

    invalidateGuestIdentity(queryClient, "g-1");

    expect(spy).toHaveBeenCalledWith({ queryKey: ["stats"] });
  });

  it("prefixes every org's stats keys with the stats root", () => {
    expect(statsRootKey).toEqual(["stats"]);
    expect(statsOrgKey("org-1").slice(0, 1)).toEqual([...statsRootKey]);
    expect(statsRetentionKey("org-1", null).slice(0, 1)).toEqual([
      ...statsRootKey,
    ]);
  });
});

describe("invalidateMeetupLocation", () => {
  it("refreshes the meetup, the meetup list and the org stats", () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, "invalidateQueries");

    invalidateMeetupLocation(queryClient, "org-1", "meetup-1");

    expect(spy).toHaveBeenCalledTimes(3);
    expect(spy).toHaveBeenCalledWith({
      queryKey: meetupKey("org-1", "meetup-1"),
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: meetupsKey("org-1") });
    expect(spy).toHaveBeenCalledWith({ queryKey: statsOrgKey("org-1") });
  });
});

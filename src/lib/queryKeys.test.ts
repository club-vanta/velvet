import { describe, it, expect, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  guestMeetupsKey,
  guestMeetupsOrgKey,
  invalidateMeetupGuests,
} from "./queryKeys";

describe("invalidateMeetupGuests", () => {
  it("also refreshes every guest's meetup attendance in the org", () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, "invalidateQueries");

    invalidateMeetupGuests(queryClient, "org-1", "meetup-1");

    expect(spy).toHaveBeenCalledWith({ queryKey: guestMeetupsOrgKey("org-1") });
  });

  it("scopes the attendance prefix so it matches a guest's query", () => {
    const [prefixA, prefixB] = guestMeetupsOrgKey("org-1");

    expect(guestMeetupsKey("org-1", "g-1").slice(0, 2)).toEqual([
      prefixA,
      prefixB,
    ]);
  });
});

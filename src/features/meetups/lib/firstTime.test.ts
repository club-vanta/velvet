import { describe, expect, it } from "vitest";
import { makeMeetupGuest } from "@/tests/factories";
import { countFirstTime, isFirstTime } from "./firstTime";

describe("isFirstTime", () => {
  it("is true for a NORMAL or INVITED guest with no prior visits", () => {
    expect(isFirstTime(makeMeetupGuest({ prior_visits: 0 }))).toBe(true);
    expect(
      isFirstTime(
        makeMeetupGuest({ prior_visits: 0, rsvp: { guest_type: "INVITED" } }),
      ),
    ).toBe(true);
  });

  it("is false for a guest who came before", () => {
    expect(isFirstTime(makeMeetupGuest({ prior_visits: 1 }))).toBe(false);
  });

  it("is false for STAFF and VENDOR, who are not the audience", () => {
    for (const guest_type of ["STAFF", "VENDOR"] as const) {
      expect(
        isFirstTime(makeMeetupGuest({ prior_visits: 0, rsvp: { guest_type } })),
      ).toBe(false);
    }
  });
});

describe("countFirstTime", () => {
  it("counts active first-time guests and how many of them arrived", () => {
    const guests = [
      makeMeetupGuest({ prior_visits: 0 }),
      makeMeetupGuest({ prior_visits: 0, rsvp: { has_arrived: true } }),
      makeMeetupGuest({ prior_visits: 0, rsvp: { cancelled_rsvp: true } }),
      makeMeetupGuest({ prior_visits: 0, rsvp: { guest_type: "STAFF" } }),
      makeMeetupGuest({ prior_visits: 2 }),
    ];
    expect(countFirstTime(guests)).toEqual({ total: 2, arrived: 1 });
  });

  it("is zero for an empty list", () => {
    expect(countFirstTime([])).toEqual({ total: 0, arrived: 0 });
  });
});

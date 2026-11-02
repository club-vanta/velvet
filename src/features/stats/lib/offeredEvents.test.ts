import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StatsQuery } from "@/api/statsQuery";
import { makeMeetup } from "@/tests/factories";
import { offeredEvents } from "./offeredEvents";

const RANGE: StatsQuery = { from: "2026-01-15", to: "2026-04-16" };

const ids = (meetups: Parameters<typeof offeredEvents>[0], range = RANGE) =>
  offeredEvents(meetups, range).map((e) => e.meetup.id);

describe("offeredEvents", () => {
  beforeEach(() => vi.stubEnv("TZ", "America/Argentina/Buenos_Aires"));
  afterEach(() => vi.unstubAllEnvs());

  it("offers only finalized meetups inside the period, newest first", () => {
    const meetups = [
      makeMeetup({
        id: "march",
        date: "2026-03-10T23:00:00Z",
        is_finalized: true,
      }),
      makeMeetup({ id: "open", date: "2026-03-20T23:00:00Z" }),
      makeMeetup({
        id: "old",
        date: "2025-11-01T23:00:00Z",
        is_finalized: true,
      }),
      makeMeetup({
        id: "april",
        date: "2026-04-10T23:00:00Z",
        is_finalized: true,
      }),
    ];
    expect(ids(meetups)).toEqual(["april", "march"]);
  });

  it("offers every finalized meetup for a period without bounds", () => {
    const meetups = [
      makeMeetup({
        id: "old",
        date: "2025-11-01T23:00:00Z",
        is_finalized: true,
      }),
    ];
    expect(ids(meetups, {})).toEqual(["old"]);
  });

  it("places a late event on its local day, which is the next day in UTC", () => {
    // 22:30 on Apr 15 in Buenos Aires, the last day of the period.
    const late = makeMeetup({
      id: "late",
      date: "2026-04-16T01:30:00Z",
      is_finalized: true,
    });
    // 22:30 on Jan 14 in Buenos Aires, the day before the period.
    const before = makeMeetup({
      id: "before",
      date: "2026-01-15T01:30:00Z",
      is_finalized: true,
    });
    expect(ids([late, before])).toEqual(["late"]);
  });
});

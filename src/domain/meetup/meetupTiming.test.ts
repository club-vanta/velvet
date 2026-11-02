import { describe, it, expect } from "vitest";
import {
  daysFromToday,
  featuredMeetup,
  groupMeetupsByTiming,
  meetupTiming,
} from "./meetupTiming";
import type { components } from "@/api/types";
import { makeMeetup } from "@/tests/fixtures";

type Meetup = components["schemas"]["MeetupPublic"];

const NOW = new Date(2026, 9, 21, 15, 0); // 21 Oct 2026, 15:00 local

function at(day: number, hour = 22): string {
  return new Date(2026, 9, day, hour, 0).toISOString();
}

function meetup(id: string, date: string): Meetup {
  return makeMeetup({
    id,
    name: id,
    mazmo_meetup_url: `https://mazmo.net/x/${id}`,
    date,
  });
}

describe("meetupTiming", () => {
  it("compares by calendar day, so tonight's meetup is still today", () => {
    expect(meetupTiming(at(21, 23), NOW)).toBe("today");
    expect(meetupTiming(at(21, 1), NOW)).toBe("today");
    expect(meetupTiming(at(22, 0), NOW)).toBe("upcoming");
    expect(meetupTiming(at(20, 23), NOW)).toBe("past");
    expect(daysFromToday(at(24), NOW)).toBe(3);
  });
});

describe("featuredMeetup", () => {
  it("prefers today's meetup", () => {
    const list = [meetup("next", at(24)), meetup("today", at(21))];
    expect(featuredMeetup(list, NOW)).toEqual({
      meetup: list[1],
      timing: "today",
    });
  });

  it("then the nearest upcoming one", () => {
    const list = [
      meetup("far", at(30)),
      meetup("near", at(24)),
      meetup("old", at(10)),
    ];
    expect(featuredMeetup(list, NOW)?.meetup.id).toBe("near");
  });

  it("then the most recent past one", () => {
    const list = [meetup("older", at(1)), meetup("recent", at(15))];
    expect(featuredMeetup(list, NOW)).toEqual({
      meetup: list[1],
      timing: "past",
    });
    expect(featuredMeetup([], NOW)).toBeNull();
  });
});

describe("groupMeetupsByTiming", () => {
  it("puts today and upcoming soonest first, past latest first", () => {
    const { upcoming, past } = groupMeetupsByTiming(
      [
        meetup("far", at(30)),
        meetup("old", at(1)),
        meetup("today", at(21)),
        meetup("recent", at(15)),
      ],
      NOW,
    );
    expect(upcoming.map((m) => m.id)).toEqual(["today", "far"]);
    expect(past.map((m) => m.id)).toEqual(["recent", "old"]);
  });
});

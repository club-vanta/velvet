import { describe, expect, it } from "vitest";
import { makeMeetup } from "@/tests/factories";
import { nextMeetupSort, sortMeetups } from "./meetupListSort";

describe("nextMeetupSort", () => {
  it("cycles a column ascending, descending, then back to no sort", () => {
    expect(nextMeetupSort(null, "name")).toEqual({ col: "name", dir: "asc" });
    expect(nextMeetupSort({ col: "name", dir: "asc" }, "name")).toEqual({
      col: "name",
      dir: "desc",
    });
    expect(nextMeetupSort({ col: "name", dir: "desc" }, "name")).toBeNull();
  });

  it("starts another column ascending", () => {
    expect(nextMeetupSort({ col: "name", dir: "desc" }, "date")).toEqual({
      col: "date",
      dir: "asc",
    });
  });
});

describe("sortMeetups", () => {
  const a = makeMeetup({
    id: "a",
    name: "Alter #40",
    date: "2026-10-03T22:00:00Z",
  });
  const b = makeMeetup({
    id: "b",
    name: "Spookink",
    date: "2026-10-01T22:00:00Z",
  });
  const list = [b, a];

  it("sorts by name or date in either direction, without mutating", () => {
    expect(sortMeetups(list, { col: "name", dir: "asc" })).toEqual([a, b]);
    expect(sortMeetups(list, { col: "date", dir: "asc" })).toEqual([b, a]);
    expect(sortMeetups(list, { col: "date", dir: "desc" })).toEqual([a, b]);
    expect(list).toEqual([b, a]);
  });
});

import { describe, expect, it } from "vitest";
import { noShowRateRows, noShowShares } from "./noShowShare";

describe("noShowShares", () => {
  it("splits the no-shows by group", () => {
    expect(
      noShowShares([{ no_show: 2 }, { no_show: 1 }, { no_show: 1 }]),
    ).toEqual([0.5, 0.25, 0.25]);
  });

  it("adds up to one", () => {
    const shares = noShowShares([
      { no_show: 3 },
      { no_show: 7 },
      { no_show: 0 },
    ]);
    expect(shares.reduce((sum, s) => sum! + s!, 0)).toBeCloseTo(1);
  });

  it("has no share without no-shows", () => {
    expect(noShowShares([{ no_show: 0 }, { no_show: 0 }])).toEqual([
      null,
      null,
    ]);
  });
});

describe("noShowRateRows", () => {
  const groups = [
    { key: "MALE", expected: 50, no_show: 5, no_show_rate: 0.1 },
    { key: null, expected: 4, no_show: 2, no_show_rate: 0.5 },
  ];
  const label = (key: string | null) => key ?? "Unknown";

  it("shows each group's rate with the people it is computed from", () => {
    expect(noShowRateRows(groups, label, "rate")).toEqual([
      { key: "MALE", label: "MALE", rate: 0.1, n: 50 },
      { key: "null", label: "Unknown", rate: 0.5, n: 4 },
    ]);
  });

  it("shows each group's share of the no-shows in the share view", () => {
    expect(noShowRateRows(groups, label, "share").map((r) => r.rate)).toEqual([
      5 / 7,
      2 / 7,
    ]);
  });
});

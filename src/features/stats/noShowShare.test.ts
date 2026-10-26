import { describe, expect, it } from "vitest";
import { noShowShares } from "./noShowShare";

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

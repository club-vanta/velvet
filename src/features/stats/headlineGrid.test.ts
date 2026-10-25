import { describe, expect, it } from "vitest";
import { headlineGrid } from "./headlineGrid";

const BASE = "grid grid-cols-2 gap-2 sm:gap-3";
const SPAN_LAST = "[&>*:last-child]:col-span-2 xl:[&>*:last-child]:col-span-1";

describe("headlineGrid", () => {
  it.each([
    [3, `${BASE} xl:grid-cols-3 ${SPAN_LAST}`],
    [4, `${BASE} xl:grid-cols-4`],
    [6, `${BASE} xl:grid-cols-3`],
    [12, `${BASE} xl:grid-cols-4`],
  ])("sizes %i cards", (cards, expected) => {
    expect(headlineGrid(cards)).toBe(expected);
  });

  it("widens the last card of an odd count below xl, so no cell is left empty", () => {
    expect(headlineGrid(5).split(" ")).toEqual(
      expect.arrayContaining(SPAN_LAST.split(" ")),
    );
    expect(headlineGrid(4)).not.toContain("col-span");
  });
});

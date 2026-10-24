import { describe, expect, it } from "vitest";
import { headlineGrid } from "./headlineGrid";

const BASE = "grid grid-cols-2 gap-2 sm:gap-3";

describe("headlineGrid", () => {
  it.each([
    [3, `${BASE} xl:grid-cols-3`],
    [4, `${BASE} xl:grid-cols-4`],
    [6, `${BASE} xl:grid-cols-3`],
    [12, `${BASE} xl:grid-cols-4`],
  ])("sizes %i cards", (cards, expected) => {
    expect(headlineGrid(cards)).toBe(expected);
  });
});

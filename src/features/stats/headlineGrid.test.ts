import { describe, expect, it } from "vitest";
import { headlineGrid } from "./headlineGrid";

describe("headlineGrid", () => {
  it.each([
    [4, "xl:grid-cols-4"],
    [6, "xl:grid-cols-3"],
    [3, "xl:grid-cols-3"],
  ])("sizes %i cards", (cards, expected) => {
    expect(headlineGrid(cards)).toContain(expected);
  });
});

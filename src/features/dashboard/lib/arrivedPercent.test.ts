import { describe, expect, it } from "vitest";
import { arrivedPercent } from "./arrivedPercent";

describe("arrivedPercent", () => {
  it("is 0 when nobody RSVPed, instead of dividing by zero", () => {
    expect(arrivedPercent(0, 0)).toBe(0);
  });

  it("rounds to a whole percentage", () => {
    expect(arrivedPercent(1, 3)).toBe(33);
    expect(arrivedPercent(2, 3)).toBe(67);
  });

  it("is 100 when everyone arrived", () => {
    expect(arrivedPercent(40, 40)).toBe(100);
  });
});

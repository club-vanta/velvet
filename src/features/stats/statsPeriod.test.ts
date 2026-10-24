import { describe, expect, it } from "vitest";
import { DEFAULT_RANGE, isRangePreset, resolveRange } from "./statsPeriod";

const TODAY = "2026-10-24";

describe("resolveRange", () => {
  it.each([
    ["30d", { from: "2026-09-24", to: "2026-10-25" }],
    ["3m", { from: "2026-07-24", to: "2026-10-25" }],
    ["12m", { from: "2025-10-24", to: "2026-10-25" }],
    ["ytd", { from: "2026-01-01", to: "2026-10-25" }],
    ["all", {}],
  ] as const)("resolves %s", (preset, expected) => {
    expect(resolveRange(preset, TODAY)).toEqual(expected);
  });

  it("includes the picked end day of a custom range", () => {
    expect(
      resolveRange("custom", TODAY, { from: "2026-03-01", to: "2026-03-31" }),
    ).toEqual({ from: "2026-03-01", to: "2026-04-01" });
  });

  it("returns an open range for custom without dates", () => {
    expect(resolveRange("custom", TODAY)).toEqual({});
  });

  it("clamps to the end of a shorter month", () => {
    expect(resolveRange("3m", "2026-05-31").from).toBe("2026-02-28");
  });

  it("rolls the exclusive end over a year boundary", () => {
    expect(resolveRange("30d", "2026-12-31")).toEqual({
      from: "2026-12-01",
      to: "2027-01-01",
    });
  });

  it("clamps a leap day when subtracting a year", () => {
    expect(resolveRange("12m", "2028-02-29").from).toBe("2027-02-28");
  });
});

describe("isRangePreset", () => {
  it("accepts known presets and rejects everything else", () => {
    expect(isRangePreset("12m")).toBe(true);
    expect(isRangePreset("custom")).toBe(true);
    expect(isRangePreset("7d")).toBe(false);
    expect(isRangePreset(null)).toBe(false);
  });

  it("defaults to the last 3 months", () => {
    expect(DEFAULT_RANGE).toBe("3m");
  });
});

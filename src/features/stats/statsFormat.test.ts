import { describe, expect, it } from "vitest";
import {
  formatChange,
  formatRate,
  isSmallSample,
  SMALL_SAMPLE,
} from "./statsFormat";

describe("formatRate", () => {
  it("shows a dash for a missing rate", () => {
    expect(formatRate(null, "es")).toBe("–");
  });

  it("rounds to a whole percent without a space", () => {
    expect(formatRate(0.2143, "es")).toBe("21%");
    expect(formatRate(0.2143, "en")).toBe("21%");
    expect(formatRate(0, "en")).toBe("0%");
    expect(formatRate(1, "es")).toBe("100%");
  });
});

describe("formatChange", () => {
  it("returns the whole percent change", () => {
    expect(formatChange(412, 381)).toBe(8);
    expect(formatChange(50, 100)).toBe(-50);
  });

  it("returns null when either side is missing or the baseline is 0", () => {
    expect(formatChange(5, 0)).toBeNull();
    expect(formatChange(null, 3)).toBeNull();
    expect(formatChange(3, null)).toBeNull();
  });
});

describe("isSmallSample", () => {
  it("flags samples below the threshold", () => {
    expect(SMALL_SAMPLE).toBe(10);
    expect(isSmallSample(9)).toBe(true);
    expect(isSmallSample(10)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  formatChange,
  formatEventDay,
  formatPointChange,
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

describe("formatChange zero", () => {
  it("never returns -0", () => {
    expect(Object.is(formatChange(99.9, 100), 0)).toBe(true);
  });
});

describe("formatPointChange", () => {
  it("returns the whole percentage-point change", () => {
    expect(formatPointChange(0.18, 0.15)).toBe(3);
    expect(formatPointChange(0.1, 0.25)).toBe(-15);
  });

  it("returns null when either rate is missing", () => {
    expect(formatPointChange(null, 0.1)).toBeNull();
    expect(formatPointChange(0.1, null)).toBeNull();
  });

  it("never returns -0", () => {
    expect(Object.is(formatPointChange(0.1, 0.104), 0)).toBe(true);
  });
});

describe("isSmallSample", () => {
  it("flags samples below the threshold", () => {
    expect(SMALL_SAMPLE).toBe(10);
    expect(isSmallSample(9)).toBe(true);
    expect(isSmallSample(10)).toBe(false);
  });
});

describe("formatEventDay", () => {
  it("reads a naive backend datetime as UTC and shows the local dd/mm", () => {
    // 22:00 UTC is still the same local day in Buenos Aires (UTC-3).
    expect(formatEventDay("2026-04-05T22:00:00")).toBe(
      localDdMm(new Date("2026-04-05T22:00:00Z")),
    );
  });

  it("gives the same result with or without the Z", () => {
    expect(formatEventDay("2026-12-31T23:30:00")).toBe(
      formatEventDay("2026-12-31T23:30:00Z"),
    );
  });
});

function localDdMm(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}

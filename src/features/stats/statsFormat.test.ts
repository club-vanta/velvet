import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatChange,
  formatEventDay,
  formatMinuteChange,
  formatCurveLabel,
  formatOffset,
  formatPointChange,
  formatRate,
  isSmallSample,
  SMALL_SAMPLE,
  spansYears,
  formatYearsChange,
  formatAge,
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
  beforeEach(() => vi.stubEnv("TZ", "America/Argentina/Buenos_Aires"));
  afterEach(() => vi.unstubAllEnvs());

  it("shows the Buenos Aires day of a late event, which is the next day in UTC", () => {
    // 22:30 on Apr 4 in Buenos Aires.
    expect(formatEventDay("2026-04-05T01:30:00Z")).toBe("04/04");
  });

  it("reads a naive backend datetime as UTC", () => {
    expect(formatEventDay("2026-04-05T01:30:00")).toBe("04/04");
  });

  it("adds a two-digit year when asked", () => {
    expect(formatEventDay("2027-01-01T02:30:00Z", true)).toBe("31/12/26");
  });
});

describe("spansYears", () => {
  beforeEach(() => vi.stubEnv("TZ", "America/Argentina/Buenos_Aires"));
  afterEach(() => vi.unstubAllEnvs());

  it("is false for events in one local year", () => {
    expect(spansYears(["2026-03-10T22:00:00Z", "2026-12-20T22:00:00Z"])).toBe(
      false,
    );
    expect(spansYears([])).toBe(false);
  });

  it("is true for events in two local years", () => {
    expect(spansYears(["2026-03-10T22:00:00Z", "2027-01-10T22:00:00Z"])).toBe(
      true,
    );
  });

  it("puts a late Dec 31 event in its local year", () => {
    // 23:30 on Dec 31, 2026 in Buenos Aires is Jan 1, 2027 in UTC.
    expect(spansYears(["2026-03-10T22:00:00Z", "2027-01-01T02:30:00Z"])).toBe(
      false,
    );
  });
});

describe("formatOffset", () => {
  it("shows hours and minutes from the start with a sign", () => {
    expect(formatOffset(75)).toBe("+1:15");
    expect(formatOffset(-10)).toBe("-0:10");
    expect(formatOffset(0)).toBe("+0:00");
    expect(formatOffset(-75)).toBe("-1:15");
    expect(formatOffset(600)).toBe("+10:00");
  });

  it("rounds a fractional average to whole minutes", () => {
    expect(formatOffset(64.6)).toBe("+1:05");
    expect(formatOffset(59.7)).toBe("+1:00");
    expect(formatOffset(-0.2)).toBe("+0:00");
  });
});

describe("formatMinuteChange", () => {
  it("returns the whole-minute difference", () => {
    expect(formatMinuteChange(45, 40)).toBe(5);
    expect(formatMinuteChange(30, 45)).toBe(-15);
    expect(formatMinuteChange(30.4, 30)).toBe(0);
  });

  it("returns null when either side is missing", () => {
    expect(formatMinuteChange(null, 10)).toBeNull();
    expect(formatMinuteChange(10, null)).toBeNull();
  });

  it("never returns -0", () => {
    expect(Object.is(formatMinuteChange(29.6, 30), 0)).toBe(true);
  });
});

describe("formatCurveLabel", () => {
  it("labels aggregate buckets by offset, including before the start", () => {
    expect(
      formatCurveLabel({ start_minute: -15, local_time: null }, false),
    ).toBe("-0:15");
    expect(
      formatCurveLabel({ start_minute: 45, local_time: "23:45" }, false),
    ).toBe("+0:45");
  });

  it("labels one-event buckets by clock time", () => {
    expect(
      formatCurveLabel({ start_minute: -15, local_time: "22:45" }, true),
    ).toBe("22:45");
  });

  it("falls back to the offset when a clock time is missing", () => {
    expect(
      formatCurveLabel({ start_minute: -15, local_time: null }, true),
    ).toBe("-0:15");
  });
});

describe("formatYearsChange", () => {
  it("signs the difference with one decimal and the locale separator", () => {
    expect(formatYearsChange(32.7, 31.2, "es")).toBe("+1,5");
    expect(formatYearsChange(32.7, 31.2, "en")).toBe("+1.5");
    expect(formatYearsChange(30, 31.2, "es")).toBe("-1,2");
  });

  it("rounds to one decimal and never returns -0", () => {
    expect(formatYearsChange(31.24, 31.2, "es")).toBe("0");
    expect(formatYearsChange(31.16, 31.2, "es")).toBe("0");
  });

  it("returns null when either side is missing", () => {
    expect(formatYearsChange(null, 31, "es")).toBeNull();
    expect(formatYearsChange(31, null, "es")).toBeNull();
  });
});

describe("formatAge", () => {
  it("shows one decimal or a dash", () => {
    expect(formatAge(31, "es")).toBe("31,0");
    expect(formatAge(31.25, "en")).toBe("31.3");
    expect(formatAge(null, "es")).toBe("–");
  });
});

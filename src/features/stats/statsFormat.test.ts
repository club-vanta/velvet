import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { translations, type TranslationKey } from "@/lib/i18n";
import {
  percentChange,
  formatEventDay,
  minuteChange,
  formatDuration,
  formatOffset,
  pointChange,
  formatRate,
  isSmallSample,
  spansYears,
  yearsChange,
  formatAge,
  shareTicks,
  formatClockWindow,
  formatCohortMonth,
  signed,
  sortByDate,
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

describe("percentChange", () => {
  it("returns the whole percent change", () => {
    expect(percentChange(412, 381)).toBe(8);
    expect(percentChange(50, 100)).toBe(-50);
  });

  it("returns null when either side is missing or the baseline is 0", () => {
    expect(percentChange(5, 0)).toBeNull();
    expect(percentChange(null, 3)).toBeNull();
    expect(percentChange(3, null)).toBeNull();
  });
});

describe("percentChange zero", () => {
  it("never returns -0", () => {
    expect(Object.is(percentChange(99.9, 100), 0)).toBe(true);
  });
});

describe("pointChange", () => {
  it("returns the whole percentage-point change", () => {
    expect(pointChange(0.18, 0.15)).toBe(3);
    expect(pointChange(0.1, 0.25)).toBe(-15);
  });

  it("returns null when either rate is missing", () => {
    expect(pointChange(null, 0.1)).toBeNull();
    expect(pointChange(0.1, null)).toBeNull();
  });

  it("never returns -0", () => {
    expect(Object.is(pointChange(0.1, 0.104), 0)).toBe(true);
  });
});

describe("isSmallSample", () => {
  it("flags samples below the threshold", () => {
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
  it("shows hours and minutes from the start, negative before it", () => {
    expect(formatOffset(75)).toBe("1:15");
    expect(formatOffset(-10)).toBe("-0:10");
    expect(formatOffset(0)).toBe("0:00");
    expect(formatOffset(-75)).toBe("-1:15");
    expect(formatOffset(600)).toBe("10:00");
  });

  it("rounds a fractional average to whole minutes", () => {
    expect(formatOffset(64.6)).toBe("1:05");
    expect(formatOffset(59.7)).toBe("1:00");
    expect(formatOffset(-0.2)).toBe("0:00");
  });
});

describe("formatDuration", () => {
  const t = (key: TranslationKey) => translations.es[key];

  it("names hours and minutes, leaving out an empty part", () => {
    expect(formatDuration(82, t)).toBe("1 h 22 min");
    expect(formatDuration(120, t)).toBe("2 h");
    expect(formatDuration(45, t)).toBe("45 min");
    expect(formatDuration(0, t)).toBe("0 min");
  });

  it("drops the sign and rounds to whole minutes", () => {
    expect(formatDuration(-20, t)).toBe("20 min");
    expect(formatDuration(59.6, t)).toBe("1 h");
  });
});

describe("minuteChange", () => {
  it("returns the whole-minute difference", () => {
    expect(minuteChange(45, 40)).toBe(5);
    expect(minuteChange(30, 45)).toBe(-15);
    expect(minuteChange(30.4, 30)).toBe(0);
  });

  it("returns null when either side is missing", () => {
    expect(minuteChange(null, 10)).toBeNull();
    expect(minuteChange(10, null)).toBeNull();
  });

  it("never returns -0", () => {
    expect(Object.is(minuteChange(29.6, 30), 0)).toBe(true);
  });
});

describe("yearsChange", () => {
  it("returns the difference rounded to one decimal", () => {
    expect(yearsChange(32.7, 31.2)).toBe(1.5);
    expect(yearsChange(30, 31.2)).toBe(-1.2);
  });

  it("never returns -0", () => {
    expect(Object.is(yearsChange(31.16, 31.2), 0)).toBe(true);
    expect(yearsChange(31.24, 31.2)).toBe(0);
  });

  it("returns null when either side is missing", () => {
    expect(yearsChange(null, 31)).toBeNull();
    expect(yearsChange(31, null)).toBeNull();
  });
});

describe("signed", () => {
  it("puts a plus on gains and keeps the minus on losses", () => {
    expect(signed(8, "es")).toBe("+8");
    expect(signed(-3, "es")).toBe("-3");
    expect(signed(0, "es")).toBe("0");
  });

  it("never shows -0", () => {
    expect(signed(-0, "en")).toBe("0");
    expect(signed(-0, "es")).toBe("0");
  });

  it("uses the locale's decimal separator", () => {
    expect(signed(1.5, "es")).toBe("+1,5");
    expect(signed(1.5, "en")).toBe("+1.5");
    expect(signed(-1.2, "es")).toBe("-1,2");
  });
});

describe("formatAge", () => {
  it("shows one decimal or a dash", () => {
    expect(formatAge(31, "es")).toBe("31,0");
    expect(formatAge(31.25, "en")).toBe("31.3");
    expect(formatAge(null, "es")).toBe("–");
  });
});

describe("shareTicks", () => {
  it("steps by 10 points up to the next round value for small shares", () => {
    expect(shareTicks(0.26)).toEqual([0, 0.1, 0.2, 0.3]);
    expect(shareTicks(0.5)).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5]);
  });

  it("steps by 20 points for large shares", () => {
    expect(shareTicks(0.9)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
  });

  it("still draws an axis when there is nothing to show", () => {
    expect(shareTicks(0)).toEqual([0, 0.1]);
  });
});

describe("formatClockWindow", () => {
  it("shows the 15 minutes a clock bucket covers", () => {
    expect(formatClockWindow("23:30")).toBe("23:30-23:45");
    expect(formatClockWindow("20:00")).toBe("20:00-20:15");
  });

  it("wraps past midnight", () => {
    expect(formatClockWindow("23:45")).toBe("23:45-00:00");
  });
});

describe("formatCohortMonth", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("shows a cohort month as a short month and year", () => {
    expect(formatCohortMonth("2026-01", "es")).toBe("ene 2026");
    expect(formatCohortMonth("2026-01", "en")).toBe("Jan 2026");
  });

  it("keeps the month whatever the browser time zone", () => {
    vi.stubEnv("TZ", "Pacific/Kiritimati");
    expect(formatCohortMonth("2026-12", "es")).toBe("dic 2026");
  });
});

describe("sortByDate", () => {
  it("orders events by their instant, not their text, without changing the input", () => {
    const events = [
      { id: "b", date: "2026-03-10T01:00:00Z" },
      { id: "c", date: "2026-03-10T00:30:00-03:00" },
      { id: "a", date: "2026-02-01T23:00:00" },
    ];
    expect(sortByDate(events).map((e) => e.id)).toEqual(["a", "b", "c"]);
    expect(events.map((e) => e.id)).toEqual(["b", "c", "a"]);
  });
});

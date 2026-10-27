import { describe, expect, it } from "vitest";
import { formatApiDate, formatDecimal, formatTime } from "./format";

describe("formatDecimal", () => {
  it("always shows one decimal with the locale separator", () => {
    expect(formatDecimal(22, "en")).toBe("22.0");
    expect(formatDecimal(22.46, "es")).toBe("22,5");
  });
});

describe("formatApiDate", () => {
  it("reads a datetime without a zone as UTC", () => {
    expect(formatApiDate("2026-10-18T12:00:00")).toBe(
      formatApiDate("2026-10-18T12:00:00Z"),
    );
  });

  it("formats an ISO datetime as a short Spanish date", () => {
    expect(formatApiDate("2026-10-18T12:00:00Z")).toBe("18 de oct de 2026");
  });
});

describe("formatTime", () => {
  it("uses the 24 hour clock, as clocks in Argentina do", () => {
    const local = new Date(2026, 3, 5, 19, 0).toISOString();
    expect(formatTime(local)).toBe("19:00");
  });
});

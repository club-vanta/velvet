import { describe, expect, it } from "vitest";
import { formatApiDate, formatDecimal } from "./format";

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

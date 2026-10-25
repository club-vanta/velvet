import { describe, expect, it } from "vitest";
import { formatDecimal } from "./format";

describe("formatDecimal", () => {
  it("always shows one decimal with the locale separator", () => {
    expect(formatDecimal(22, "en")).toBe("22.0");
    expect(formatDecimal(22.46, "es")).toBe("22,5");
  });
});

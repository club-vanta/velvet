import { describe, expect, it } from "vitest";
import { legendOrder, SERIES } from "./attendanceSeries";

describe("legendOrder", () => {
  it("orders the legend like the stack, bottom to top", () => {
    // Recharts hands the items over sorted by name by default.
    const items = [
      { dataKey: "attended" },
      { dataKey: "cancelled" },
      { dataKey: "no_show" },
    ];
    const sorted = [...items].sort((a, b) => legendOrder(a) - legendOrder(b));
    expect(sorted.map((i) => i.dataKey)).toEqual([
      "attended",
      "no_show",
      "cancelled",
    ]);
    expect(SERIES.map((s) => s.key)).toEqual([
      "attended",
      "no_show",
      "cancelled",
    ]);
  });
});
